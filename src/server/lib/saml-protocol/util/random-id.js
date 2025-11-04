"use strict";
const crypto = require("crypto");

/**
 * Creates a random ID for use in XML document references. Some parsers
 * require the ID not to start with a number, so we use an underscore prefix
 */
module.exports = function randomID() {
    return "_" + crypto.randomBytes(21).toString("hex");
};