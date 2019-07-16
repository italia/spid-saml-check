const express = require("express");
const exphbs  = require('express-handlebars');
const helmet = require("helmet");
const sha256 = require('crypto-js/sha256');
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require('path');
const fs = require("fs-extra");
const moment = require("moment"); 

const config_test = require("../config/test.json");
const config_idp = require("../config/idp.json");

const Utility = require("./lib/utils");
const TestSuite = require("./lib/saml-utils").TestSuite;
const PayloadDecoder = require("./lib/saml-utils").PayloadDecoder;
const MetadataParser = require("./lib/saml-utils").MetadataParser;
const RequestParser = require("./lib/saml-utils").RequestParser;
const IdP = require("./lib/saml-utils").IdP;
const Signer = require("./lib/signer").Signer;
const SIGN_MODE = require("./lib/signer").SIGN_MODE;

const Database = require("./lib/database");
const Authenticator = require("./lib/authenticator");

const DATA_DIR = "../specs-compliance-tests/data";
const TEMP_DIR = "temp";

var app = express();
app.use(helmet());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "..", "client/build/assets")));
app.use("/assets", express.static(path.resolve(__dirname, "..", "client/build/assets")));

app.set('trust proxy', 1);
app.use(session({ 
    secret: "SAML IDP", 
    resave: true, 
    saveUninitialized: false, 
    cookie: { maxAge: 60*60000 }  //30*60000: 30min
}));

// create databse
var database = new Database().connect().setup();

// create authenticator
var authenticator = new Authenticator("validator");

// use template handlebars
app.set('views', './client/view');
app.engine('handlebars', exphbs({defaultLayout: false}));
app.set('view engine', 'handlebars');


var checkAuthorisation = function(req) {
    let authorised = false;
	let apikey = req.query.apikey;
    if(apikey!=null && apikey == req.session.apikey) {
		authorised = true;
	} else {
		console.log("ERROR check authorisation : " + apikey);
		authorised = false;
	}
	return authorised;
}

var getEntityDir = function(issuer) {
    let ENTITY_DIR = DATA_DIR + "/" + issuer.normalize();
    if(!fs.existsSync(ENTITY_DIR)) fs.mkdirSync(ENTITY_DIR);
    return ENTITY_DIR;
}

app.use((req, res, next)=> {
    Utility.log(moment().format("YYYY-MM-DD HH:mm:ss") + " - " + req.method + " [" + req.ips.join(' - ') + "] " + req.path);
    next();
});

app.get("/", function (req, res) {

    if(req.session.request==null) {
        // clean temp dir and reset previous metadata info
        fs.removeSync(DATA_DIR + "/" + TEMP_DIR);
        req.session.metadata = null;
    }

    req.session.external_code = req.query.code;

    res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));

    /*
    if(req.session.request==null) {
        res.sendFile(path.resolve(__dirname, "..", "client/view", "front.html"));        
    } else {
        res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));
    }
    */
});

// only check session
app.get("/ping", function(req, res) {
    
    // check if apikey is correct
    if(!checkAuthorisation(req)) {
        error = {code: 401, msg: "Unauthorized"};
        res.status(error.code).send(error.msg);
        return null;

    } else {
        res.status(200).send();
    }
});

// get validator idp metadata
app.get("/metadata.xml", function (req, res) {
    let idp = new IdP(config_idp);
    res.set('Content-Type', 'text/xml');
	res.status(200).send("<?xml version=\"1.0\"?>" + idp.getMetadata());
});

// process sso post request
app.post("/samlsso", function (req, res) {	

    if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

	let samlRequest = req.body.SAMLRequest;
	let relayState = (req.body.RelayState!=null)? req.body.RelayState : "";

	if(samlRequest!=null && relayState!=null) {
        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);
        let requestID = requestParser.ID();
        let requestIssueInstant = requestParser.IssueInstant();
        let requestIssuer = requestParser.Issuer();

        if(requestParser.isAuthnRequest()) {
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
            req.session.request = {
                id: requestID,
                issueInstant: requestIssueInstant,
                issuer: requestIssuer,
                authnContextClassRef: requestAuthnContextClassRef,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml,
                relayState: relayState
            }        

            req.session.metadata = null;

            let fileContent = "SAMLRequest=" + encodeURIComponent(samlRequest) + 
                                "&RelayState=" + encodeURIComponent(relayState);
            fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/authn-request.xml", fileContent);
            res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));

        } else if(requestParser.isLogoutRequest()) {

            if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
                let reqFile = getEntityDir(req.session.request.issuer) + "/authn-request.xml";
                if(fs.existsSync(reqFile)) fs.unlinkSync(reqFile);
            }

            if(req.session.metadata!=null) {
                let metadataParser = new MetadataParser(req.session.metadata.xml);
                singleLogoutService = metadataParser.getSingleLogoutServiceURL();
                req.session.destroy();

                // TODO: make logout response and send it to SP

                res.sendFile(path.resolve(__dirname, "..", "client/view", "logout.html"));

            } else {
                req.session.destroy();
                res.sendFile(path.resolve(__dirname, "..", "client/view", "logout.html"));
            }
        }

	} else {
		res.sendFile(path.resolve(__dirname, "..", "client/view", "error.html"));
    }  
});

