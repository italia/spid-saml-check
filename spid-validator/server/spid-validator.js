const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require('path');
const fs = require("fs");

const config_test = require("../config/test.json");
const config_idp = require("../config/idp.json");

const Utility = require("./lib/utils");
const TestSuite = require("./lib/saml-utils").TestSuite;
const PayloadDecoder = require("./lib/saml-utils").PayloadDecoder;
const MetadataParser = require("./lib/saml-utils").MetadataParser;
const RequestParser = require("./lib/saml-utils").RequestParser;
const Signer = require("./lib/signer").Signer;
const SIGN_MODE = require("./lib/signer").SIGN_MODE;


var app = express();
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "..", "build/assets")));
app.use("/assets", express.static(path.resolve(__dirname, "..", "build/assets")));
app.use(session({ 
    secret: "SAML IDP", 
    resave: true, 
    saveUninitialized: false, 
    //cookie: { maxAge: 60000 }
}));


app.get("/", function (req, res) {
    if(req.session.request==null) {
        res.sendFile(path.resolve(__dirname, "..", "view", "front.html"));        
    } else {
        res.sendFile(path.resolve(__dirname, "..", "build", "index.html"));
    }
});

app.post("/samlsso", function (req, res) {
    let DATA_DIR = "../specs-compliance-tests/data";

	let samlRequest = req.body.SAMLRequest;
	let relayState = req.body.RelayState;

	if(samlRequest!=null && relayState!=null) {
        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);

        if(requestParser.isAuthnRequest()) {
            let requestID = requestParser.ID();
            let requestIssueInstant = requestParser.IssueInstant();
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
            req.session.request = {
                id: requestID,
                issueInstant: requestIssueInstant,
                authnContextClassRef: requestAuthnContextClassRef,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml
            }        

            let fileContent = "SAMLRequest=" + encodeURIComponent(samlRequest) + 
                                "&RelayState=" + encodeURIComponent(relayState);
            fs.writeFileSync(DATA_DIR + "/authn-request.xml", fileContent);
            res.sendFile(path.resolve(__dirname, "..", "build", "index.html"));
        } 

        else if(requestParser.isLogout()) {
            req.session.destroy();
            fs.unlinkSync(DATA_DIR + "/authn-request.xml");
            res.sendFile(path.resolve(__dirname, "..", "view", "logout.html"));
        }

	} else {
		res.sendFile(path.resolve(__dirname, "..", "view", "error.html"));
    }  
});

app.get("/samlsso", function (req, res) {
    let DATA_DIR = "../specs-compliance-tests/data";

	let samlRequest = req.query.SAMLRequest;
	let relayState = req.query.RelayState;
	let sigAlg = req.query.SigAlg;
	let signature = req.query.Signature;

	if(samlRequest!=null 
		&& relayState!=null
		&& sigAlg!=null
		&& signature!=null) {

        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);

        if(requestParser.isAuthnRequest()) {
            let requestID = requestParser.ID();
            let requestIssueInstant = requestParser.IssueInstant();
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
            req.session.request = {
                id: requestID,
                issueInstant: requestIssueInstant,
                authnContextClassRef: requestAuthnContextClassRef,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml
            }        

            let fileContent = "SAMLRequest=" + encodeURIComponent(samlRequest) + 
                                "&RelayState=" + encodeURIComponent(relayState) + 
                                "&SigAlg=" + encodeURIComponent(sigAlg) + 
                                "&Signature=" + encodeURIComponent(signature);
            fs.writeFileSync(DATA_DIR + "/authn-request.xml", fileContent);
            res.sendFile(path.resolve(__dirname, "..", "build", "index.html"));
        } 

        else if(requestParser.isLogout()) {
            req.session.destroy();
            fs.unlinkSync(DATA_DIR + "/authn-request.xml");
            res.sendFile(path.resolve(__dirname, "..", "view", "logout.html"));
        }

	} else {
		res.sendFile(path.resolve(__dirname, "..", "view", "error.html"));
    }  
});





/* API */

