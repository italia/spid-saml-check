const fs = require("fs-extra");
const path = require('path');
const Utility = require("../lib/utils");
const config_idp = require("../../config/idp.json");


module.exports = function(app, checkAuthorisation, authenticator, getValidationInfo, getMetadataInfo) {

    // get store info from external code
    // only for OnBoarding, protected by AgID Login
    app.get("/api/sob/store", function(req, res) {
        res.redirect(authenticator.getAuthURL("store"));
    });

    app.get("/api/sob/validation", function(req, res) {

        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }

        res.send(getValidationInfo(req.query.user, req.query.code));
    });

    app.get("/api/sob/metadata", function(req, res) {

        // check if apikey is correct
        let authorisation = checkAuthorisation(req);
        if(!authorisation) {
            error = {code: 401, msg: "Unauthorized"};
            res.status(error.code).send(error.msg);
            return null;
        }

        res.send(getMetadataInfo(req.query.code));
    });

}