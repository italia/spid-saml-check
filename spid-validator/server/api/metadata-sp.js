const fs = require("fs-extra");
const bodyParser = require("body-parser");
const Utility = require("../lib/utils");
const MetadataParser = require("../lib/saml-utils").MetadataParser;
const config_dir = require("../../config/dir.json");

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
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(!req.body.url) {
            res.status(500).send("Please insert a valid URL");
    
        } else {
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
            Utility.metadataDownload(req.body.url, getEntityDir(config_dir.TEMP) + "/sp-metadata.xml").then(
                (file_name) => {
                    let xml = fs.readFileSync(getEntityDir(config_dir.TEMP) + "/sp-metadata.xml", "utf8");
                    xml = xml.replaceAll("\n", "");
                    req.session.metadata = {
                        url: req.body.url,
                        xml: xml
                    }
                    let metadataParser = new MetadataParser(xml);
                    let entityID = metadataParser.getServiceProviderEntityId();
                    fs.copyFileSync(getEntityDir(config_dir.TEMP) + "/sp-metadata.xml", getEntityDir(entityID) + "/sp-metadata.xml");
                    database.setMetadata(req.session.user, entityID, req.session.external_code, "main", req.body.url, xml);
                    res.status(200).send(xml);
                },
                (err) => {
                    req.session.metadata = null;
                    res.status(500).send(err);
                }
            );
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
    
        let issuer = (req.session!=null && req.session.request!=null && req.session.request.issuer!=null)? req.session.request.issuer : config_dir.TEMP;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
        let test = req.params.test;
        let file = null;
    
        if(req.session.metadata==null) {
    
            res.status(404).send("Please download metadata first");
    
        } else {
    
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
    
                            if(req.session.request!=null) {
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
    
                                database.setMetadataValidation(req.session.user, req.session.request.issuer, req.session.external_code, "main", test, validation)
                            }
    
                            res.status(200).send(report);
    
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
        }
    });
}