app.post("/api/metadata-sp/download", function(req, res) {
    let DATA_DIR = "../specs-compliance-tests/data";
    Utility.metadataDownload(req.body.url, DATA_DIR + "/sp-metadata.xml").then(
        (file_name) => {
            let xml = fs.readFileSync(DATA_DIR + "/sp-metadata.xml", "utf8");
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
});

app.get("/api/metadata-sp/check/:test", function(req, res) {
    let DATA_DIR = "../specs-compliance-tests/data";
    let test = req.params.test;
    let file = null;

    if(req.session.metadata == null) {

        res.status(404).send("Please download metadata first");

    } else {

        switch(test) {
            case "strict": file = DATA_DIR + "/sp-metadata-strict.json"; break;
            case "certs": file = DATA_DIR + "/sp-metadata-certs.json"; break;
            case "extra": file = DATA_DIR + "/sp-metadata-extra.json"; break;
        }
        
        if(file!=null) {
            Utility.metadataCheck(test).then(
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
});

app.get("/api/request", function(req, res) {
    res.status(200).send(req.session.request);
});

app.get("/api/request/check/:test", function(req, res) {
    let DATA_DIR = "../specs-compliance-tests/data";
    let test = req.params.test;
    let file = null;

    if(req.session.metadata == null) {

        res.status(404).send("Please download metadata first");

    } else {

        switch(test) {
            case "strict": file = DATA_DIR + "/sp-authn-request-strict.json"; break;
            case "certs": file = DATA_DIR + "/sp-authn-request-certs.json"; break;
            case "extra": file = DATA_DIR + "/sp-authn-request-extra.json"; break;
        }
        
        if(file!=null) {
            Utility.requestCheck(test).then(
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

app.post("/api/test-response/:id", function(req, res) {
    let id = req.params.id;
    let params = req.body.params;
    let sign_assertion = req.body.sign_assertion;
    let sign_response = req.body.sign_response;

    // default params if no authnrequest
    let authnRequestID = (req.session.request!=null)? req.session.request.id : Utility.getUUID();
    let issueInstant = (req.session.request!=null)? req.session.request.issueInstant : Utility.getInstant();
    let authnContextClassRef = (req.session.request!=null)? req.session.request.authnContextClassRef : "urn:oasis:names:tc:SAML:2.0:ac:classes:SpidL1";
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
    if(req.session.request!=null && req.session.metadata!=null) {
        let requestParser = new RequestParser(req.session.request.xml);
        let metadataParser = new MetadataParser(req.session.metadata.xml);
        let attributeConsumingServiceIndex = requestParser.AttributeConsumingServiceIndex();
        let attributeConsumingService = metadataParser.getAttributeConsumingService(attributeConsumingServiceIndex);
        
        for(i in attributeConsumingService.RequestedAttributes) {
            let attribute = attributeConsumingService.RequestedAttributes[i].Name;
            requestedAttributes.push(attribute);
        }
    } else {
        requestedAttributes = true;
    }

    // defaults 
    params = Utility.defaultParam(params, "Issuer", config_idp.entityID);
    params = Utility.defaultParam(params, "AuthnRequestID", authnRequestID);
    params = Utility.defaultParam(params, "ResponseID", Utility.getUUID());
    params = Utility.defaultParam(params, "IssueInstant", Utility.getInstant());
    params = Utility.defaultParam(params, "AssertionID", Utility.getUUID());
    params = Utility.defaultParam(params, "NameID", Utility.getUUID());
    params = Utility.defaultParam(params, "AuthnIstant", Utility.getInstant());
    params = Utility.defaultParam(params, "NotBefore", Utility.getNotBefore(issueInstant));
    params = Utility.defaultParam(params, "NotOnOrAfter", Utility.getNotOnOrAfter(issueInstant));
    params = Utility.defaultParam(params, "SessionIndex", Utility.getUUID());
    params = Utility.defaultParam(params, "AuthnContextClassRef", authnContextClassRef);
    params = Utility.defaultParam(params, "AssertionConsumerURL", assertionConsumerURL);
    
    let testSuite = new TestSuite(config_idp, config_test);
    let testResponse = testSuite.getTestTemplate("test-suite-1", id, requestedAttributes, params);
    let signed = testResponse.compiled;

    // defaults
    if(sign_response===null) sign_response = testResponse.sign_response;
    if(sign_assertion===null) sign_assertion = testResponse.sign_assertion;
    
    if(sign_response || sign_assertion) {
        let mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;
        if(sign_response && !sign_assertion)        mode = SIGN_MODE.SIGN_RESPONSE;
        else if(!sign_response && sign_assertion)   mode = SIGN_MODE.SIGN_ASSERTION;
        else if(sign_assertion && sign_response)    mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;

        signer = new Signer(config_idp.credentials);
        signed = signer.sign(signed, mode); 
    }   
    

    testResponse.sign_response = sign_response;
    testResponse.sign_assertion = sign_assertion;
    testResponse.compiled = signed;
    
    res.status(200).send(testResponse);
});

app.post("/api/sign", function(req, res) {
    let xml = req.body.xml;
    let sign_assertion = req.body.sign_assertion;
    let sign_response = req.body.sign_response;
    let signed = xml;
    
    if(sign_response || sign_assertion) {
        let mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;
        if(sign_response && !sign_assertion)        mode = SIGN_MODE.SIGN_RESPONSE;
        else if(!sign_response && sign_assertion)   mode = SIGN_MODE.SIGN_ASSERTION;
        else if(sign_assertion && sign_response)    mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;

        signer = new Signer(config_idp.credentials);
        signed = signer.sign(signed, mode);              
    }   
    res.status(200).send(signed);
});

app.listen(8080, () => {
    // eslint-disable-next-line no-console
    console.log("\nSPID Validator\nversion: 0.1\n\nlistening on port 8080");
});
