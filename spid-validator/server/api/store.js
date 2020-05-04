const fs = require("fs-extra");
const bodyParser = require("body-parser");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");

module.exports = function(app, checkAuthorisation, getEntityDir, database) {

    // recover workspace from store cache
    app.get("/api/store", function(req, res) {
    
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }	
        if(req.session!=null && req.session.request!=null && req.session.request.issuer!=null) { // TODO ASSERTSESSION
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
            let store = database.getStore(req.session.user, req.session.request.issuer, "main");
    
            if(store) {
                // download again from url to avoid issue with signing
                Utility.metadataDownload(store.metadata_SP_URL, getEntityDir(req.session.request.issuer) + "/sp-metadata.xml");
                //fs.writeFileSync(getEntityDir(req.session.request.issuer) + "/sp-metadata.xml", store.metadata_SP_XML, "utf8");
                req.session.metadata = {
                    entity_id: req.session.request.issuer,
                    url: store.metadata_SP_URL,
                    xml: store.metadata_SP_XML
                }
            } else {
                req.session.metadata = null;
            }
    
            res.status(200).send(store);
    
        } else {
            res.status(400).send("Session not found");
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
            database.saveStore(req.session.user, req.session.request.issuer, req.session.external_code, "main", req.body);
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
            database.deleteStore(req.session.user, req.session.request.issuer, "main");
            res.status(200).send();
    
        } else {
            res.status(400).send("Session not found");
        }
    });
}