const fs = require("fs-extra");
const path = require('path');
const util = require('util');
const Utility = require("../lib/utils");
const moment = require("moment");
const IdP = require("../lib/saml-utils").IdP;
const PayloadDecoder = require("../lib/saml-utils").PayloadDecoder;
const RequestParser = require("../lib/saml-utils").RequestParser;
const MetadataParser = require("../lib/saml-utils").MetadataParser;
const TestSuite = require("../lib/saml-utils").TestSuite;
const Signer = require("../lib/signer").Signer;
const SIGN_MODE = require("../lib/signer").SIGN_MODE;
const config_testenv = require("../../config/idp_testenv.json");
const config_idp = require("../../config/idp.json");
const config_dir = require("../../config/dir.json");
const config_test = require("../../config/test.json");
const spid_users = require("../../config/spid_users.json");

module.exports = function(app, checkAuthorisation, getEntityDir, sendLogoutResponse, database) {

    // get validator testenv metadata
    app.get("/testenv/metadata.xml", function (req, res) {
        let idp = new IdP(config_testenv);
        res.set('Content-Type', 'text/xml');
        res.status(200).send("<?xml version=\"1.0\"?>" + idp.getMetadata());
    });

    // process sso post request
    app.post("/testenv/samlsso", function(req, res) {	
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', 
            { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." }
        );
        
        let samlRequest = req.body.SAMLRequest;
        let relayState = (req.body.RelayState!=null)? req.body.RelayState : "";
        let sigAlg = '';
        let signature = '';
    
        return res.render("loading.handlebars", {
            message: "Validazione Request in corso",
            samlRequest: samlRequest,
            relayState: relayState,
            sigAlg: sigAlg,
            signature: signature
        });
    });

    // process sso get request
    app.get("/testenv/samlsso", function(req, res) {
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', 
            { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." }
        );
    
        let samlRequest = req.query.SAMLRequest;
        let relayState = (req.query.RelayState!=null)? req.query.RelayState : "";
        let sigAlg = req.query.SigAlg;
        let signature = req.query.Signature;
    
        return res.render("loading.handlebars", {
            message: "Validazione Request in corso",
            samlRequest: samlRequest,
            relayState: relayState,
            sigAlg: sigAlg,
            signature: signature
        });
    });

    // process sso get request
    app.post("/testenv/start", function(req, res) {
        let samlRequest = req.body.samlRequest;
        let relayState = (req.body.relayState!=null)? req.body.relayState : "";
        let sigAlg = req.body.sigAlg;
        let signature = req.body.signature;

        startAuthnProcess(res, samlRequest, relayState, sigAlg, signature);
    });

    // check user login and send response
    app.post("/testenv/login", function(req, res) {
        let username = req.body.username;
        let password = req.body.password;
        let params = req.body.params;


        let userLogin = login(username, password, params.purpose, params.minAge, params.maxAge);
        if(!userLogin.result) {
            return res.render("login.handlebars", {
                error: userLogin.data,
                params: req.body.params
            });
        }
        

        if(req.body.params.spidLevel>1) {
            Utility.log("2FA Authentication");
        }

        sendResponse(res, params, userLogin.data);
    });




    async function startAuthnProcess(res, samlRequest, relayState, sigAlg, signature) {

        if(samlRequest==null || relayState==null || sigAlg==null || signature==null) {
            return res.render("error.handlebars", {
                message: "Formato richiesta non corretto."
            });
        }

        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);
        let requestIssuer = requestParser.Issuer();
    
        let requestAuthnContextClassRef = requestParser.AuthnContextClassRef();
        let requestAssertionConsumerServiceURL = requestParser.AssertionConsumerServiceURL();
        let requestAssertionConsumerServiceIndex = requestParser.AssertionConsumerServiceIndex();
    
        let requestType = undefined;
        if(requestParser.isAuthnRequest()) requestType = 'AUTHN';
        if(requestParser.isLogoutRequest()) requestType = 'LOGOUT';
    

        if(requestType=='AUTHN') {

            // Get Metadata from Store
            let store_type = 'main';
            let metadata = database.getMetadata(config_idp.localloginUser, requestIssuer, store_type);
            
            if(!metadata) {
                return res.render("error.handlebars", {
                    message: "Formato richiesta non corretto. Verificare che il metadata sia stato registrato."
                });
            }


            let metadataParser = new MetadataParser(metadata.xml);
            let organizationDisplayName = metadataParser.getOrganization().displayName;

            let fileContent = "SAMLRequest=" + encodeURIComponent(samlRequest) + 
                                "&RelayState=" + encodeURIComponent(relayState) + 
                                "&SigAlg=" + encodeURIComponent(sigAlg) + 
                                "&Signature=" + encodeURIComponent(signature);

            fs.writeFileSync(getEntityDir(requestIssuer) + "/authn-request.xml", fileContent);
            fs.writeFileSync(getEntityDir(requestIssuer) + "/sp-metadata.xml", metadata.xml, "utf8");

            try {
                // syncronize function
                let checkRequestSync = util.promisify(checkRequest);

                // Check Request Strict
                if(!await checkRequestSync('strict', requestIssuer)) {
                    return res.render("error.handlebars", {
                        message: "Formato richiesta non corretto. La AuthnRequest non supera i controlli strict.<br/> \
                        Verificare la AuthnRequest tramite uno strumento di validazione."
                    });
                }

                // Check Request Certs
                if(!await checkRequestSync('certs', requestIssuer)) {
                    return res.render("error.handlebars", {
                        message: "Formato richiesta non corretto. La AuthnRequest non supera i controlli certs."
                    });
                }

                // Check Request Extra
                if(!await checkRequestSync('extra', requestIssuer)) {
                    return res.render("error.handlebars", {
                        message: "Formato richiesta non corretto. La AuthnRequest non supera i controlli extra."
                    });
                }

                // Check and retrieve SPID Level
                let spidLevel = null;
                switch(requestAuthnContextClassRef) {
                    case 'https://www.spid.gov.it/SpidL1': spidLevel = 1; break;
                    case 'https://www.spid.gov.it/SpidL2': spidLevel = 2; break;
                    case 'https://www.spid.gov.it/SpidL3': spidLevel = 3; break;
                }

                if(!spidLevel) {
                    res.render("error.handlebars", {
                        message: "Formato richiesta non corretto. AuthnContextClassRef non corretto."
                    });
                }

                // Check and retrieve Purpose
                let purpose = requestParser.Purpose();
                
                // Check and retrieve Age Limits
                let minAge = requestParser.MinAge();
                let maxAge = requestParser.MaxAge();

                res.render("login.handlebars", {
                    "params": {
                        "spidLevel": spidLevel,
                        "organizationDisplayName": organizationDisplayName,
                        "samlRequest": samlRequest,
                        "relayState": relayState,
                        "sigAlg": sigAlg,
                        "signature": signature,
                        "purpose": purpose,
                        "minAge": minAge,
                        "maxAge": maxAge
                    }
                });

            } catch(err) {
                console.log(err);

                res.render("error.handlebars", {
                    message: "Formato richiesta non corretto. " + err
                });
            }
        }

        if(requestType=='LOGOUT') {
            sendLogoutResponse(res, samlRequest, relayState);
        }
    }

    function login(username, password, purpose, minAge, maxAge) {
        for(let u in spid_users) {
            let user = spid_users[u];
            if(user.username==username && user.password==password) {

                let nowDate = moment();
                let birthDate = moment(user.dateOfBirth);

                // check min/max age
                let userAge = nowDate.diff(birthDate, 'years');
                Utility.log("USER Age: " + userAge);
                Utility.log("MIN Age: " + minAge);
                Utility.log("MAX Age: " + maxAge);

                let ageErrorMessage = "Spiacente " + user.name + ", ma non hai l'età richiesta per accedere al servizio. ";
                ageErrorMessage += "La tua età: " + userAge + ". ";
                if(minAge) ageErrorMessage += "Età minima: " + minAge + ". ";
                if(maxAge) ageErrorMessage += "Età massima: " + maxAge + ". ";
                
                if(minAge && userAge < minAge) {
                    return {result: false, data: ageErrorMessage};
                }
                if(maxAge && userAge > maxAge) {
                    return {result: false, data: ageErrorMessage};
                }

                if(!user.purposeIDType) user.purposeIDType = 1;

                // check professional Use
                Utility.log("User ID Type: " + user.purposeIDType);
                Utility.log("Purpose: " + purpose);
                let purposeErrorMessage = "L'identità digitale (Tipo " + user.purposeIDType + 
                    ") non è compatibile con la tipologia di autenticazione richiesta (Purpose: " + purpose + ").";

                switch(purpose) {
                    case null:
                    case "":
                        if(user.purposeIDType==1 
                            || user.purposeIDType==3) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    case "P":
                        if(user.purposeIDType==3 
                            || user.purposeIDType==4) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    case "LP":
                        if(user.purposeIDType==2 
                            || user.purposeIDType==4) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    case "PG":
                        if(user.purposeIDType==4) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    case "PF":
                        if(user.purposeIDType==3) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    case "PX":
                        if(user.purposeIDType==2 
                            || user.purposeIDType==3
                            || user.purposeIDType==4) return {result: true, data: user};
                        else return {result: false, data: purposeErrorMessage};
                        break;

                    default: 
                        return {result: false, data: "Codice Purpose non riconosciuto"};
                }
            }
        }
        return {result: false, data: "Utente non trovato"};
    }

    function sendResponse(res, params, user) {  

        let suiteid = "test-suite-1";
        let caseid = "1";
        let sign_assertion = true;
        let sign_response = true;

        let xml = PayloadDecoder.decode(params.samlRequest);
        let requestParser = new RequestParser(xml);
        let requestIssuer = requestParser.Issuer();

        // Get Metadata from Store
        let store_type = 'main';
        let metadata = database.getMetadata(config_idp.localloginUser, requestIssuer, store_type);
        let metadataParser = new MetadataParser(metadata.xml);

        let assertionConsumerURL = requestParser.AssertionConsumerServiceURL();
        let assertionConsumerIndex = requestParser.AssertionConsumerServiceIndex();

        // if no AssertionConsumerURL from request try to get it from metadata
        if((assertionConsumerURL==null || assertionConsumerURL=="") &&
            (assertionConsumerIndex!=null && assertionConsumerIndex!="")) {
            assertionConsumerURL = metadataParser.getAssertionConsumerServiceURL(assertionConsumerIndex);
        }

        // read AttributeConsumingService set from metadata
        let attributeConsumingServiceIndex = requestParser.AttributeConsumingServiceIndex();
        let attributeConsumingService = metadataParser.getAttributeConsumingService(attributeConsumingServiceIndex);
        let serviceProviderEntityId = metadataParser.getServiceProviderEntityId();
            
        let requestedAttributes = [];
        for(i in attributeConsumingService.RequestedAttributes) {
            let attribute = attributeConsumingService.RequestedAttributes[i].Name;
            requestedAttributes.push(attribute);

        }
        
        // retrieve attributes from spid user
        let attributeValues = {};
        let confirmAttributes = [];
        for(let i in requestedAttributes) {
            attributeValues[requestedAttributes[i]] = user[requestedAttributes[i]];
            confirmAttributes.push({
                name: requestedAttributes[i],
                value: user[requestedAttributes[i]]
            })
        }
        let userParams = [{ key: "Attributes", val: attributeValues }];

        console.log(attributeValues);

        // defaults 
        let defaults = [];
        defaults = Utility.defaultParam(defaults, "Issuer", config_testenv.entityID);
        defaults = Utility.defaultParam(defaults, "AuthnRequestID", requestParser.ID());
        defaults = Utility.defaultParam(defaults, "ResponseID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "IssueInstant", Utility.getInstant());
        defaults = Utility.defaultParam(defaults, "IssueInstantMillis", Utility.getInstantMillis());
        defaults = Utility.defaultParam(defaults, "AssertionID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "NameID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "AuthnIstant", Utility.getInstant());
        defaults = Utility.defaultParam(defaults, "NotBefore", Utility.getNotBefore(requestParser.IssueInstant()));
        defaults = Utility.defaultParam(defaults, "NotOnOrAfter", Utility.getNotOnOrAfter(requestParser.IssueInstant()));
        defaults = Utility.defaultParam(defaults, "SessionIndex", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "AuthnContextClassRef", requestParser.AuthnContextClassRef());
        defaults = Utility.defaultParam(defaults, "AssertionConsumerURL", assertionConsumerURL);
        defaults = Utility.defaultParam(defaults, "Audience", serviceProviderEntityId);
        
        let testSuite = new TestSuite(config_testenv, config_test);
        let testResponse = testSuite.getTestTemplate(suiteid, caseid, requestedAttributes, defaults, userParams);
        let signed = testResponse.compiled;
        
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
        
        res.render("confirm.handlebars", {
            "params": params,
            "attributes": confirmAttributes,
            "destination": assertionConsumerURL,
            "samlResponse": new Buffer(signed, "utf8").toString("base64")
        });
 
    }

    function sendLogoutResponse(res, samlRequest, relayState) {
        
        let xml = PayloadDecoder.decode(samlRequest);
        let requestParser = new RequestParser(xml);
        let requestIssuer = requestParser.Issuer();

        // Get Metadata from Store
        let store_type = 'main';
        let metadata = database.getMetadata(config_idp.localloginUser, requestIssuer, store_type);
        let metadataParser = new MetadataParser(metadata.xml);

        // default params if no authnrequest
        let authnRequestID = requestParser.ID();
        let issueInstant = requestParser.IssueInstant();
        let assertionConsumerURL = requestParser.AssertionConsumerServiceURL();
        let assertionConsumerIndex = requestParser.AssertionConsumerServiceIndex();

        // if no AssertionConsumerURL from request try to get it from metadata
        if((assertionConsumerURL==null || assertionConsumerURL=="") &&
            (assertionConsumerIndex!=null && assertionConsumerIndex!="")) {
            assertionConsumerURL = metadataParser.getAssertionConsumerServiceURL(assertionConsumerIndex);
        }

        let requestedAttributes = [];
        let serviceProviderEntityId = "";
        let singleLogoutServiceURL = [];

        serviceProviderEntityId = metadataParser.getServiceProviderEntityId();
        singleLogoutServiceURL = metadataParser.getSingleLogoutServiceURL();

        // defaults
        let defaults = []; // clone array
        defaults = Utility.defaultParam(defaults, "ResponseID", Utility.getUUID());
        defaults = Utility.defaultParam(defaults, "IssueInstant", Utility.getInstant());
        defaults = Utility.defaultParam(defaults, "Destination", singleLogoutServiceURL[0]);
        defaults = Utility.defaultParam(defaults, "AuthnRequestID", authnRequestID);
        defaults = Utility.defaultParam(defaults, "NameQualifier", "https://validator-test.spid.gov.it/testenv");
        defaults = Utility.defaultParam(defaults, "Issuer", config_testenv.entityID);

        let testSuite = new TestSuite(config_testenv, config_test);
        let logoutResponse = testSuite.getTestTemplate("test-logout", "1", requestedAttributes, defaults, []);
        let signature = null;

        let idp = new IdP(config_testenv);
        let sign_credentials = (logoutResponse.sign_credentials!=null)?
            logoutResponse.sign_credentials : config_testenv.credentials[0];
        let SAMLResponse = logoutResponse.compiled;
        let sigAlg = sign_credentials.signatureAlgorithm;

        // defaults
        sign_response = logoutResponse.sign_response;

        if(sign_response) {
            let mode = SIGN_MODE.GET_SIGNATURE;
            let logoutResponsePayload = idp.getLogoutResponsePayload(SAMLResponse, relayState, sigAlg);
            signer = new Signer(sign_credentials);
            signature = signer.sign(logoutResponsePayload, mode);
        }

        let url = singleLogoutServiceURL[0];
        let logoutURL = idp.getLogoutResponseURL(url, SAMLResponse, sigAlg, signature, relayState);
        res.redirect(logoutURL);

    }


    function checkRequest(test, issuer, callback) {

        let file = null;

        switch(test) {
            case "strict": file = getEntityDir(issuer) + "/sp-authn-request-strict.json"; break;
            case "certs": file = getEntityDir(issuer) + "/sp-authn-request-certs.json"; break;
            case "extra": file = getEntityDir(issuer) + "/sp-authn-request-extra.json"; break;
        }
                
        Utility.requestCheck(test, issuer.normalize()).then(
            (out) => {

                try {
                    let report = fs.readFileSync(file, "utf8");
                    report = JSON.parse(report);

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
                            if(result===undefined) {
                                // fix request extra if not defined
                                validation = true;
                            } else {
                                validation = validation && (result=='success');
                            }
                        }
                    }

                    callback(null, validation);

                } catch(err) {
                    // error while check
                    callback(err, false);
                }
            },
            (err) => {
                // error while check
                callback(err, false);
            }
        );  
    }
}