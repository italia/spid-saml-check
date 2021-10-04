const fs = require("fs-extra");
const Utility = require("../lib/utils");
const config_dir = require("../../config/dir.json");
const server_package = require("../package.json");

module.exports = function (app) {

    // get server info
    app.get("/api/server-info", function (req, res) {

        Utility.getSpidSPTestVersion().then((version) => {

            if (req.session != null) { // TODO ASSERTSESSION

                let serverInfo = {
                    version: server_package.version,
                    tools: {
                        spid_test_sp: {
                            version: version
                        }
                    },
                    name: server_package.name,
                    vcs_url: server_package.repository
                }
                res.status(200).send(serverInfo);

            } else {
                res.status(400).send("Session not found");
            }
        });
    });
}