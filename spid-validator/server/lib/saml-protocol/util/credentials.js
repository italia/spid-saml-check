"use strict";

const forge = require("node-forge");

// credential resolution and transformation functions

module.exports = {
    getCredentialsFromEntity,
    getPublicKeyFromCertificate
};

/**
 * Generic credentials accessor - gets a list of signing or encryption
 * credentials from an SP or an IDP.
 * @param entity: IDP or SP configuration
 * @param use: one of "signing" or "encryption"
 * @return: an array of suitable credentials as defined in the configuration
 */
function getCredentialsFromEntity(entity, use) {
    if (! entity.credentials) {
        entity.credentials =[];
    }
    return entity.credentials.filter(credential => {
        return ((credential.use === undefined) || (credential.use == use));
    });
}

/**
 * Derives a public key from an X509 certificate
 * @param certificate: an X509 certificate in PEM format (with headers)
 * @return: a public key in PEM format (with headers)
 */
function getPublicKeyFromCertificate(certificate) {
    const cert = forge.pki.certificateFromPem(certificate);
    return forge.pki.publicKeyToPem(cert.publicKey);
}