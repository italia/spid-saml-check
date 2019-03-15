const express = require("express");
const exphbs  = require('express-handlebars');
const helmet = require("helmet");
const sha256 = require('crypto-js/sha256');
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require('path');
const fs = require("fs");
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

var app = express();
app.use(helmet());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "..", "client/build/assets")));
app.use("/assets", express.static(path.resolve(__dirname, "..", "client/build/assets")));

app.use(session({ 
    secret: "SAML IDP", 
    resave: true, 
    saveUninitialized: false, 
    // cookie: { maxAge: 60000 }
}));

// create databse
var database = new Database().connect().setup();

// create authenticator
var authenticator = new Authenticator("validator");

// use template handlebars
app.set('views', './client/view');
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');


var checkAuthorisation = function(request) {
    let authorised = false;
	let apikey = request.query.apikey;
    if(apikey == sha256(config_idp.app_user + config_idp.app_password)
        || (apikey == request.session.apikey) 
    ) {
		authorised = true;
	} else {
		console.log("ERROR check authorisation : " + apikey);
		authorised = false;
	}
	return authorised;
}

var getEntityDir = function(issuer) {
    let DATA_DIR = "../specs-compliance-tests/data";
    let ENTITY_DIR = DATA_DIR + "/" + issuer.normalize();
    if(!fs.existsSync(ENTITY_DIR)) fs.mkdirSync(ENTITY_DIR);
    return ENTITY_DIR;
}


app.get("/", function (req, res) {

    if(req.session.request==null) {
        res.sendFile(path.resolve(__dirname, "..", "client/view", "front.html"));        
    } else {
        res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));
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

    let DATA_DIR = "../specs-compliance-tests/data";
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

    let DATA_DIR = "../specs-compliance-tests/data";
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

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        let DATA_DIR = "../specs-compliance-tests/data";
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let info = {
            metadata: req.session.metadata.url,
            issuer: req.session.request.issuer,
            entity: req.session.entity,
            policy: req.session.policy
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
        let DATA_DIR = "../specs-compliance-tests/data";
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let store = database.getStore(req.session.user, req.session.request.issuer, "main");

        fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", store.metadata_SP_XML, "utf8");
        req.session.metadata = {
            url: store.metadata_SP_URL,
            xml: store.metadata_SP_XML
        }
        res.status(200).send(store);

    } else {
        res.status(400).send("Session not found");
    }
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
        database.saveStore(req.session.user, req.session.request.issuer, "main", req.body);
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
        let DATA_DIR = "../specs-compliance-tests/data";
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        req.session.metadata = null;

        let savedMetadata = database.getData(req.session.user, req.session.request.issuer, "metadata").result.metadata;
        if(savedMetadata) {
            req.session.metadata = savedMetadata;

            fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", req.session.metadata.xml, "utf8");
        }

        res.status(200).send(req.session.metadata);
    } else {
        res.status(400).send("Session not found");
    }
});

