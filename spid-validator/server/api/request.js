const fs = require("fs-extra");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");
const moment = require('moment');

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

    // return last validation from store
    app.get("/api/request/lastcheck/:test", function(req, res) {
        
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }

        if(authorisation=='API' && !req.body.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.body.issuer) { return res.status(400).send("Parameter issuer is missing"); }
        //if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let issuer = (authorisation=='API')? req.body.issuer : req.session.request.issuer;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;

        let test = req.params.test;

        let report = database.getLastCheck(user, issuer, "main");

        switch(test) {
            case "strict": testGroup = report.request_strict; break;
            case "certs": testGroup = report.request_certs; break;
            case "extra": testGroup = report.request_extra; break;
        }

        res.status(200).send(testGroup);
    });

    // execute test for authn request
    app.get("/api/request/check/:test", function(req, res) {
    
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }		

        if(authorisation=='API' && !req.body.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.body.request) { return res.status(400).send("Parameter request is missing"); }
        if(authorisation=='API' && !req.body.issuer) { return res.status(400).send("Parameter issuer is missing"); }
        if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let request = (authorisation=='API')? req.body.request : req.session.request;
        let issuer = (authorisation=='API')? req.body.issuer : req.session.request.issuer;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
        let test = req.params.test;
        let file = null;

        switch(test) {
            case "strict": file = getEntityDir(issuer) + "/sp-authn-request-strict.json"; break;
            case "certs": file = getEntityDir(issuer) + "/sp-authn-request-certs.json"; break;
            case "extra": file = getEntityDir(issuer) + "/sp-authn-request-extra.json"; break;
        }
                
        if(file!=null) {
            Utility.requestCheck(test, issuer.normalize()).then(
                (out) => {
                    let report = fs.readFileSync(file, "utf8");
                    report = JSON.parse(report);
                    
                    let lastcheck = { 
                        datetime: moment().format('YYYY-MM-DD HH:mm:ss'), 
                        report: report
                    } 

                    if(request) {
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

                        database.setRequestValidation(user, issuer, external_code, "main", test, validation);
                        database.setRequestLastCheck(user, issuer, external_code, "main", test, lastcheck); 
                    }

                    res.status(200).send(lastcheck);
                },
                (err) => {
                    Utility.log("ERR /api/request/check/:test", err.toString());
                    res.status(500).send("Error while loading report");
            }
            );

        } else {
            res.status(404).send("Test must be strict or certs or extra");
        }     
    });
}