const fs = require("fs-extra");
const bodyParser = require("body-parser");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");

module.exports = function(app, checkAuthorisation) {

    // get info from session
    app.get("/api/info", function(req, res) {
        
        // check if apikey is correct
        if(!checkAuthorisation(req)) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }		
    
        if(req.session!=null) { // TODO ASSERTSESSION
            if(!fs.existsSync(config_dir.DATA)) return res.render('warning', { message: "Directory /specs-compliance-tests/data is not found. Please create it and reload." });
    
            let info = {
                request: req.session.request,
                metadata: (req.session.metadata)? req.session.metadata.url : undefined,
                issuer: (req.session.request)? req.session.request.issuer : undefined,
                entity: req.session.entity,
                policy: req.session.policy,
                external_code: req.session.external_code
            }
            res.status(200).send(info);
    
        } else {
            res.status(400).send("Session not found");
        }
    });
}