// download metadata 
app.post("/api/metadata-sp/download", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        let DATA_DIR = "../specs-compliance-tests/data";
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        Utility.metadataDownload(req.body.url, getEntityDir(req.session.request.issuer) + "/sp-metadata.xml").then(
            (file_name) => {
                let xml = fs.readFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", "utf8");
                xml = xml.replaceAll("\n", "");
                req.session.metadata = {
                    url: req.body.url,
                    xml: xml
                }
                res.status(200).send(xml);
            },
            (err) => {
                req.session.metadata = null;
                res.status(500).send(err);
            }
        );

    } else {
        res.status(400).send("Session not found");
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

    if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
        let DATA_DIR = "../specs-compliance-tests/data";
        if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

        let test = req.params.test;
        let file = null;

        if(req.session.metadata == null) {

            res.status(404).send("Please download metadata first");

        } else {

            switch(test) {
                case "strict": file = getEntityDir(req.session.request.issuer) + "/sp-metadata-strict.json"; break;
                case "certs": file = getEntityDir(req.session.request.issuer) + "/sp-metadata-certs.json"; break;
                case "extra": file = getEntityDir(req.session.request.issuer) + "/sp-metadata-extra.json"; break;
            }
            
            if(file!=null) {
                Utility.metadataCheck(test, req.session.request.issuer.normalize()).then(
                    (out) => {
                        try {
                            let report = fs.readFileSync(file, "utf8");
                            res.status(200).send(JSON.parse(report));
                        } catch(err) {
                            res.status(500).send("Error while loading report");
                        }
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

// get authn request from session
app.get("/api/request", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    res.status(200).send(req.session.request);
});

// execute test for authn request
app.get("/api/request/check/:test", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

    let DATA_DIR = "../specs-compliance-tests/data";
    if(!fs.existsSync(DATA_DIR)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

    let test = req.params.test;
    let file = null;

    if(req.session.metadata == null) {

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
                    res.status(200).send(JSON.parse(fs.readFileSync(file, "utf8")));
                },
                (err) => {
                    res.status(500).send(err);
                }
            );

        } else {
            res.status(404).send("Test must be strict or certs or extra");
        }
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
    if(req.session.request!=null && req.session.metadata!=null) {
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
    
    res.status(200).send(testResponse);
});

// return assertion/response signed 
app.post("/api/sign", function(req, res) {

	// check if apikey is correct
	if(!checkAuthorisation(req)) {
		error = {code: 401, msg: "Unauthorized"};
		res.status(error.code).send(error.msg);
		return null;
	}	

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
});




/* AUTHENTICATION */
app.get("/authenticate", (req, res)=> {
	
	let user		= req.query.user;
	let password	= req.query.password;
	
	if(
		(user==config_idp.app_user && password==config_idp.app_password_hash)
	) {
		let resobj = {
			apikey: sha256(config_idp.app_user + config_idp.app_password).toString()
		}				
        console.log("SUCCESS /authenticate : APIKEY " + resobj.apikey);
        req.session.user = user;
		res.status(200).send(resobj);

	} else {
		error = {code: 401, msg: "Unauthorized"}
		console.log("ERROR /authenticate : " + error.msg + " (" + user + " : " + password + ")");
		res.status(error.code).send(error.msg);
		return null;				
	}
});


/* AGID LOGIN */
app.get("/login", (req, res)=> {
    res.redirect(authenticator.getAuthURL());
});

app.post("/", function(req, res, next) {
    let state = req.body.state;
    authenticator.getUserInfo(req.body, state, (userinfo)=> {

        let userpolicy = userinfo.user_policy[0];
        let entity = userpolicy.entity_id;
        let policy = userpolicy.policy;

        let now = moment();
        let validfrom = moment(userpolicy.valid_from);
        let validto = moment(userpolicy.valid_to);
        let fromnow = now.diff(validfrom, 'days');
        let nowto = validto.diff(now, 'days');

        if(policy.authorized && fromnow>0 && nowto>0) {
            req.session.authenticated = true;
            req.session.entity = entity;
            req.session.policy = policy;
    
            res.sendFile(path.resolve(__dirname, "..", "client/build", "index.html"));
        } else {
            let msg = "Unhautorized. ";

            //if(fromnow<0) msg+= "Your accounts is valid from " + userpolicy.valid_from;
            //if(nowto<0) msg+= "Your accounts has expired on " + userpolicy.valid_to;

            if(fromnow<0 || nowto<0) msg+= "Your accounts has expired";

            error = {code: 401, msg: msg}
            res.status(error.code).send(error.msg);
            return null;
        }

    }, (error)=> {
        res.status(500).send(error);
    });
});

app.get("/islogged", (req, res)=> {
	if(req.session.authenticated) {
        req.session.apikey = Utility.getUUID();			
		res.status(200).send({apikey: req.session.apikey});
	} else {
		error = {code: 401, msg: "Unauthorized"}
		res.status(error.code).send(error.msg);
		return null;				
	}
});

app.get("/logout", (req, res)=> {
	req.session.destroy((err)=> {
        res.redirect(authenticator.getLogoutURL());
     })
});


// start
app.listen(8080, () => {
    // eslint-disable-next-line no-console
    console.log("\nSPID Validator\nversion: 3.0\n\nlistening on port 8080");
});
