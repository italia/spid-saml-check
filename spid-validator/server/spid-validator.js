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
	let samlRequest = req.body.SAMLRequest;
	let relayState = req.body.RelayState;

	if(samlRequest!=null && relayState!=null) {
        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);
        let requestID = requestParser.ID();
        let requestIssueInstant = requestParser.IssueInstant();
        let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
        req.session.request = {
            id: requestID,
            issueInstant: requestIssueInstant,
            authnContextClassRef: requestAuthnContextClassRef,
            xml: xml
        }        
        res.sendFile(path.resolve(__dirname, "..", "build", "index.html"));

	} else {
		res.sendFile(path.resolve(__dirname, "..", "view", "error.html"));
    }  
});

app.get("/samlsso", function (req, res) {
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
        let requestID = requestParser.ID();
        req.session.request = {
            id: requestID,
            xml: xml
        }         
        res.sendFile(path.resolve(__dirname, "..", "build", "index.html"));

	} else {
		res.sendFile(path.resolve(__dirname, "..", "view", "error.html"));
    }  
});

/*
app.post("/send", function (req, res) {
       
    if (req.session.requestID != null) {
        let username = req.body.username;
        let password = req.body.password;
        let level = req.body.level;
        
        if (username != null && password != null && level != null) {
            let u = User.authenticate(username, password, level);
            if (u != null) {
                let sp = req.session.sp;
                let fullName = u.getAttribute("name") + " " + u.getAttribute("lastName");
                let assertion = idp.produceSuccessResponse(sp, req.session.requestID, username, {
                    name: fullName, gender: "M"
                });
                assertion.then(
                function (data) {
                    res.status(200).send(" \
                    <html> \
                        <body onload=\"document.forms[0].submit()\" > \
                            <noscript>Your browser does not support JavaScript. Please click the 'Continue' button below to proceed.</noscript> \
                            <form action=\"" + data.url.href + "\" method=\"post\" target=\"_blank\"> \
                                <input type=\"hidden\" name=\"RelayState\" value=\"" + req.session.relayState + "\" /> \
                                <input type=\"hidden\" name=\"SAMLResponse\" value=\"" + data.formBody.SAMLResponse + "\" /> \
                                Authentication success.<br/>Redirect to " + data.url.href + " \
                                <noscript><input type=\"submit\" value=\"Continue\" /></noscript> \
                            </form> \
                        </body> \
                    </html>");
                },
                function (data) {
                    console.log(data);
                });
            } else {
                console.log("username/password wrong");
                res.sendFile(path.resolve(__dirname, "..", "view", "login.html"));
            }
        } else {
            res.sendFile(path.resolve(__dirname, "..", "view", "login.html"));
        }
    } else {
        res.sendFile(path.resolve(__dirname, "..", "view", "error.html"));
    }
});
*/




/* API */

app.get("/api/request", function(req, res) {
    res.status(200).send(req.session.request);
});

app.post("/api/test-response/:id", function(req, res) {
    let id = req.params.id;
    let params = req.body.params;
    let sign_assertion = req.body.sign_assertion;
    let sign_response = req.body.sign_response;

    // defaults 
    params = Utility.defaultParam(params, "AuthnRequestID", req.session.request.id);
    params = Utility.defaultParam(params, "ResponseID", Utility.getUUID());
    params = Utility.defaultParam(params, "IssueInstant", Utility.getInstant());
    params = Utility.defaultParam(params, "AssertionID", Utility.getUUID());
    params = Utility.defaultParam(params, "NameID", Utility.getUUID());
    params = Utility.defaultParam(params, "AuthnIstant", req.session.request.issueInstant);
    params = Utility.defaultParam(params, "NotBefore", Utility.getNotBefore(req.session.request.issueInstant));
    params = Utility.defaultParam(params, "NotOnOrAfter", Utility.getNotOnOrAfter(req.session.request.issueInstant));
    params = Utility.defaultParam(params, "SessionIndex", Utility.getUUID());
    params = Utility.defaultParam(params, "AuthnContextClassRef", req.session.request.authnContextClassRef);
    
    
    let testSuite = new TestSuite(config_idp, config_test);
    let testResponse = testSuite.getTestTemplate("test-suite-1", id, params);
    let signed = testResponse.compiled;
    
    if(sign_response || sign_assertion) {
        let mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;
        if(sign_response && !sign_assertion)        mode = SIGN_MODE.SIGN_RESPONSE;
        else if(!sign_response && sign_assertion)   mode = SIGN_MODE.SIGN_ASSERTION;
        else if(sign_assertion && sign_response)    mode = SIGN_MODE.SIGN_RESPONSE_ASSERTION;

        signer = new Signer(config_idp.credentials);
        signed = signer.sign(signed, mode);              
    }      
    
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