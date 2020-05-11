const fs = require('fs-extra');
const Utility = require('../lib/utils');
const MetadataParser = require('../lib/saml-utils').MetadataParser;
const config_dir = require('../../config/dir.json');
const moment = require('moment');

module.exports = function(app, checkAuthorisation, getEntityDir, database) {

    // get downloaded metadata
    app.get("/api/metadata-sp", function(req, res) {
    
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
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
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(!req.body.url) { return res.status(500).send("Please insert a valid URL"); }
        if(authorisation=='API' && !req.body.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;

        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        let tempfilename = Utility.getUUID();
        let metadata = {
            url: req.body.url,
            xml: null
        }

        Utility.metadataDownload(req.body.url, getEntityDir(config_dir.TEMP) + "/" + tempfilename).then(
            (file_name) => {
                let xml = fs.readFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename, "utf8");
                xml = xml.replaceAll("\n", "");
                metadata = {
                    url: req.body.url,
                    xml: xml
                }
                let metadataParser = new MetadataParser(xml);
                let entityID = metadataParser.getServiceProviderEntityId();
                req.session.metadata = metadata;
                fs.copyFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename, getEntityDir(entityID) + "/sp-metadata.xml");
                database.setMetadata(user, entityID, external_code, "main", req.body.url, xml);
                fs.unlinkSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename);

                let result = (authorisation=='API')? metadata : xml;
                res.status(200).send(result);
            },
            (err) => {
                req.session.metadata = null;
                res.status(500).send(err);
            }
        );

    });
    
    // return last validation from store
    app.get("/api/metadata-sp/lastcheck/:test", function(req, res) {

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

        let issuer = req.body.issuer;

        if(authorisation!='API') {
            let metadata = req.session.metadata;
            if(!metadata) { return res.status(400).send("Please download metadata first"); }

            let metadataParser = new MetadataParser(metadata.xml);
            let entityID = metadataParser.getServiceProviderEntityId();
            issuer = entityID;
        }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;

        let test = req.params.test;

        let report = database.getLastCheck(user, issuer, "main");

        switch(test) {
            case "strict": testGroup = report.metadata_strict; break;
            case "certs": testGroup = report.metadata_certs; break;
            case "extra": testGroup = report.metadata_extra; break;
        }

        res.status(200).send(testGroup);
    });


    // execute test for metadata
    app.get("/api/metadata-sp/check/:test", function(req, res) {
    
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	

        if(authorisation=='API' && !req.body.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.body.issuer) { return res.status(400).send("Parameter issuer is missing"); }
        if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }
        if(authorisation=='API' && !req.body.metadata) { return res.status(400).send("Parameter metadata is missing"); }

        let metadata = (authorisation=='API')? req.body.metadata : req.session.metadata;
        if(!metadata) { return res.status(400).send("Please download metadata first"); }

        let metadataParser = new MetadataParser(metadata.xml);
        let entityID = metadataParser.getServiceProviderEntityId();

        let issuer = (authorisation=='API')? req.body.issuer : entityID;
        let user = (authorisation=='API')? req.body.user : req.session.user;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
        let test = req.params.test;
        let file = null;
    
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

                        let lastcheck = { 
                            datetime: moment().format('YYYY-MM-DD HH:mm:ss'), 
                            report: report
                        } 

                        if(user && issuer) {
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

                            database.setMetadataValidation(user, issuer, external_code, "main", test, validation);
                            database.setMetadataLastCheck(user, issuer, external_code, "main", test, lastcheck); 
                        }

                        res.status(200).send(lastcheck);

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
        
    });
}