const fs = require('fs-extra');
const Utility = require('../lib/utils');
const MetadataParser = require('../lib/saml-utils').MetadataParser;
const config_dir = require('../../config/dir.json');
const moment = require('moment');

module.exports = function(app, checkAuthorisation, getEntityDir, database) {

    // get downloaded metadata
    app.get("/api/metadata-sp", function(req, res) {

        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }

        if(authorisation=='API' && !req.query.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.query.organization) { return res.status(400).send("Parameter organization is missing"); }
        //if(authorisation=='API' && !req.body.entity_id) { return res.status(400).send("Parameter entity_id is missing"); }

        let entity_id = req.query.entity_id;

        if(authorisation!='API') {
            let request = req.session.request;
            if(!request || !request.issuer) { return res.status(400).send("Session not found"); }

            entity_id = request.issuer;
        }

        let user = (authorisation=='API')? req.query.user : req.session.user;
        let organization = (authorisation=='API')? req.query.organization : req.session.entity.id;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        req.session.metadata = null;

        let result = null;

        if(entity_id) {
            let savedMetadata = database.getMetadata(user, entity_id, "main");
            if(savedMetadata) {
                req.session.metadata = savedMetadata;
                fs.writeFileSync(getEntityDir(entity_id) + "/sp-metadata.xml", savedMetadata.xml, "utf8");
                result = savedMetadata;
            }

        } else {
            let listMetadata = database.getUserMetadata(user, organization, "main");
            result = listMetadata;
        }
        

        res.status(200).send(result);
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
        if(authorisation=='API' && !req.body.organization) { return res.status(400).send("Parameter organization is missing"); }
        if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let organization = (authorisation=='API')? req.body.organization : (req.session.entity)? req.session.entity.id : null;
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
                let metadataParser = new MetadataParser(xml);
                let entityID = metadataParser.getServiceProviderEntityId();
                
                metadata = {
                    entity_id: entityID,
                    url: req.body.url,
                    xml: xml
                }

                req.session.metadata = metadata;
                fs.copyFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename, getEntityDir(entityID) + "/sp-metadata.xml");
                database.setMetadata(user, organization, entityID, external_code, "main", req.body.url, xml);
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

        if(authorisation=='API' && !req.query.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.query.entity_id) { return res.status(400).send("Parameter entity_id is missing"); }
        //if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let entity_id = req.query.entity_id;

        if(authorisation!='API') {
            let metadata = req.session.metadata;
            if(!metadata) { return res.status(400).send("Please download metadata first"); }

            let metadataParser = new MetadataParser(metadata.xml);
            let entityID = metadataParser.getServiceProviderEntityId();
            entity_id = entityID;
        }

        let user = (authorisation=='API')? req.query.user : req.session.user;
        let external_code = (authorisation=='API')? req.query.external_code : req.session.external_code;

        let test = req.params.test;

        let report = database.getLastCheck(user, entity_id, "main");

        switch(test) {
            case "xsd": testGroup = report.metadata_xsd; break;
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

        if(authorisation=='API' && !req.query.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.query.entity_id) { return res.status(400).send("Parameter entity_id is missing"); }
        if(authorisation=='API' && !req.query.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let metadata = (authorisation=='API')? database.getMetadata(req.query.user, req.query.entity_id, "main") : req.session.metadata;
        if(!metadata) { return res.status(400).send("Please download metadata first"); }

        let metadataParser = new MetadataParser(metadata.xml);
        let entityID = metadataParser.getServiceProviderEntityId();

        let entity_id = (authorisation=='API')? req.query.entity_id : entityID;
        let user = (authorisation=='API')? req.query.user : req.session.user;
        let external_code = (authorisation=='API')? req.query.external_code : req.session.external_code;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
        let test = req.params.test;
        let cmd = test;
        let file = null;

        let xsd_type = "metadata_xsd_sp";
    
        if(test=='xsd') {
            if(metadataParser.isMetadataForAggregated()) {
                xsd_type = "metadata_xsd_ag";
                cmd = "xsd-ag";
            } else {
                xsd_type = "metadata_xsd_sp";
                cmd = "xsd-sp";
            }
        }

        switch(cmd) {
            case "xsd-sp": file = getEntityDir(entity_id) + "/sp-metadata-xsd-sp.json"; break;
            case "xsd-ag": file = getEntityDir(entity_id) + "/sp-metadata-xsd-ag.json"; break;
            case "strict": file = getEntityDir(entity_id) + "/sp-metadata-strict.json"; break;
            case "certs": file = getEntityDir(entity_id) + "/sp-metadata-certs.json"; break;
            case "extra": file = getEntityDir(entity_id) + "/sp-metadata-extra.json"; break;
        }

        if(file!=null) {
            Utility.metadataCheck(cmd, entity_id.normalize()).then(
                (out) => {
                    try {
                        let report = fs.readFileSync(file, "utf8");
                        report = JSON.parse(report);

                        // polymorph xsd report
                        if(test=='xsd') report = { test: {sp: { metadata_xsd: report.test.sp[xsd_type] }}}

                        let lastcheck = { 
                            datetime: moment().format('YYYY-MM-DD HH:mm:ss'), 
                            report: report
                        } 

                        if(user && entity_id) {
                            // save result validation on store
                            let testGroup = [];
                            switch(test) {
                                case "xsd": testGroup = report.test.sp.metadata_xsd.TestSPMetadataXSD; break;
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

                            database.setMetadataValidation(user, entity_id, external_code, "main", test, validation);
                            database.setMetadataLastCheck(user, entity_id, external_code, "main", test, lastcheck); 
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
            res.status(404).send("Test must be xsd or strict or certs or extra");
        }
        
    });
}