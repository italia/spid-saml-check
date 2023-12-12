const fs = require('fs-extra');
const multer = require('multer');
const upload = multer({dest: 'temp/'});
const unzip = require('unzip');
const Utility = require('../lib/utils');
const MetadataParser = require('../lib/saml-utils').MetadataParser;
const config_loader = require('../utils/config_loader');
const config_dir = require('../../config/dir.json');
const config_idp = config_loader.idp();
const config_test = require("../../config/test.json");
const moment = require('moment');

const ZIP_MAX_NUM_FILES = 100;
 
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
        if(authorisation=='API' && !req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
        //if(authorisation=='API' && !req.body.entity_id) { return res.status(400).send("Parameter entity_id is missing"); }

        let entity_id = req.query.entity_id; 

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
        let store_type = (authorisation=='API')? req.query.store_type : 
            (req.session.metadata && req.session.metadata.store_type)? req.session.metadata.store_type : 'main';
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        req.session.metadata = null;

        let result = null;

        if(entity_id) {
            let savedMetadata = database.getMetadata(user, entity_id, store_type);
            if(savedMetadata) {
                req.session.metadata = savedMetadata;
                fs.writeFileSync(getEntityDir(entity_id) + "/sp-metadata.xml", savedMetadata.xml, "utf8");

                let metadataParser = new MetadataParser(savedMetadata.xml);
                let entityID = metadataParser.getServiceProviderEntityId();
                let organization_description = metadataParser.getOrganization().displayName;
                let metadata_type = metadataParser.isMetadataForAggregated()? 'AG':'SP'; 
                
                result = {
                    type: metadata_type,
                    entity_id: entityID,
                    organization_code: organization,
                    organization_description: organization_description,
                    url: savedMetadata.url,
                    xml: savedMetadata.xml
                };
            }

        } else {
            let listMetadata = database.getUserMetadata(user, organization, store_type);
            result = listMetadata;
        }
        

        res.status(200).send(result);
    })
    
    function setMetadataFromFile(name, tempfile, url, organization) {
        let xml = fs.readFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfile, "utf8");
        let metadataParser = new MetadataParser(xml);

        let entityID = metadataParser.getServiceProviderEntityId();
        if(entityID==null || entityID=='') throw new Error("EntityID non specificato");

        let organization_description = metadataParser.getOrganization().displayName;
        if(organization_description==null || organization_description=='') throw new Error("Organization non definito");

        let metadata_type = metadataParser.isMetadataForAggregated()? 'AG':'SP'; 
        
        let organization_aggregated = undefined;
        if(metadataParser.isMetadataForAggregated()) {
            organization_aggregated = metadataParser.getSPIDAggregatedContactPerson();
        }

        metadata = {
            name: name,
            type: metadata_type,
            entity_id: entityID,
            organization_code: organization,
            organization_description: organization_description,
            organization_aggregated: organization_aggregated,
            url: url,
            xml: xml
        }

        fs.copyFileSync(getEntityDir(config_dir.TEMP) + "/" + tempfile, getEntityDir(entityID) + "/sp-metadata.xml");
        fs.unlinkSync(getEntityDir(config_dir.TEMP) + "/" + tempfile);

        return metadata;
    }

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
        if(authorisation=='API' && !req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
        //if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let organization = (authorisation=='API')? req.body.organization : (req.session.entity)? req.session.entity.id : null;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;
        let store_type = (authorisation=='API')? req.query.store_type : 
            (req.session.metadata && req.session.metadata.store_type)? req.session.metadata.store_type : 'main';

        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
        let tempfilename = Utility.getUUID();
        let metadata = {
            url: req.body.url,
            xml: null
        } 

        Utility.metadataDownload(req.body.url, getEntityDir(config_dir.TEMP) + "/" + tempfilename)
            .then((file_name) => {

                try {
                    let metadata = setMetadataFromFile(
                        req.body.url, 
                        tempfilename,
                        req.body.url, 
                        organization
                    );
                    req.session.metadata = metadata;
                    database.setMetadata(user, organization, metadata.entity_id, external_code, store_type, metadata.url, metadata.xml);
                    let result = (authorisation=='API')? metadata : metadata.xml;
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

    // carica il file zip
    app.post('/api/metadata-sp/upload/zip', upload.single('file'), function (req, res, next) {

        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(!req.file) { return res.status(500).send("Please upload a valid zip file"); }
        if(authorisation=='API' && !req.body.user) { return res.status(400).send("Parameter user is missing"); }
        if(authorisation=='API' && !req.body.organization) { return res.status(400).send("Parameter organization is missing"); }
        if(authorisation=='API' && !req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
        //if(authorisation=='API' && !req.body.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let user = (authorisation=='API')? req.body.user : req.session.user;
        let organization = (authorisation=='API')? req.body.organization : (req.session.entity)? req.session.entity.id : null;
        let external_code = (authorisation=='API')? req.body.external_code : req.session.external_code;
        let store_type = (authorisation=='API')? req.query.store_type : 
            (req.session.metadata && req.session.metadata.store_type)? req.session.metadata.store_type : 'main';

        
        Utility.log("POST ZIP", req.file);
        if (req.file.mimetype !== "application/zip" && req.file.mimetype !== "application/x-zip-compressed") {
            res.status(500).send(`Si è verificato un errore durante il caricamento del metadato, il formato del file fornito non è supportato (${req.file.mimetype})`);
            fs.rmSync(req.file.path);
            return;
        }

        let check = req.body.check? req.body.check : "extra";
        let profile = req.body.profile? req.body.profile : "spid-sp-ag-public-full";
        let production = (req.body.production && req.body.production=='N')? false : true;

        Utility.log("PROFILE", profile);
        Utility.log("PRODUCTION", production);

        fs.createReadStream(req.file.path)
            .pipe(unzip.Extract({path: getEntityDir(config_dir.TEMP)}))
            .on('error', (err) => Utility.log('ERRORE FILE: ', err))
            .on('close', async () => {

                let metadata_list = [];
                const files = Utility.readDir(getEntityDir(config_dir.TEMP));

                if(files.length>ZIP_MAX_NUM_FILES) {
                    res.status(400).send(`Il pacchetto zip può contenere massimo ${ZIP_MAX_NUM_FILES} file`);
                    return;
                }

                const saveFilePromises = files.map(async (file) => {
                    
                    Utility.log("CHECK METADATA FILE from ZIP: ", file);
                    let metadata = setMetadataFromFile( 
                        file, 
                        file,
                        getEntityDir(config_dir.TEMP) + "/" + file,
                        organization,
                    );                    
                    
                    // reset url to avoid to view path on client
                    metadata.url = metadata.name;

                    database.setMetadata(user, organization, metadata.entity_id, external_code, store_type, metadata.url, metadata.xml);

                    let dir_metadata = getEntityDir(metadata.entity_id.normalize());
                    let test = check;
                    let reportfile = null;
                                
                    switch(test) {
                        case "strict": reportfile = dir_metadata + "/sp-metadata-strict.json"; break;
                        case "certs": reportfile = dir_metadata + "/sp-metadata-certs.json"; break;
                        case "extra": reportfile = dir_metadata + "/sp-metadata-extra.json"; break;
                    }

                    await Utility.metadataCheck(test, metadata.entity_id.normalize(), profile, config_idp, production).then(
                        (out) => {
                            try {
                                let report = fs.readFileSync(reportfile, "utf8"); 
                                report = JSON.parse(report);
        
                                let lastcheck = { 
                                    datetime: moment().format('YYYY-MM-DD HH:mm:ss'), 
                                    check: check,
                                    profile: profile,
                                    production: production,
                                    report: report
                                } 

                                let validation = null;
        
                                if(user && metadata.entity_id) {
                                    // save result validation on store
                                    let testGroups = [];
        
                                    switch(test) {
                                        case "strict": testGroups = report.test.sp.metadata_strict.SpidSpMetadataCheck; break;
                                        case "certs": testGroups = report.test.sp.metadata_certs.SpidSpMetadataCheckCerts; break;
                                        case "extra": testGroups = report.test.sp.metadata_extra.SpidSpMetadataCheckExtra; break;
                                    }
        
                                    for(let t in testGroups) {
                                        let testGroup = testGroups[t];
                                        if(testGroup.result!=null) {
                                            if(validation==null) validation = (testGroup.result=='success');
                                            else validation = validation && (testGroup.result=='success');
                                        }
                                    }
        
                                    database.setMetadataValidation(user, metadata.entity_id, external_code, store_type, test, validation);
                                    database.setMetadataLastCheck(user, metadata.entity_id, external_code, store_type, test, lastcheck); 
                                }
        
                                metadata.lastcheck = lastcheck;
                                metadata.validation = validation;
        
                            } catch(err) {
                                Utility.log("ERR /api/metadata-sp/upload/zip", err.toString());
                                res.status(500).send("Error while loading report");
                            }
                        },
                        (err) => {
                            Utility.log("ERR /api/metadata-sp/upload/zip", err);
                            res.status(500).send(err);
                        }
                    );
        
                    metadata_list.push(metadata); 
                });

                if (saveFilePromises.length > 0) {
                    Promise.all(saveFilePromises)
                    .then(() => {
                        let validation = metadata_list.reduce((a, m)=> {
                            return a && m.validation;
                        }, true);

                        res.status(201).send({
                            check: check,
                            profile: profile,
                            production: production,
                            validation: validation,
                            metadata: metadata_list
                        });
                    })
                    .catch((error) => res.status(500).send('Si è verificato un errore durante il caricamento del metadato'))
                    .finally(() => fs.rmSync(req.file.path, {recursive: true, force: true}));
                } else {
                    fs.rmSync(req.file.path, {recursive: true, force: true});
                    res.status(500).send('Non sono presenti file all\'interno dello zip caricato');
                }
            });
        }
    );

    // imposta il metadata in sessione
    app.put('/api/metadata-sp/', function(req, res) {
        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(!req.body.metadata) { return res.status(400).send("Please give me a valid metadata object"); }

        req.session.metadata = req.body.metadata;

        res.status(200).send();
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
        if(authorisation=='API' && !req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
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
        let store_type = (authorisation=='API')? req.query.store_type : 
            (req.session.metadata && req.session.metadata.store_type)? req.session.metadata.store_type : 'main';

        let test = req.params.test;

        let report = database.getLastCheck(user, entity_id, store_type);

        switch(test) {
            /* v 1.7 - DEPRECATED
            case "xsd": testGroup = report.metadata_xsd; break;
            */
            /* v 1.9 - DEPRECATED
            case "strict": testGroup = report.metadata_strict; break;
            case "certs": testGroup = report.metadata_certs; break;
            */
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
        if(authorisation=='API' && !req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
        //if(authorisation=='API' && !req.query.external_code) { return res.status(400).send("Parameter external_code is missing"); }

        let store_type = (authorisation=='API')? req.query.store_type : 
            (req.session.metadata && req.session.metadata.store_type)? req.session.metadata.store_type : 'main';

        let metadata = (authorisation=='API')? database.getMetadata(req.query.user, req.query.entity_id, store_type) : req.session.metadata;
        if(!metadata) { return res.status(400).send("Please download metadata first"); }

        let metadataParser = new MetadataParser(metadata.xml);
        let entityID = metadataParser.getServiceProviderEntityId();

        let entity_id = (authorisation=='API')? req.query.entity_id : entityID;
        let user = (authorisation=='API')? req.query.user : req.session.user;
        let external_code = (authorisation=='API')? req.query.external_code : req.session.external_code;

        let deprecated = (req.query.deprecated=='Y')? true : false;
        let production = (req.query.production=='Y')? true : false;
    
        if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory " + config_dir.DATA + " is not found. Please create it and reload." });
    
        let test = req.params.test;
        let cmd = test;
        let file = null;

        let profile = "spid-sp-public";
        if(metadataParser.isMetadataForPrivate()) profile = "spid-sp-private";
        if(metadataParser.isMetadataForAgPublicFull()) profile = "spid-sp-ag-public-full";
        if(metadataParser.isMetadataForAgPublicLite()) profile = "spid-sp-ag-public-lite";
        if(metadataParser.isMetadataForOpPublicFull()) profile = "spid-sp-op-public-full";
        if(metadataParser.isMetadataForOpPublicLite()) profile = "spid-sp-op-public-lite";
        if(metadataParser.isMetadataForAgPrivateFull()) profile = "spid-sp-ag-private-full";
        if(metadataParser.isMetadataForAgPrivateLite()) profile = "spid-sp-ag-private-lite";

        switch(cmd) {
            case "strict": file = getEntityDir(entity_id) + "/sp-metadata-strict.json"; break;
            case "certs": file = getEntityDir(entity_id) + "/sp-metadata-certs.json"; break;
            case "extra": file = getEntityDir(entity_id) + "/sp-metadata-extra.json"; break;
        }

        if(file!=null) {
            Utility.metadataCheck(cmd, entity_id.normalize(), profile, config_idp, production).then(
                (out) => {
                    try {
                        let report = fs.readFileSync(file, "utf8");
                        report = JSON.parse(report);

                        let lastcheck = { 
                            datetime: moment().format('YYYY-MM-DD HH:mm:ss'), 
                            profile: profile,
                            report: report,
                            production: production
                        } 

                        if(user && entity_id) {
                            // save result validation on store
                            let testGroups = [];

                            switch(test) {
                                case "strict": testGroups = report.test.sp.metadata_strict.SpidSpMetadataCheck; break;
                                case "certs": testGroups = report.test.sp.metadata_certs.SpidSpMetadataCheckCerts; break;
                                case "extra": testGroups = report.test.sp.metadata_extra.SpidSpMetadataCheckExtra; break;
                            }

                            let validation = null;
                            for(let t in testGroups) {
                                let testGroup = testGroups[t];
                                if(testGroup.result!=null) {
                                    if(validation==null) validation = (testGroup.result=='success');
                                    else validation = validation && (testGroup.result=='success');
                                }
                            }

                            database.setMetadataValidation(user, entity_id, external_code, store_type, test, validation);
                            database.setMetadataLastCheck(user, entity_id, external_code, store_type, test, lastcheck); 
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
            if(!req.query.store_type) { return res.status(400).send("Parameter store_type is missing"); }
            //if(!req.query.external_code) { return res.status(400).send("Parameter external_code is missing"); }

            try {
                database.deleteStore(req.query.user, req.query.entity_id, req.query.store_type);
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
            let store_type = req.query.store_type;
            let skip_response = (req.query.skip_response && req.query.skip_response.toLowerCase()=='true')? true : false;

            if(!user) { return res.status(400).send("Parameter user is missing"); }
            if(!entity_id) { return res.status(400).send("Parameter entity_id is missing"); }
            if(!store_type) { return res.status(400).send("Parameter store_type is missing"); }

            let store = database.getStore(user, entity_id, store_type);
        
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

                // IMPORTANT! TO FIX : (tests.length - 1) because of tests 1 and 1-nosession that are mutually exclusive
                let test_done_ok = (test_done.length==(tests.length-1));
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
                /*
                if(store.metadata_validation_strict && 
                    store.metadata_validation_certs &&
                    store.metadata_validation_extra &&
                    store.request_validation_strict &&
                    store.request_validation_certs &&
                    store.request_validation_extra &&
                    response_validation &&
                    true
                ) validation = true;
                */

                if(
                    store.metadata_validation_extra &&
                    store.request_validation_extra &&
                    response_validation &&
                    true
                ) validation = true;
        
                result = { 
                    //metadata_strict: store.metadata_validation_strict,
                    //metadata_certs: store.metadata_validation_certs,
                    metadata_extra: store.metadata_validation_extra,
                    //request_strict: store.request_validation_strict,
                    //request_certs: store.request_validation_certs,
                    request_extra: store.request_validation_extra,
                    response_num: (tests.length-1),                     // IMPORTANT! TO FIX : (tests.length - 1) because of tests 1 and 1-nosession that are mutually exclusive
                    response_done: test_done.length,
                    response_success: test_success_num,
                    response_validation: response_validation,
                    validation: validation,
                    test_success: test_success,
                    test_done: test_done
                };      
            }
        
            Utility.log("Validation result", result);
            res.status(200).send(result);

        } else {
            res.status(401).send("Unhautorized");
        }

    });

}