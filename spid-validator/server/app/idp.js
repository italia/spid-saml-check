const fs = require("fs-extra");
const path = require('path');
const Utility = require("../lib/utils");
const IdP = require("../lib/saml-utils").IdP;
const PayloadDecoder = require("../lib/saml-utils").PayloadDecoder;
const RequestParser = require("../lib/saml-utils").RequestParser;
const config_server = require("../../config/server.json");
const config_idp = require("../../config/idp.json");
const config_dir = require("../../config/dir.json");

const validator_basepath = config_idp.basepath=='/'? '':config_idp.basepath;

module.exports = function(app, checkAuthorisation, getEntityDir, sendLogoutResponse) {

    // only check session
    app.get(validator_basepath + "/ping", function(req, res) {
        
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
    app.get(validator_basepath + "/metadata.xml", function (req, res) {
        let config = config_idp;

        let endpoint = config_server.host
            + (config_server.useProxy? '' : ":" + config_server.port)
            + validator_basepath + "/samlsso";

        config.endpoints = {
            "login": endpoint,
            "logout": endpoint,
        }

        let idp = new IdP(config);
        res.set('Content-Type', 'text/xml');
        res.status(200).send("<?xml version=\"1.0\"?>" + idp.getMetadata());
    });

    // process sso post request
    app.post(validator_basepath + "/samlsso", function (req, res) {	
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
        let samlRequest = req.body.SAMLRequest;
        let relayState = (req.body.RelayState!=null)? req.body.RelayState : "";
    
        if(samlRequest!=null && relayState!=null) {
            let xml = PayloadDecoder.decode(samlRequest);
            let requestParser = new RequestParser(xml);
            let requestID = requestParser.ID();
            let requestIssueInstant = requestParser.IssueInstant();
            let requestIssuer = requestParser.Issuer();
    
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
    
            let requestType = undefined;
            if(requestParser.isAuthnRequest()) requestType = 'AUTHN';
            if(requestParser.isLogoutRequest()) requestType = 'LOGOUT';
    
            req.session.request = {
                id: requestID,
                binding: 'POST',
                type: requestType,
                issueInstant: requestIssueInstant,
                issuer: requestIssuer,
                authnContextClassRef: requestAuthnContextClassRef,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml,
                samlRequest: samlRequest,
                relayState: relayState
            } 
    
            //res.send("Servizio in corso di verifica.<br/><br/><a href='/start'>Accedi allo strumento di validazione</a>");
            res.redirect(validator_basepath + "/start");
    
        } else {
            res.sendFile(path.resolve(__dirname, "../..", "client/view", "error.html"));
        }  
    });

    // process sso get request
    app.get(validator_basepath + "/samlsso", function (req, res) {
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
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
    
            let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
            let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
            let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
    
            let requestType = undefined;
            if(requestParser.isAuthnRequest()) requestType = 'AUTHN';
            if(requestParser.isLogoutRequest()) requestType = 'LOGOUT';
    
            req.session.request = {
                id: requestID,
                binding: 'GET',
                type: requestType,
                issueInstant: requestIssueInstant,
                authnContextClassRef: requestAuthnContextClassRef,
                issuer: requestIssuer,
                assertionConsumerServiceURL: requestAssertionConsumerServiceURL,
                assertionConsumerServiceIndex: requestAssertionConsumerServiceIndex,
                xml: xml,
                samlRequest: samlRequest,
                sigAlg: sigAlg,
                signature: signature,
                relayState: relayState
            }  
    
            //res.send("Servizio in corso di verifica.<br/><br/><a href='/start'>Accedi allo strumento di validazione</a>");
            res.redirect(validator_basepath + "/start");
            
        } else {
            res.sendFile(path.resolve(__dirname, "../..", "client/view", "error.html"));
        }  
    });

    app.get(validator_basepath + "/start", function (req, res) {

        if(req.session==undefined
            || req.session.request==undefined
            || req.session.request.binding==undefined
            || req.session.request.type==undefined
            || req.session.request.samlRequest==undefined) {
                res.sendFile(path.resolve(__dirname, "../..", "client/view", "error.html"));
        } else {
            if(req.session && req.session.request.binding=='POST') {
                if(req.session.request.type=='AUTHN') {     
                    
                    req.session.metadata = null;

                    let fileContent = "SAMLRequest=" + encodeURIComponent(req.session.request.samlRequest) + 
                                        "&RelayState=" + encodeURIComponent(req.session.request.relayState);
                    fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/authn-request.xml", fileContent);
                    //res.sendFile(path.resolve(__dirname, "../..", "client/build", "index.html"));
                    res.redirect(validator_basepath);

                } else if(req.session.request.type=='LOGOUT') {
                    if(req.session.request.issuer!=null) {
                        let reqFile = getEntityDir(req.session.request.issuer) + "/authn-request.xml";
                        if(fs.existsSync(reqFile)) fs.unlinkSync(reqFile);
                    }

                    if(req.session.metadata!=null) {
                        sendLogoutResponse(req, res);
                        //res.sendFile(path.resolve(__dirname, "../..", "client/view", "logout.html"));
                    } else {
                        req.session.destroy();
                        res.sendFile(path.resolve(__dirname, "../..", "client/view", "logout.html"));
                    }
                }
            }

            if(req.session && req.session.request.binding=='GET') {
                if(req.session.request.type=='AUTHN') { 
                
                    req.session.metadata = null;          

                    let fileContent = "SAMLRequest=" + encodeURIComponent(req.session.request.samlRequest) + 
                                        "&RelayState=" + encodeURIComponent(req.session.request.relayState) + 
                                        "&SigAlg=" + encodeURIComponent(req.session.request.sigAlg) + 
                                        "&Signature=" + encodeURIComponent(req.session.request.signature);
                    fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/authn-request.xml", fileContent);
                    //res.sendFile(path.resolve(__dirname, "../..", "client/build", "index.html"));
                    res.redirect(validator_basepath);

                } else if(req.session.request.type=='LOGOUT') {
                    
                    if(req.session.request.issuer!=null) {
                        let reqFile = getEntityDir(req.session.request.issuer) + "/authn-request.xml";
                        if(fs.existsSync(reqFile)) fs.unlinkSync(reqFile);
                    }

                    if(req.session.metadata!=null) {
                        sendLogoutResponse(req, res);
                        //res.sendFile(path.resolve(__dirname, "../..", "client/view", "logout.html"));
                    } else {
                        req.session.destroy();
                        res.sendFile(path.resolve(__dirname, "../..", "client/view", "logout.html")); 
                    }
                }
            }
        }
    });

}