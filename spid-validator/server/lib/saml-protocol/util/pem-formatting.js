"use strict";

module.exports = {
    addPEMHeaders,
    stripPEMHeaders
};

/**
 * Adds headers and newlines to a cert or key
 * @param type: type of thing - use 'CERTIFICATE' for X509 certs
 * @return: a nicely formatted cert or key
 */
function addPEMHeaders(type, key) {
    
    // if we're done, we're done
    const re = /-----BEGIN [0-9A-Z ]+-----[^-]*-----END [0-9A-Z ]+-----/g;
    if (re.test(key)) {
        return key;
    }
    
    // format pem to include header information based on type
    let formatted = "-----BEGIN " + type.toUpperCase() + "-----\n";
    formatted += key.match(/.{1,64}/g).join("\n");
    formatted += "\n-----END " + type.toUpperCase() + "-----\n";
    
    return formatted;
}

/**
 * Strips headers and newlines from a given cert or key
 * @param pem: cert or key with headers and newlines
 * @return: the stripped cert or key
 * @throws: a fit if the provided string isn't in PEM format
 */
function stripPEMHeaders(pem) {
    
    // extract contents from body
    const re = /-----BEGIN [0-9A-Z ]+-----([^-]*)-----END [0-9A-Z ]+-----/g;
    const pemData = re.exec(pem);
    if (pemData) {
        
        // remove whitespace
        return pemData[1].replace(/[\r\n|\n]/g, "");
    }
    
    // its possible that we got a raw key without headers; if so, we should be
    // able to convert to bese64 and back. otherwise warn the user, as the key
    // may have been in DER format.
    else {
        const stripped = pem.replace(/[\r\n|\n]/g, "");
        const base64DecodedAndBack = new Buffer(stripped, "base64").toString("base64");
        if (stripped == base64DecodedAndBack) {
            return stripped;
        } else {
            throw new Error("provided certificate or key is not PEM-encoded");
        }
    }
}