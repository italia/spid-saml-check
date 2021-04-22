const fs = require('fs-extra');
const Utility = require('../lib/utils');
const MetadataParser = require('../lib/saml-utils').MetadataParser;
const config_dir = require('../../config/dir.json');
const config_test = require("../../config/test.json");
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
        let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';

        if(authorisation!='API') {
            if(req.session.entity_id) {
                entity_id = req.session.entity_id;
            } else {
                let request = req.session.request;
                if(!request || !request.issuer) { return res.status(400).send("EntityID or Session not found"); }    
                entity_id = request.issuer;
            }
        }

        let user = (authorisation=='API')? req.query.user : req.session.user;
        let organization = (authorisation=='API')? req.query.organization : req.session.entity.id;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        req.session.metadata = null;

        let result = null;

        if(entity_id) {
            let savedMetadata = database.getMetadata(user, entity_id, type);
            if(savedMetadata) {
                req.session.metadata = savedMetadata;
                fs.writeFileSync(getEntityDir(entity_id) + "/sp-metadata.xml", savedMetadata.xml, "utf8");

                let metadataParser = new MetadataParser(savedMetadata.xml);
                let entityID = metadataParser.getServiceProviderEntityId();
                let organization_description = metadataParser.getOrganization().displayName;
                let mdType = metadataParser.isMetadataForAggregated()? 'AG':'SP'; 
                
                result = {
                    type: mdType,
                    entity_id: entityID,
                    organization_code: organization,
                    organization_description: organization_description,
                    url: savedMetadata.url,
                    xml: savedMetadata.xml
                };
            }

        } else {
            let listMetadata = database.getUserMetadata(user, organization, type);
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
        //if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let organization = (authorisation=='API')? req.body.organization : (req.session.entity)? req.session.entity.id : null;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;
        let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';

        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        let tempfilename = Utility.getUUID();
        let metadata = {
            url: req.body.url,
            xml: null
        }

        Utility.metadataDownload(req.body.url, getEntityDir(config_dir.TEMP) + "/" + tempfilename)
            .then((file_name) => {

                try {
                    let xml = fs.readFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename, "utf8");
                    let metadataParser = new MetadataParser(xml);

                    let entityID = metadataParser.getServiceProviderEntityId();
                    if(entityID==null || entityID=='') throw new Error("EntityID non specificato");

                    let organization_description = metadataParser.getOrganization().displayName;
                    if(organization_description==null || organization_description=='') throw new Error("Organization non definito");

                    let mdType = metadataParser.isMetadataForAggregated()? 'AG':'SP'; 
                    
                    let organization_aggregated = undefined;
                    if(metadataParser.isMetadataForAggregated()) {
                        organization_aggregated = metadataParser.getSPIDAggregatedContactPerson();
                    }
    
                    
                    metadata = {
                        type: mdType,
                        entity_id: entityID,
                        organization_code: organization,
                        organization_description: organization_description,
                        organization_aggregated: organization_aggregated,
                        url: req.body.url,
                        xml: xml
                    }
    
                    req.session.metadata = metadata;
                    fs.copyFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename, getEntityDir(entityID) + "/sp-metadata.xml");
                    database.setMetadata(user, organization, entityID, external_code, type, req.body.url, xml);
                    fs.unlinkSync(getEntityDir(config_dir.TEMP) + "/" + tempfilename);
    
                    let result = (authorisation=='API')? metadata : xml;
                    res.status(200).send(result);

                } catch(exception) {
                    Utility.log("ERR /api/metadata-sp/download", exception);
                    res.status(500).send("Si è verificato un errore durante il parsing del file xml. " + exception.toString());
                }
            
            },
            (err) => {
                req.session.metadata = null;
                res.status(500).send(err);
            }
        )
        .catch((err) => {
            Utility.log("ERR /api/metadata-sp/download", err);
            res.status(500).send(err);
        });

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
        let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';

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

        let report = database.getLastCheck(user, entity_id, type);

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
        //if(authorisation=='API' && !req.query.external_code) { return res.status(400).send("Parameter external_code is missing"); }
        let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';

        let metadata = (authorisation=='API')? database.getMetadata(req.query.user, req.query.entity_id, type) : req.session.metadata;
        if(!metadata) { return res.status(400).send("Please download metadata first"); }

        let metadataParser = new MetadataParser(metadata.xml);
        let entityID = metadataParser.getServiceProviderEntityId();

        let entity_id = (authorisation=='API')? req.query.entity_id : entityID;
        let user = (authorisation=='API')? req.query.user : req.session.user;
        let external_code = (authorisation=='API')? req.query.external_code : req.session.external_code;

        let deprecated = (req.query.deprecated=='Y')? true : false;
    
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
                if(deprecated) {
                    xsd_type = "metadata_xsd_sp";
                    cmd = "xsd-sp";
                } else {
                    xsd_type = "metadata_xsd_sp-av29";
                    cmd = "xsd-sp-av29";
                }
            }
        }

        switch(cmd) {
            case "xsd-sp": file = getEntityDir(entity_id) + "/sp-metadata-xsd-sp.json"; break;
            case "xsd-sp-av29": file = getEntityDir(entity_id) + "/sp-metadata-xsd-sp-av29.json"; break;
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

                            database.setMetadataValidation(user, entity_id, external_code, type, test, validation);
                            database.setMetadataLastCheck(user, entity_id, external_code, type, test, lastcheck); 
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

    // delete metadata
    app.delete("/api/metadata-sp", function(req, res) {
        
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	

        if(authorisation=='API') {
            if(!req.query.user) { return res.status(400).send("Parameter user is missing"); }
            //if(!req.query.external_code) { return res.status(400).send("Parameter external_code is missing"); }
            let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';

            try {
                database.deleteStore(req.query.user, req.query.entity_id, type);
                res.status(200).send();

            } catch(exception) {
                res.status(500).send("Si è verificato un errore durante la cancellazione del metadata: " + exception.toString());
            }

        } else {
            res.status(401).send("Unhautorized");
        }
        
    });

    // get metadata validation
    app.get("/api/metadata-sp/validation", function(req, res) {
        
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	

        if(authorisation=='API') {

            let user = req.query.user;
            let entity_id = req.query.entity_id;
            let type = req.query.type;
            let skip_response = (req.query.skip_response && req.query.skip_response.toLowerCase()=='true')? true : false;

            if(!user) { return res.status(400).send("Parameter user is missing"); }
            if(!entity_id) { return res.status(400).send("Parameter entity_id is missing"); }
            if(!type) { return res.status(400).send("Parameter type is missing"); }

            let store = database.getStore(user, entity_id, type);
        
            let result = { 
                metadata_strict: false,
                metadata_certs: false,
                metadata_extra: false,
                request_strict: false,
                request_certs: false,
                request_extra: false,
                response_done: false,
                response_success: false,
                response_validation: false,
                validation: false
            };
        
            if(store) {
                let test_done = store.response_test_done? Object.keys(store.response_test_done) : [];
                let test_success = store.response_test_success? store.response_test_success : [];
                
                let tests = Object.keys(config_test['test-suite-1']['cases']);
                let test_done_ok = (test_done.length==tests.length);
                let test_success_ok = true;
        
                let test_success_num = 0;
                for(t in test_success) { 
                    if(!test_success[t]) test_success_ok = false;
                    else test_success_num++;
                }
        
                let response_validation = false;
                if(test_done_ok && test_success_ok) response_validation = true;
                if(skip_response) response_validation = true;
                    
                let validation = false;
                if(store.metadata_validation_strict && 
                    store.metadata_validation_certs &&
                    store.metadata_validation_extra &&
                    store.request_validation_strict &&
                    store.request_validation_certs &&
                    store.request_validation_extra &&
                    response_validation &&
                    true
                ) validation = true;
        
                result = { 
                    metadata_strict: store.metadata_validation_strict,
                    metadata_certs: store.metadata_validation_certs,
                    metadata_extra: store.metadata_validation_extra,
                    request_strict: store.request_validation_strict,
                    request_certs: store.request_validation_certs,
                    request_extra: store.request_validation_extra,
                    response_num: tests.length,
                    response_done: test_done.length,
                    response_success: test_success_num,
                    response_validation: response_validation,
                    validation: validation 
                };      
            }
        
            Utility.log("Validation result", result);
            res.status(200).send(result);

        } else {
            res.status(401).send("Unhautorized");
        }

    });





}