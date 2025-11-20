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
const Signer = require("../lib/Signer").Signer;
const SIGN_MODE = require("../lib/Signer").SIGN_MODE;
const config_server = require("../../config/server.json");
const config_demo = require("../../config/idp_demo.json");
const config_idp = require("../../config/idp.json");
const config_dir = require("../../config/dir.json");
const config_test = require("../../config/test.json");
const spid_users = require("../../config/spid_users.json");

//const demo_basepath = config_demo.basepath=='/'? '':config_demo.basepath;
//const validator_basepath = config_idp.basepath=='/'? '':config_idp.basepath;

const demo_basepath = config_demo.basepath;
const validator_basepath = config_idp.basepath;

module.exports = function(app, checkAuthorisation, getEntityDir, sendLogoutResponse, database) {

    // get validator demo metadata
    app.get(demo_basepath + "/metadata.xml", function (req, res) {
        let config = config_demo;

        let endpoint = config_server.host
            + (config_server.useProxy? '' : ":" + config_server.port)
            + demo_basepath + "/samlsso";

        config.endpoints = {
            "login": endpoint,
            "logout": endpoint,
        }

        let idp = new IdP(config_demo);
        res.set('Content-Type', 'text/xml');
        res.status(200).send("<?xml version=\"1.0\"?>" + idp.getMetadata());
    });

    // demo Front Page
    app.get(demo_basepath + "/", function (req, res) {
        return res.render("demo_index.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath
        });
    });

    // demo Front Page
    app.get(demo_basepath + "/users", function (req, res) {
        return res.render("demo_users.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath,
            users: spid_users
        });
    });

    // process sso post request
    app.post(demo_basepath + "/samlsso", function(req, res) {	
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', 
            {             
                demo_basepath: demo_basepath,
                validator_basepath: validator_basepath,
                message: "Directory " + config_dir["DATA"] + " is not found. Please create it and reload." 
            }
        );
        
        let samlRequest = req.body.SAMLRequest;
        let relayState = (req.body.RelayState!=null)? req.body.RelayState : "";
        let sigAlg = '';
        let signature = '';
    
        return res.render("demo_loading.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath,
            message: "Validazione Request in corso",
            samlRequest: samlRequest,
            relayState: relayState,
            sigAlg: sigAlg,
            signature: signature,
            binding: "HTTP-POST"
        });
    });

    // process sso get request
    app.get(demo_basepath + "/samlsso", function(req, res) {
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', 
            { 
                demo_basepath: demo_basepath,
                validator_basepath: validator_basepath,
                message: "Directory " + config_dir["DATA"] + " is not found. Please create it and reload." 
            }
        );
    
        let samlRequest = req.query.SAMLRequest;
        let relayState = (req.query.RelayState!=null)? req.query.RelayState : "";
        let sigAlg = req.query.SigAlg;
        let signature = req.query.Signature;
    
        return res.render("demo_loading.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath,
            message: "Validazione Request in corso",
            samlRequest: samlRequest,
            relayState: relayState,
            sigAlg: sigAlg,
            signature: signature,
            binding: "HTTP-Redirect"
        });
    });

    // process request
    app.post(demo_basepath + "/start", function(req, res) {
        let samlRequest = req.body.samlRequest;
        let relayState = (req.body.relayState!=null)? req.body.relayState : "";
        let sigAlg = req.body.sigAlg;
        let signature = req.body.signature;
        let binding = req.body.binding;

        startAuthnProcess(res, samlRequest, relayState, sigAlg, signature, binding);
    });

    // check user login and send response
    app.post(demo_basepath + "/login", function(req, res) {
        let username = req.body.username;
        let password = req.body.password;
        let params = req.body.params;
        let retry = req.body.retry;

        let userLogin = login(username, password, params.spidLevel, params.purpose, params.minAge, params.maxAge, req, res);
        if(!userLogin.result) {
            if(userLogin.sendError) {
                return sendErrorResponse(res, req.body.params, userLogin.sendError);
            }

            // retry begins with -1 when login starts
            // if login failed retry start to countdown to 0 from configured maxRetry
            // when countdown reach 0 send error response n.19
            if(retry==-1) retry = config_demo.maxRetry + 1;
            if(retry==1) {
                return sendErrorResponse(res, req.body.params, 19);

            } else {
                retry = retry-1;
                return res.render("demo_login.handlebars", {
                    demo_basepath: demo_basepath,
                    validator_basepath: validator_basepath,
                    error: userLogin.data + "Ti restano ancora " + retry + " tentativi",
                    params: req.body.params,
                    retry: retry,
                    timeout: config_demo.loginTimeout
                });
            }
        }
        
        if(req.body.params.spidLevel>1) {
            Utility.log("2FA Authentication");
        }

        return sendResponse(res, params, userLogin.data);
    });

    // cancel authentication and send error response back to SP
    app.post(demo_basepath + "/cancel", function(req, res) {
        req.session.destroy((err) => {
            try {
                sendErrorResponse(res, req.body.params, 25);
            } catch(err) {
                console.log(err);
                res.redirect(demo_basepath);
            }
        });
    });

    // deny consent to send data
    app.post(demo_basepath + "/deny", function(req, res) {
        req.session.destroy((err) => {
            try {
                sendErrorResponse(res, req.body.params, 22);
            } catch(err) {
                console.log(err);
                res.redirect(demo_basepath);
            }
        });
    });

    // timeout
    app.post(demo_basepath + "/timeout", function(req, res) {
        req.session.destroy((err) => {
            try {
                sendErrorResponse(res, req.body.params, 21);
            } catch(err) {
                console.log(err);
                res.redirect(demo_basepath);
            }
        });
    });



    async function startAuthnProcess(res, samlRequest, relayState, sigAlg, signature, binding) {

        try {
            if(samlRequest==null || relayState==null || sigAlg==null || signature==null) {
                return res.render("error.handlebars", {
                    demo_basepath: demo_basepath,
                    validator_basepath: validator_basepath,
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
                        demo_basepath: demo_basepath,
                        validator_basepath: validator_basepath,
                        message: "Formato richiesta non corretto. Verificare che il metadata sia stato registrato."
                    });
                }


                let metadataParser = new MetadataParser(metadata.xml);
                let organizationDisplayName = metadataParser.getOrganization().displayName;

                let fileContent;
                if(binding=="HTTP-Redirect") {
                    fileContent = config_server.host + "?SAMLRequest=" + encodeURIComponent(samlRequest) + 
                        "&RelayState=" + encodeURIComponent(relayState) + 
                        "&SigAlg=" + encodeURIComponent(sigAlg) + 
                        "&Signature=" + encodeURIComponent(signature);

                } else {
                    fileContent = " \
                        <!DOCTYPE html><html><head><meta charset=\"utf-8\" /></head> \
                        <body onload=\"document.forms[0].submit()\"> \
                            <form action=\"" + validator_basepath + "/samlsso" + "\" method=\"post\"> \
                            <input type=\"hidden\" name=\"SAMLRequest\" value=\"" + samlRequest + "\"/> \
                            <input type=\"hidden\" name=\"RelayState\" value=\"" + relayState  + "\"/> \
                            </form> \
                        </body> \
                        </html> \
                    ";
                }

                fs.writeFileSync(getEntityDir(requestIssuer) + "/authn-request.dump", fileContent);
                fs.writeFileSync(getEntityDir(requestIssuer) + "/sp-metadata.xml", metadata.xml, "utf8");

                try {

                    // syncronize function
                    let checkRequestSync = util.promisify(checkRequest);

                    // Check Request Strict
                    if(config_demo.checkStrict && !await checkRequestSync('strict', requestIssuer)) {
                        return res.render("error.handlebars", {
                            demo_basepath: demo_basepath,
                            validator_basepath: validator_basepath,
                            message: "Formato richiesta non corretto. La AuthnRequest non supera i controlli strict.<br/> \
                            Verificare la AuthnRequest tramite uno strumento di validazione."
                        });
                    }

                    // Check Request Certs
                    /*
                    if(config_demo.checkCerts && !await checkRequestSync('certs', requestIssuer)) {
                        return res.render("error.handlebars", {
                            demo_basepath: demo_basepath,
                            validator_basepath: validator_basepath,
                            message: "Formato richiesta non corretto. La AuthnRequest non supera i controlli certs."
                        });
                    }
                    */

                    // Check Request Extra
                    if(config_demo.checkExtra && !await checkRequestSync('extra', requestIssuer)) {
                        return res.render("error.handlebars", {
                            demo_basepath: demo_basepath,
                            validator_basepath: validator_basepath,
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
                            demo_basepath: demo_basepath,
                            validator_basepath: validator_basepath,
                            message: "Formato richiesta non corretto. AuthnContextClassRef non corretto."
                        });
                    }

                    // Check and retrieve Purpose
                    let purpose = requestParser.Purpose();
                    
                    // Check and retrieve Age Limits
                    // TODO: da correggere rispetto a LL.GG. minori pubblicate, minAge e maxAge sono nel metadata
                    //let minAge = requestParser.MinAge();
                    //let maxAge = requestParser.MaxAge();

                    res.render("demo_login.handlebars", {
                        demo_basepath: demo_basepath,
                        validator_basepath: validator_basepath,
                        params: {
                            spidLevel: spidLevel,
                            organizationDisplayName: organizationDisplayName,
                            samlRequest: samlRequest,
                            relayState: relayState,
                            sigAlg: sigAlg,
                            signature: signature,
                            purpose: purpose,
                            minAge: null, //minAge,
                            maxAge: null //maxAge
                        },
                        retry: -1,
                        timeout: config_demo.loginTimeout
                    });

                } catch(err) {
                    console.log(err);                 
                    res.render("error.handlebars", {
                        demo_basepath: demo_basepath,
                        validator_basepath: validator_basepath,
                        message: "Formato richiesta non corretto. " + err
                    });
                }
            }

            if(requestType=='LOGOUT') {
                sendLogoutResponse(res, samlRequest, relayState);
            }

        } catch(err) {
            console.log(err);    
            return res.render("error.handlebars", {
                demo_basepath: demo_basepath,
                validator_basepath: validator_basepath,
                message: "Formato richiesta non corretto."
            });
        }
    }

    function checkRequest(test, issuer, callback) {
        
        let file = null;

        switch(test) {
            case "strict": file = getEntityDir(issuer) + "/sp-authn-request-strict.json"; break;
            case "certs": file = getEntityDir(issuer) + "/sp-authn-request-certs.json"; break;
            case "extra": file = getEntityDir(issuer) + "/sp-authn-request-extra.json"; break;
        }
                
        Utility.requestCheck(test, issuer.normalize(), config_demo, false).then(
            (out) => {

                try {
                    let report = fs.readFileSync(file, "utf8");
                    report = JSON.parse(report);

                    let testGroup = [];
                    switch(test) {
                        case "strict": testGroup = report.test.sp.authnrequest_strict.SpidSpAuthnReqCheck; break;
                        case "certs": testGroup = report.test.sp.authnrequest_certs.SpidSpAuthnReqCheckCerts; break;
                        case "extra": testGroup = report.test.sp.authnrequest_extra.SpidSpAuthnReqCheckExtra; break;
                    }

                    let validation = true;
                    for(t in testGroup) {
                        let result = testGroup[t].result;
                        if(result!='success') console.log(testGroup[t]);
                        validation = validation && (result=='success' || result=='warning');
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

    function login(username, password, spidLevel, purpose, minAge, maxAge) {
        for(let u in spid_users) {
            let user = spid_users[u];
            if(user.username==username && user.password==password) {

                let nowDate = moment();
                let birthDate = moment(user.dateOfBirth);

                // check if Disabled 
                {
                    if(user.disabled && user.disabled==true) {
                        return {result: false, data: "Utente con identità sospesa/revocata o con credenziali bloccate.", sendError: 23};
                    }
                }

                // check SPID Level
                {
                    let userSPIDLevel = user.spidLevel? user.spidLevel : 2;
                    if(userSPIDLevel<spidLevel) {
                        return {result: false, data: "Utente privo di credenziali compatibili.", sendError: 20};
                    }
                }

                // check Min/Max Age
                // TODO: da correggere rispetto a LL.GG. minori pubblicate, minAge e maxAge sono nel metadata
                /*
                {
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
                }
                */

                // check Professional Use
                {
                    if(!user.purposeIDType) user.purposeIDType = 1;
                    Utility.log("User ID Type: " + user.purposeIDType);
                    Utility.log("Purpose: " + purpose);
                    let purposeErrorMessage = "L'identità digitale (Tipo " + user.purposeIDType + 
                        ") non è compatibile con la tipologia di autenticazione richiesta (Purpose: " + purpose + "). ";

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
                            return {result: false, data: "Codice Purpose non riconosciuto. "};
                    }
                }
            }
        }
        return {result: false, data: "Utente non trovato. "};
    }

    async function sendResponse(res, params, user) {  

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

        // defaults 
        let defaults = [];
        defaults = Utility.defaultParam(defaults, "Issuer", config_demo.entityID);
        defaults = Utility.defaultParam(defaults, "AuthnRequestID", requestParser.ID());
        defaults = Utility.defaultParam(defaults, "NameIDNameQualifier", config_demo.entityID);
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
        
        let testSuite = new TestSuite(config_demo, config_test);
        let testResponse = await testSuite.getTestTemplate(suiteid, caseid, requestedAttributes, defaults, userParams);
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
        
        res.render("demo_confirm.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath,
            params: params,
            attributes: confirmAttributes,
            destination: assertionConsumerURL,
            samlResponse: new Buffer(signed, "utf8").toString("base64"),
            timeout: config_demo.loginTimeout
        });
 
    }

    async function sendErrorResponse(res, params, errorCode) {  
        
        let suiteid = "test-suite-1";

        // select response template for errorCode
        let caseid = null;
        switch(errorCode) {
            case 19: caseid = '104'; break;
            case 20: caseid = '105'; break;
            case 21: caseid = '106'; break;
            case 22: caseid = '107'; break;
            case 23: caseid = '108'; break;
            case 25: caseid = '111'; break;
            //case 30: caseid = ''; break;            
        }

        // sign_assertion=false because error response d not contain assertion
        let sign_assertion = false; 
        let sign_response = true;

        let xml = PayloadDecoder.decode(params.samlRequest);
        let requestParser = new RequestParser(xml);
        let requestIssuer = requestParser.Issuer();

        // Get Metadata from Store
        let store_type = 'main';
        let metadata = database.getMetadata(config_idp.localloginUser, requestIssuer, store_type);
        let metadataParser = new MetadataParser(metadata.xml);

        let serviceProviderEntityId = metadataParser.getServiceProviderEntityId();
        let assertionConsumerURL = requestParser.AssertionConsumerServiceURL();
        let assertionConsumerIndex = requestParser.AssertionConsumerServiceIndex();

        // if no AssertionConsumerURL from request try to get it from metadata
        if((assertionConsumerURL==null || assertionConsumerURL=="") &&
            (assertionConsumerIndex!=null && assertionConsumerIndex!="")) {
            assertionConsumerURL = metadataParser.getAssertionConsumerServiceURL(assertionConsumerIndex);
        }

        // if no valid AssertionConsumerURL return error
        let existsAssertionConsumerServiceURL = metadataParser.existsAssertionConsumerServiceURL(assertionConsumerURL); 
        if(!existsAssertionConsumerServiceURL) {
            return res.status(400).send("AssertionConsumerServiceURL not valid");
        }

        // defaults 
        let defaults = [];
        defaults = Utility.defaultParam(defaults, "Issuer", config_demo.entityID);
        defaults = Utility.defaultParam(defaults, "AuthnRequestID", requestParser.ID());
        defaults = Utility.defaultParam(defaults, "NameIDNameQualifier", config_demo.entityID);
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
        
        let testSuite = new TestSuite(config_demo, config_test);
        let testResponse = await testSuite.getTestTemplate(suiteid, caseid, [], defaults, []);
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
        
        res.render("demo_response_error.handlebars", {
            demo_basepath: demo_basepath,
            validator_basepath: validator_basepath,
            message: "Ritorno al Service Provider",
            destination: assertionConsumerURL,
            relayState: params.relayState,
            samlResponse: new Buffer(signed, "utf8").toString("base64")
        });
    
    }

    async function sendLogoutResponse(res, samlRequest, relayState) {
        
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
        defaults = Utility.defaultParam(defaults, "NameQualifier", config_demo.entityID);
        defaults = Utility.defaultParam(defaults, "Issuer", config_demo.entityID);

        let testSuite = new TestSuite(config_demo, config_test);
        let logoutResponse = await testSuite.getTestTemplate("test-logout", "1", requestedAttributes, defaults, []);
        let signature = null;

        let idp = new IdP(config_demo);
        let sign_credentials = (logoutResponse.sign_credentials!=null)?
            logoutResponse.sign_credentials : config_demo.credentials[0];
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

}