// process sso get request
app.get("/samlsso", function (req, res) {

    if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

	let samlRequest = req.query.SAMLRequest;
	let relayState = (req.query.RelayState!=null)? req.query.RelayState : "";
	let sigAlg = req.query.SigAlg;
	let signature = req.query.Signature;

	if(samlRequest!=null 
		&& relayState!=null
		&& sigAlg!=null
		&& signature!=null) {

        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);
        let requestID = requestParser.ID();
        let requestIssueInstant = requestParser.IssueInstant();
        let requestIssuer = requestParser.Issuer();

        if(requestParser.isAuthnRequest()) {
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
            req.session.request = {
                id: requestID,
                issueInstant: requestIssueInstant,
                authnContextClassRef: requestAuthnContextClassRef,
                issuer: requestIssuer,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml,
                relayState: relayState
            }        

            req.session.metadata = null;

            let fileContent = "SAMLRequest=" + encodeURIComponent(samlRequest) + 
                                "&RelayState=" + encodeURIComponent(relayState) + 
                                "&SigAlg=" + encodeURIComponent(sigAlg) + 
                                "&Signature=" + encodeURIComponent(signature);
            fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/authn-request.xml", fileContent);
            res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));

        } else if(requestParser.isLogoutRequest()) {

            if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
                let reqFile = getEntityDir(req.session.request.issuer) + "/authn-request.xml";
                if(fs.existsSync(reqFile)) fs.unlinkSync(reqFile);
            }

            if(req.session.metadata!=null) {
                let metadataParser = new MetadataParser(req.session.metadata.xml);
                singleLogoutService = metadataParser.getSingleLogoutServiceURL();
                req.session.destroy();

                // TODO: make logout response and send it to SP

                res.sendFile(path.resolve(__dirname, "..", "client/view", "logout.html"));

            } else {
                req.session.destroy();
                res.sendFile(path.resolve(__dirname, "..", "client/view", "logout.html"));
            }
        }

	} else {
		res.sendFile(path.resolve(__dirname, "..", "client/view", "error.html"));
    }  
});



/* API */

// get info from session
app.get("/api/info", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}		

    if(req.session!=null) { // TODO ASSERTSESSION
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let info = {
            request: req.session.request,
            metadata: (req.session.metadata)? req.session.metadata.url : undefined,
            issuer: (req.session.request)? req.session.request.issuer : undefined,
            entity: req.session.entity,
            policy: req.session.policy,
            external_code: req.session.external_code
        }
        res.status(200).send(info);

    } else {
        res.status(400).send("Session not found");
    }
});


// recover workspace from store cache
app.get("/api/store", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	
    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let store = database.getStore(req.session.user, req.session.request.issuer, "main");

        if(store) {
            // download again from url to avoid issue with signing
            Utility.metadataDownload(store.metadata_SP_URL, getEntityDir(req.session.request.issuer) + "/sp-metadata.xml");
            //fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", store.metadata_SP_XML, "utf8");
            req.session.metadata = {
                entity_id: req.session.request.issuer,
                url: store.metadata_SP_URL,
                xml: store.metadata_SP_XML
            }
        } else {
            req.session.metadata = null;
        }

        res.status(200).send(store);

    } else {
        res.status(400).send("Session not found");
    }
});

// get store info from external code
// only for OnBoarding, protected by AgID Login
app.get("/api/sob/store", function(req, res) {
    res.redirect(authenticator.getAuthURL("store"));
});


// get validation info from external code
// only for OnBoarding, not protected
app.get("/api/sob/validation", function(req, res) {
    //res.redirect(authenticator.getAuthURL("validation"));
    res.send(getValidationInfo(req.query.user, req.query.code));
});

