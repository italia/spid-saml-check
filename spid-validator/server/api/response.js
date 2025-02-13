const fs = require("fs-extra");
const Utility = require("../lib/utils");
const MetadataParser = require("../lib/saml-utils").MetadataParser;
const RequestParser = require("../lib/saml-utils").RequestParser;
const TestSuite = require("../lib/saml-utils").TestSuite;
const Signer = require("../lib/signer").Signer;
const SIGN_MODE = require("../lib/signer").SIGN_MODE;
const config_loader = require('../utils/config_loader');
const config_test = require("../../config/test.json");
const config_idp = config_loader.idp();
const config_dir = require("../../config/dir.json");


module.exports = function(app, checkAuthorisation) {

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
            
            // set right caseid if SPID Level > 1 to select template base-nosession 
            // https://github.com/italia/spid-saml-check/issues/32
            if(caseid==1) {
                switch(authnContextClassRef) {
                    case 'https://www.spid.gov.it/SpidL2': caseid='1-nosession'; break;
                    case 'https://www.spid.gov.it/SpidL3': caseid='1-nosession'; break;
                }
            }

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
            defaults = Utility.defaultParam(defaults, "NameIDNameQualifier", config_idp.entityID);
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
}