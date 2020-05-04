const fs = require("fs-extra");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");

module.exports = function(app, checkAuthorisation, getEntityDir, database) {

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
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
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
}