// get metadata info from external code
// only for OnBoarding, not protected
app.get("/api/sob/metadata", function(req, res) {
    //res.redirect(authenticator.getAuthURL("validation"));
    res.send(getMetadataInfo(req.query.code));
});


// save workspace to store cache 
app.post("/api/store", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        database.saveStore(req.session.user, req.session.request.issuer, req.session.external_code, "main", req.body);
        res.status(200).send();

    } else {
        res.status(400).send("Session not found");
    }
});

// delete workspace from store cache
app.delete("/api/store", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        database.deleteStore(req.session.user, req.session.request.issuer, "main");
        res.status(200).send();

    } else {
        res.status(400).send("Session not found");
    }
});

// get downloaded metadata
app.get("/api/metadata-sp", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        req.session.metadata = null;

        let savedMetadata = database.getMetadata(req.session.user, req.session.request.issuer, "main");
        if(savedMetadata) {
            req.session.metadata = savedMetadata;
            fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", req.session.metadata.xml, "utf8");
        }

        res.status(200).send(req.session.metadata);
    } else {
        res.status(400).send("Session not found");
    }
})

// download metadata 
app.post("/api/metadata-sp/download", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(!req.body.url) {
        res.status(500).send("Please insert a valid URL");

    } else {
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        Utility.metadataDownload(req.body.url, getEntityDir(TEMP_DIR) + "/sp-metadata.xml").then(
            (file_name) => {
                let xml = fs.readFileSync(getEntityDir(TEMP_DIR) + "/sp-metadata.xml", "utf8");
                xml = xml.replaceAll("\n", "");
                req.session.metadata = {
                    url: req.body.url,
                    xml: xml
                }
                let metadataParser = new MetadataParser(xml);
                let entityID = metadataParser.getServiceProviderEntityId();
                fs.copyFileSync(getEntityDir(TEMP_DIR) + "/sp-metadata.xml", getEntityDir(entityID) + "/sp-metadata.xml");
                database.setMetadata(req.session.user, entityID, req.session.external_code, "main", req.body.url, xml);
                res.status(200).send(xml);
            },
            (err) => {
                req.session.metadata = null;
                res.status(500).send(err);
            }
        );
    }
});

// execute test for metadata
app.get("/api/metadata-sp/check/:test", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    let issuer = (req.session!=null && req.session.request!=null && req.session.request.issuer!=null)? req.session.request.issuer : TEMP_DIR;

    if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

    let test = req.params.test;
    let file = null;

    if(req.session.metadata==null) {

        res.status(404).send("Please download metadata first");

    } else {

        switch(test) {
            case "strict": file = getEntityDir(issuer) + "/sp-metadata-strict.json"; break;
            case "certs": file = getEntityDir(issuer) + "/sp-metadata-certs.json"; break;
            case "extra": file = getEntityDir(issuer) + "/sp-metadata-extra.json"; break;
        }
        
        if(file!=null) {
            Utility.metadataCheck(test, issuer.normalize()).then(
                (out) => {
                    try {
                        let report = fs.readFileSync(file, "utf8");
                        report = JSON.parse(report);

                        if(req.session.request!=null) {
                            // save result validation on store
                            let testGroup = [];
                            switch(test) {
                                case "strict": testGroup = report.test.sp.metadata_strict.TestSPMetadata; break;
                                case "certs": testGroup = report.test.sp.metadata_certs.TestSPMetadataCertificates; break;
                                case "extra": testGroup = report.test.sp.metadata_extra.TestSPMetadataExtra; break;
                            }

                            let validation = true;
                            for(testGroupName in testGroup) {
                                let groupAssertions = testGroup[testGroupName].assertions;
                                for(assertion in groupAssertions) {
                                    let result = groupAssertions[assertion].result;
                                    validation = validation && (result=='success');
                                }
                            }

                            database.setMetadataValidation(req.session.user, req.session.request.issuer, req.session.external_code, "main", test, validation)
                        }

                        res.status(200).send(report);

                    } catch(err) {
                        Utility.log("ERR /api/metadata-sp/check/:test", err.toString());
                        res.status(500).send("Error while loading report");
                    }
                },
                (err) => {
                    Utility.log("ERR /api/metadata-sp/check/:test", err);
                    res.status(500).send(err);
                }
            );

        } else {
            res.status(404).send("Test must be strict or certs or extra");
        }
    }
});

