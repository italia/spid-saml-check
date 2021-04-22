const fs = require("fs-extra");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");

module.exports = function(app, checkAuthorisation, getEntityDir, database) {

    // list all workspace for user and entity_id of types test or main
    // WARNING: this not saves store to session, use GET /api/store to recover a store instead
    app.get("/api/stores", function(req, res) {  
        
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	

        let entity_id = (req.session && req.session.request && req.session.request.issuer)?
            req.session.request.issuer : (req.session.entity_id)? req.session.entity_id : null;
        let user = req.session.user;

        if(entity_id) { // TODO ASSERTSESSION
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
            let stores = database.getStore(user, entity_id, "test,main"); 
            if(!stores) stores = [];
            if(!Array.isArray(stores)) stores = [stores];
            res.status(200).send(stores);
    
        } else {
            res.status(400).send("Session or entity_id not found");
        }
    });

    // recover workspace from store cache
    // WARNING: this RECOVER store from cache saving it to session, not only list
    app.get("/api/store", function(req, res) {
    
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	

        let entity_id = (req.session && req.session.request && req.session.request.issuer)?
            req.session.request.issuer : (req.session.entity_id)? req.session.entity_id : null;

        let type = (req.query.type!=null && req.query.type!='')? req.query.type : 'main';

        if(entity_id) { // TODO ASSERTSESSION
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });

            let store = database.getStore(req.session.user, entity_id, type);
            Utility.log("SELECT STORE - Type: " + type, store);

            if(store) {
                // download again from url to avoid issue with signing
                // Utility.metadataDownload(store.metadata_SP_URL, getEntityDir(entity_id) + "/sp-metadata.xml");
                // must get xml from store because if metadata was uploaded from zip it is not available online
                fs.writeFileSync(getEntityDir(entity_id) + "/sp-metadata.xml", store.metadata_SP_XML, "utf8");
                req.session.metadata = {
                    type: type,
                    entity_id: entity_id,
                    url: store.metadata_SP_URL,
                    xml: store.metadata_SP_XML
                }
            } else {
                Utility.log("STORE NULL", store);
                req.session.metadata = null;
            }
    
            res.status(200).send(store);
    
        } else {
            res.status(400).send("Session or entity_id not found");
        }
    });

    // save workspace to store cache 
    app.post("/api/store", function(req, res) {
    
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
            let organization = (req.session.entity!=null)? req.session.entity.id : null;
            let type = (req.session && req.session.metadata && req.session.metadata.type)? req.session.metadata.type : 'main';
            Utility.log("POST STORE - Type", type);
            database.saveStore(req.session.user, organization, req.session.request.issuer, req.session.external_code, type, req.body);
            res.status(200).send();
    
        } else {
            res.status(400).send("Session not found");
        }
    });

    // delete workspace from store cache
    app.delete("/api/store", function(req, res) {
    
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
    
        if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
            let type = (req.query.type!=null && req.query.type!='')? req.query.type : 'main';
            Utility.log("DELETE STORE - Type", type);
            database.deleteStore(req.session.user, req.session.request.issuer, type);
            res.status(200).send();
    
        } else {
            res.status(400).send("Session not found");
        }
    });
}