const fs = require("fs-extra");
const path = require('path');
const Utility = require("../lib/utils");
const config_idp = require("../../config/idp.json");


module.exports = function(app, authenticator, getValidationInfo, getMetadataInfo) {

    // get store info from external code
    // only for OnBoarding, protected by AgID Login
    app.get("/api/sob/store", function(req, res) {
        res.redirect(authenticator.getAuthURL("store"));
    });

    // get validation info from external code
    // only for OnBoarding, not protected
    app.get("/api/sob/validation", function(req, res) {
        //res.redirect(authenticator.getAuthURL("validation"));
        res.send(getValidationInfo(req.query.user, req.query.code));
    });

    // get metadata info from external code
    // only for OnBoarding, not protected
    app.get("/api/sob/metadata", function(req, res) {
        //res.redirect(authenticator.getAuthURL("validation"));
        res.send(getMetadataInfo(req.query.code));
    });

}