// get authn request from session
app.get("/api/request", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        res.status(200).send(req.session.request);
    } else {
        res.status(400).send("Session not found");
    }    
});

// execute test for authn request
app.get("/api/request/check/:test", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let test = req.params.test;
        let file = null;

        if(req.session.metadata==null) {

            res.status(404).send("Please download metadata first");

        } else {

            switch(test) {
                case "strict": file = getEntityDir(req.session.request.issuer) + "/sp-authn-request-strict.json"; break;
                case "certs": file = getEntityDir(req.session.request.issuer) + "/sp-authn-request-certs.json"; break;
                case "extra": file = getEntityDir(req.session.request.issuer) + "/sp-authn-request-extra.json"; break;
            }
            
            if(file!=null) {
                Utility.requestCheck(test, req.session.request.issuer.normalize()).then(
                    (out) => {
                        let report = fs.readFileSync(file, "utf8");
                        report = JSON.parse(report);
                        
                        if(req.session.request!=null) {
                            // save result validation on store
                            let testGroup = [];
                            switch(test) {
                                case "strict": testGroup = report.test.sp.authn_request_strict.TestAuthnRequest; break;
                                case "certs": testGroup = report.test.sp.authn_request_certs.TestAuthnRequestCertificates; break;
                                case "extra": testGroup = report.test.sp.authn_request_extra.TestAuthnRequestExtra; break;
                            }

                            let validation = true;
                            for(testGroupName in testGroup) {
                                let groupAssertions = testGroup[testGroupName].assertions;
                                for(assertion in groupAssertions) {
                                    let result = groupAssertions[assertion].result;
                                    validation = validation && (result=='success');
                                }
                            }

                            database.setRequestValidation(req.session.user, req.session.request.issuer, req.session.external_code, "main", test, validation)
                        }

                        res.status(200).send(report);
                    },
                    (err) => {
                        res.status(500).send(err);
                    }
                );

            } else {
                res.status(404).send("Test must be strict or certs or extra");
            }
        }
    } else {
        res.status(400).send("Session not found");
    }          
});

// get test for response
app.post("/api/test-response/:suiteid/:caseid", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION    
        let suiteid = req.params.suiteid;
        let caseid = req.params.caseid;
        let params = req.body.params;
        let sign_assertion = req.body.sign_assertion;
        let sign_response = req.body.sign_response;

        // default params if no authnrequest
        let authnRequestID = (req.session.request!=null)? req.session.request.id : Utility.getUUID();
        let issueInstant = (req.session.request!=null)? req.session.request.issueInstant : Utility.getInstant();
        let authnContextClassRef = (req.session.request!=null)? req.session.request.authnContextClassRef : "";          // default to none. Requested class ref is mandatory
        let assertionConsumerURL = (req.session.request!=null)? req.session.request.assertionConsumerServiceURL : null;
        let assertionConsumerIndex = (req.session.request!=null)? req.session.request.assertionConsumerServiceIndex : null;
        
        // if no AssertionConsumerURL from request try to get it from metadata
        if((assertionConsumerURL==null || assertionConsumerURL=="") &&
            (assertionConsumerIndex!=null && assertionConsumerIndex!="")) {

            if(req.session.metadata!=null) {
                let metadataParser = new MetadataParser(req.session.metadata.xml);
                assertionConsumerURL = metadataParser.getAssertionConsumerServiceURL(assertionConsumerIndex);
            }
        }

        // read AttributeConsumingService set from metadata
        let requestedAttributes = [];
        let serviceProviderEntityId = "";

        let isMetadataLoaded = (req.session.metadata!=null && req.session.metadata.xml!=null);
        
        if(req.session.request!=null && isMetadataLoaded) {
            let requestParser = new RequestParser(req.session.request.xml);
            let metadataParser = new MetadataParser(req.session.metadata.xml);
            let attributeConsumingServiceIndex = requestParser.AttributeConsumingServiceIndex();
            let attributeConsumingService = metadataParser.getAttributeConsumingService(attributeConsumingServiceIndex);
            serviceProviderEntityId = metadataParser.getServiceProviderEntityId();
            
            for(i in attributeConsumingService.RequestedAttributes) {
                let attribute = attributeConsumingService.RequestedAttributes[i].Name;
                requestedAttributes.push(attribute);
            }
        } else {
            requestedAttributes = true;
        }

        // defaults 
        let defaults = params.slice(0); // clone array
        defaults = Utility.defaultParam(defaults, "Issuer", config_idp.entityID);
        defaults = Utility.defaultParam(defaults, "AuthnRequestID", authnRequestID);
        defaults = Utility.defaultParam(defaults, "ResponseID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "IssueInstant", Utility.getInstant());
        defaults = Utility.defaultParam(defaults, "IssueInstantMillis", Utility.getInstantMillis());
        defaults = Utility.defaultParam(defaults, "AssertionID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "NameID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "AuthnIstant", Utility.getInstant());
        defaults = Utility.defaultParam(defaults, "NotBefore", Utility.getNotBefore(issueInstant));
        defaults = Utility.defaultParam(defaults, "NotOnOrAfter", Utility.getNotOnOrAfter(issueInstant));
        defaults = Utility.defaultParam(defaults, "SessionIndex", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "AuthnContextClassRef", authnContextClassRef);
        defaults = Utility.defaultParam(defaults, "AssertionConsumerURL", assertionConsumerURL);
        defaults = Utility.defaultParam(defaults, "Audience", serviceProviderEntityId);
        
        let testSuite = new TestSuite(config_idp, config_test);
        let testResponse = testSuite.getTestTemplate(suiteid, caseid, requestedAttributes, defaults, params);
        let signed = testResponse.compiled;

        // defaults
        if(sign_response===null) sign_response = testResponse.sign_response;
        if(sign_assertion===null) sign_assertion = testResponse.sign_assertion;
        
        if(sign_response || sign_assertion) {
            let mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;
            if(sign_response && !sign_assertion)        mode = SIGN_MODE.SIGN_RESPONSE;
            else if(!sign_response && sign_assertion)   mode = SIGN_MODE.SIGN_ASSERTION;
            else if(sign_assertion && sign_response)    mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;

            let sign_credentials = (testResponse.sign_credentials!=null)? 
                testResponse.sign_credentials : config_idp.credentials[0];
            signer = new Signer(sign_credentials);
            
            signed = signer.sign(signed, mode); 
        }   
        

        testResponse.sign_response = sign_response;
        testResponse.sign_assertion = sign_assertion;
        testResponse.compiled = signed;
        testResponse.relayState = req.session.request.relayState;
        
        res.status(isMetadataLoaded? 200:206).send(testResponse);

    } else {
        res.status(400).send("Session not found");
    }    
});

// return assertion/response signed 
app.post("/api/sign", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION   
        let xml = req.body.xml;
        let sign_assertion = req.body.sign_assertion;
        let sign_response = req.body.sign_response;
        let signed = xml;
        
        if(sign_response || sign_assertion) {
            let mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;
            if(sign_response && !sign_assertion)        mode = SIGN_MODE.SIGN_RESPONSE;
            else if(!sign_response && sign_assertion)   mode = SIGN_MODE.SIGN_ASSERTION;
            else if(sign_assertion && sign_response)    mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;

            signer = new Signer(config_idp.credentials[0]);
            signed = signer.sign(signed, mode);              
        }   
        res.status(200).send(signed);

    } else {
        res.status(400).send("Session not found");
    }     
});




/* AUTHENTICATION */

app.get("/login", (req, res)=> {
    
    if(config_idp.agidloginAuthentication) {
        res.redirect(authenticator.getAuthURL());

    } else {
        let user		= req.query.user;
        let password	= req.query.password;
        
        if(user==config_idp.localloginUser && password==config_idp.localloginPasswordHash) {
            let resobj = {
                apikey: sha256(config_idp.localloginUser + config_idp.localloginPasswordHash).toString()
            }				
            console.log("SUCCESS /auth/local : APIKEY " + resobj.apikey);
            req.session.user = user;
            req.session.apikey = resobj.apikey;
            res.status(200).send(resobj);
    
        } else {
            error = {code: 401, msg: "Unauthorized"}
            console.log("ERROR /auth/local : " + error.msg + " (" + user + " : " + password + ")");
            res.status(error.code).send(error.msg);
            return null;				
        }
    }
});

app.post("/", function(req, res, next) {
    let state = req.body.state;
    authenticator.getUserInfo(req.body, state, (userinfo)=> {

        let userpolicy = userinfo.user_policy[0];
        let entity = userpolicy.entity_id;
        let policy = userpolicy.policy;

        let now = moment();
        let validfrom = (userpolicy.valid_from)? moment(userpolicy.valid_from) : moment();
        let validto = (userpolicy.valid_to)? moment(userpolicy.valid_to) : moment();
        let fromnow = now.diff(validfrom, 'days');
        let nowto = validto.diff(now, 'days');

        Utility.log("AgID Login USER", userinfo);


        if(policy.validator && fromnow>-1 && nowto>-1) {
            req.session.apikey = req.session.apikey? req.session.apikey : Utility.getUUID();
            req.session.entity = entity;
            req.session.policy = policy;
            req.session.user = userinfo.sub;

            if(state!=null && state!="") {
                Utility.log("SOB API " + state, {user: userinfo.sub, code: userinfo.entity.code});
            }

            // API selection
            if(state!=null && state=="store") {
                res.send(getStoreInfo(userinfo.sub, userinfo.entity.code));
                
            } else if(state!=null && state=="validation") {
                res.send(getValidationInfo(userinfo.sub, userinfo.entity.code));

            } else {

                res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));
            }

        } else {
            let msg = "Accesso non autorizzato. Contattare l'amministratore di sistema.";

            //if(fromnow<0) msg+= "Your accounts is valid from " + userpolicy.valid_from;
            //if(nowto<0) msg+= "Your accounts has expired on " + userpolicy.valid_to;

            if(fromnow<0 || nowto<0) msg+= "Your accounts has expired.";

            req.session.destroy();
            error = {code: 401, msg: msg}
            res.status(error.code).send(error.msg);
            return null;
        }

    }, (error)=> {
        Utility.log("Error", error);
        //res.status(500).send(error);
        res.sendFile(path.resolve(__dirname, "..", "client/view", "error.html"));
        //res.redirect("/");
    });
});

app.get("/login/assert", (req, res)=> {
	if(req.session!=null && req.session.apikey!=null && req.session.apikey!='') {
		res.status(200).send({
            remote: config_idp.agidloginAuthentication,
            apikey: req.session.apikey
        });
	} else {
		error = {code: 401, data: {msg: "Unauthorized", remote: config_idp.agidloginAuthentication}};
        res.status(error.code).send(error.data);
        return null;
    }
});

app.get("/logout", (req, res)=> {
    req.session.destroy();
    if(config_idp.agidloginAuthentication) {
        res.redirect(authenticator.getLogoutURL());
    } else {
        res.redirect("/");
    }
});





// Private Funcs

var getValidationInfo = function(user, code) {
    let store = null;

    if(code!=null && code!='') {
        store = database.getStoreByCode(user, code, "main");
    }

    let result = { 
        metadata_strict: false,
        metadata_certs: false,
        metadata_extra: false,
        request_strict: false,
        request_certs: false,
        request_extra: false,
        response_done: false,
        response_success: false,
        response_validation: false,
        validation: false
    };

    if(store) {
        let test_done = store.response_test_done? Object.keys(store.response_test_done) : [];
        let test_success = store.response_test_success? store.response_test_success : [];
        
        let tests = Object.keys(config_test['test-suite-1']['cases']);
        let test_done_ok = (test_done.length==tests.length);
        let test_success_ok = true;

        let test_success_num = 0;
        for(t in test_success) { 
            if(!test_success[t]) test_success_ok = false;
            else test_success_num++;
        }

        let response_validation = false;
        if(test_done_ok && test_success_ok) response_validation = true;
            
        let validation = false;
        if(store.metadata_validation_strict && 
            store.metadata_validation_certs &&
            store.metadata_validation_extra &&
            store.request_validation_strict &&
            store.request_validation_certs &&
            store.request_validation_extra &&
            //response_validation &&
            true
        ) validation = true;

        result = { 
            metadata_strict: store.metadata_validation_strict,
            metadata_certs: store.metadata_validation_certs,
            metadata_extra: store.metadata_validation_extra,
            request_strict: store.request_validation_strict,
            request_certs: store.request_validation_certs,
            request_extra: store.request_validation_extra,
            response_num: tests.length,
            response_done: test_done.length,
            response_success: test_success_num,
            response_validation: response_validation,
            validation: validation 
        };      
    }

    Utility.log("Validation result", result);
    return result;
}

var getMetadataInfo = function(code) {
    let store = null;
    if(code!=null && code!='') {
        store = database.getMetadataByCode(code, "main");
    }
    return store;
}




// start
app.listen(8080, () => {
    // eslint-disable-next-line no-console
    console.log("\nSPID Validator\nversion: 3.0\n\nlistening on port 8080");
});
