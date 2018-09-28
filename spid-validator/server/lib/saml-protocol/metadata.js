"use strict";

const xpath = require("xpath");
const xmlbuilder = require("xmlbuilder");
const xmldom = require("xmldom");

const credentials = require("./util/credentials");
const encryption = require("./util/encryption");
const pemFormatting = require("./util/pem-formatting");
const randomID = require("./util/random-id");
const signing = require("./util/signing");

const errors = require("./errors");
const protocol = require("./protocol");
const protocolBindings = require("./protocol-bindings");
const namespaces = require("./namespaces");

const DOMParser = xmldom.DOMParser;
const select = xpath.useNamespaces(namespaces);

module.exports = {
    buildIDPMetadata,
    buildSPMetadata,
    getIDPFromMetadata,
    getSPFromMetadata
};

/////////////////////////////////////
//// metadata creation functions ////
/////////////////////////////////////

/**
 * @param idp: Identity Provider config
 * @param signMetadata: whether to sign the resuling metadata
 * @return: a string describing the IDP in SAML metadata format
 */
function buildIDPMetadata(idp, signMetadata) {
    
    let metadata = xmlbuilder.begin({
        separateArrayItems: true
    }).ele({
        "md:EntityDescriptor":[ {
            "@ID": randomID(),
            "@entityID": idp.entityID,
            "@xmlns:md": namespaces.md,
            "@xmlns:ds": namespaces.ds
        },
        createIDPSSODescriptorJSON(idp)]
    }).end();
    
    // sign if necessary
    const signingCredential = credentials.getCredentialsFromEntity(idp, "signing")[0];
    if (signMetadata && signingCredential) {
        metadata = signing.signXML(
        metadata, {
            reference: "//*[local-name(.)='EntityDescriptor']",
            action: "prepend"
        },
        "//*[local-name(.)='EntityDescriptor']",
        signingCredential, {
            prefix: "ds"
        });
    }
    
    return metadata;
}

/**
 * @param sp: Service Provider config
 * @param signMetadata: whether to sign the resuling metadata
 * @return: a string describing the SP in SAML metadata format
 */
function buildSPMetadata(sp, signMetadata) {
    
    let metadata = xmlbuilder.begin({
        separateArrayItems: true
    }).ele({
        "md:EntityDescriptor":[ {
            "@ID": randomID(),
            "@entityID": sp.entityID,
            "@xmlns:md": namespaces.md,
            "@xmlns:ds": namespaces.ds
        },
        createSPSSODescriptorJSON(sp)]
    }).end();
    
    // sign if necessary
    const signingCredential = credentials.getCredentialsFromEntity(sp, "signing")[0];
    if (signMetadata && signingCredential) {
        metadata = signing.signXML(
        metadata, {
            reference: "//*[local-name(.)='EntityDescriptor']",
            action: "prepend"
        },
        "//*[local-name(.)='EntityDescriptor']",
        signingCredential, {
            prefix: "ds"
        });
    }
    
    return metadata;
}

/**
 * Internal-use IDP descriptor builder
 * @param idp: idp config
 * @return: JSON object describing the IDP
 */
function createIDPSSODescriptorJSON(idp) {
    
    // define top-level attributes
    const descriptorBody =[ {
        "@WantAuthnRequestsSigned": idp.requireSignedRequests || false,
        "@protocolSupportEnumeration": "urn:oasis:names:tc:SAML:2.0:protocol"
    }];
    
    // build signing key descriptor
    const signingCredentials = credentials.getCredentialsFromEntity(idp, "signing");
    if (signingCredentials.length > 0) {
        descriptorBody.push(createSigningKeyDescriptorJSON(signingCredentials[0].certificate));
    }
    
    // right now the IDP does not support encryption,
    // so there's no need to an encryption key descriptor
    // todo: support request encryption
    
    // expand potentially abbreviated endpoint config
    const endpoints = protocolBindings.expandBindings(idp.endpoints || {
    });
    
    // add logout consumer endpoints
    if (endpoints.logout) {
        let index = 0;
        if (endpoints.logout.post) {
            descriptorBody.push({
                "md:SingleLogoutService": {
                    //"@index": index++,
                    "@Binding": protocol.BINDINGS.POST,
                    "@Location": endpoints.logout.post,
                    "@ResponseLocation": endpoints.logout.post
                }
            });
        }
        if (endpoints.logout.redirect) {
            descriptorBody.push({
                "md:SingleLogoutService": {
                    //"@index": index++,
                    "@Binding": protocol.BINDINGS.REDIRECT,
                    "@Location": endpoints.logout.redirect,
                    "@ResponseLocation": endpoints.logout.redirect
                }
            });
        }
    }

    // add supported NameIDFormats if specified
    if (idp.nameIDFormats) {
        idp.nameIDFormats.forEach(formatURI => {
            descriptorBody.push({
                "md:NameIDFormat": formatURI
            });
        });
    }

    // add login consumer endpoints
    if (endpoints.login) {
        let index = 0;
        if (endpoints.login.post) {
            descriptorBody.push({
                "md:SingleSignOnService": {
                    //"@index": index++,
                    "@Binding": protocol.BINDINGS.POST,
                    "@Location": endpoints.login.post
                }
            });
        }
        if (endpoints.login.redirect) {
            descriptorBody.push({
                "md:SingleSignOnService": {
                    //"@index": index++,
                    "@Binding": protocol.BINDINGS.REDIRECT,
                    "@Location": endpoints.login.redirect
                }
            });
        }
    }
    
    return {
        "md:IDPSSODescriptor": descriptorBody
    };
}

/**
 * Internal-use SP descriptor builder
 * @param sp: sp config
 * @return: JSON object describing the SP
 */
function createSPSSODescriptorJSON(sp) {
    
    // define top-level attributes
    const descriptorBody =[ {
        "@WantAssertionsSigned": sp.requireSignedResponses || false,
        "@protocolSupportEnumeration": "urn:oasis:names:tc:SAML:2.0:protocol"
    }];
    
    // build signing, encryption key descriptors
    const signingCredentials = credentials.getCredentialsFromEntity(sp, "signing");
    const encryptionCredentials = credentials.getCredentialsFromEntity(sp, "encryption");
    
    if (signingCredentials.length > 0) {
        descriptorBody.push(createSigningKeyDescriptorJSON(signingCredentials[0].certificate));
    }
    if (encryptionCredentials.length > 0) {
        descriptorBody.push(createEncryptionKeyDescriptorJSON(encryptionCredentials[0].certificate));
    }
    
    // add supported NameIDFormats if specified
    if (sp.nameIDFormats) {
        sp.nameIDFormats.forEach(formatURI => {
            descriptorBody.push({
                "md:NameIDFormat": formatURI
            });
        });
    }
    
    // expand potentially abbreviated endpoint config
    const endpoints = protocolBindings.expandBindings(sp.endpoints || {
    });
    
    // add assertion consumer endpoints
    if (endpoints.assert) {
        let assertEndpointIndex = 0;
        if (endpoints.assert.post) {
            descriptorBody.push({
                "md:AssertionConsumerService": {
                    "@index": assertEndpointIndex++,
                    "@Binding": protocol.BINDINGS.POST,
                    "@Location": endpoints.assert.post
                }
            });
        }
        if (endpoints.assert.redirect) {
            descriptorBody.push({
                "md:AssertionConsumerService": {
                    "@index": assertEndpointIndex++,
                    "@Binding": protocol.BINDINGS.REDIRECT,
                    "@Location": endpoints.assert.redirect
                }
            });
        }
    }
    
    // add logout consumer endpoints
    if (endpoints.logout) {
        let logoutEndpointIndex = 0;
        if (endpoints.logout.post) {
            descriptorBody.push({
                "md:SingleLogoutService": {
                    "@index": logoutEndpointIndex++,
                    "@Binding": protocol.BINDINGS.POST,
                    "@Location": endpoints.logout.post,
                    "@ResponseLocation": endpoints.logout.post
                }
            });
        }
        if (endpoints.logout.redirect) {
            descriptorBody.push({
                "md:SingleLogoutService": {
                    "@index": logoutEndpointIndex++,
                    "@Binding": protocol.BINDINGS.REDIRECT,
                    "@Location": endpoints.logout.redirect,
                    "@ResponseLocation": endpoints.logout.redirect
                }
            });
        }
    }
    
    return {
        "md:SPSSODescriptor": descriptorBody
    };
}

/**
 * Internal-use signing key builder
 * @param certificate: X509 certificate to encode
 * @return: JSON describing the key descriptor
 */
function createSigningKeyDescriptorJSON(certificate) {
    const x509Certificate = pemFormatting.stripPEMHeaders(certificate);
    return {
        "md:KeyDescriptor": {
            "@use": "signing",
            "ds:KeyInfo": {
                "ds:X509Data": {
                    "ds:X509Certificate": x509Certificate
                }
            }
        }
    };
}

/**
 * Internal-use encryption key builder
 * @param certificate: X509 certificate to encode
 * @param algorighms: OPTIONAL list of supported algorithms
 * @return: JSON describing the key descriptor
 */
function createEncryptionKeyDescriptorJSON(certificate, algorithms) {
    const x509Certificate = pemFormatting.stripPEMHeaders(certificate);
    let selectedAlgorithms = algorithms;
    if (! selectedAlgorithms) {
        selectedAlgorithms =[].concat(encryption.supportedAlgorithms.encryption).concat(encryption.supportedAlgorithms.keyEncryption);
    }
    return {
        "md:KeyDescriptor":[ {
            "@use": "encryption"
        }, { "ds:KeyInfo": {
                "ds:X509Data": {
                    "ds:X509Certificate": x509Certificate
                }
            }
        }].concat(selectedAlgorithms.map(algURI => {
            return { "md:EncryptionMethod": {
                    "@Algorithm": algURI
                }
            };
        }))
    };
}

//////////////////////////////////////
//// metadata ingestion functions ////
//////////////////////////////////////

// internal reverse map of protocol bindings
const bindingKeyMap = Object.keys(protocol.BINDINGS).reduce((map, key) => {
    map[protocol.BINDINGS[key]] = key.toLowerCase();
    return map;
}, {
});

/**
 * Gets an IDP configuration from a partner's metadata
 * @param metadataXML: XML payload describing the IDP
 * @return: an object describing the IDP
 */
function getIDPFromMetadata(metadataXML) {
    
    const doc = new DOMParser().parseFromString(metadataXML);
    
    const entityDescriptor = select("//md:EntityDescriptor", doc)[0];
    const idpDescriptor = select("//md:IDPSSODescriptor", doc)[0];
    
    if (! idpDescriptor || ! entityDescriptor) {
        throw new errors.ValidationError("No identity provider defined in metadata");
    }
    
    // base config attributes from root node
    const idp = {
        entityID: entityDescriptor.getAttribute("entityID"),
        endpoints: {
        }
    };
    
    // assign credentials, encryption algorithms
    Object.assign(idp, getCredentialsFromRoleDescriptor(idpDescriptor));
    
    // read endpoint bindings
    const ssoLoginBindings = select("//md:SingleSignOnService", idpDescriptor);
    const ssoLogoutBindings = select("//md:SingleLogoutService", idpDescriptor);
    
    ssoLoginBindings.forEach(loginBinding => {
        const location = loginBinding.getAttribute("Location");
        const bindingURI = loginBinding.getAttribute("Binding");
        if (bindingURI in bindingKeyMap) {
            const bindingKey = bindingKeyMap[bindingURI];
            idp.endpoints.login = idp.endpoints.login || {
            };
            idp.endpoints.login[bindingKey] = location;
            if (loginBinding.getAttribute("isDefault")) {
                idp.endpoints.login._default = bindingKey;
            }
        }
    });
    
    ssoLogoutBindings.forEach(logoutBinding => {
        const location = logoutBinding.getAttribute("Location");
        const bindingURI = logoutBinding.getAttribute("Binding");
        if (bindingURI in bindingKeyMap) {
            const bindingKey = bindingKeyMap[bindingURI];
            idp.endpoints.logout = idp.endpoints.logout || {
            };
            idp.endpoints.logout[bindingKey] = location;
            if (logoutBinding.getAttribute("isDefault")) {
                idp.endpoints.logout._default = bindingKey;
            }
        }
    });
    
    // read name ID formats
    const nameIDFormats = select("//md:NameIDFormat/text()", idpDescriptor);
    if (nameIDFormats.length) {
        idp.nameIDFormats = nameIDFormats.map(nameIDFormat => {
            return nameIDFormat.nodeValue;
        });
    }
    
    // add signing requirement flag if specified
    if (idpDescriptor.getAttribute("WantAuthnRequestsSigned") == true) {
        idp.requireSignedRequests = true;
    }
    
    return idp;
}

/**
 * Gets an IDP configuration from a partner's metadata
 * @param metadataXML: XML describing the service provider
 * @return: an object describing the SP
 */
function getSPFromMetadata(metadataXML) {
    
    const doc = new DOMParser().parseFromString(metadataXML);
    
    const entityDescriptor = select("//md:EntityDescriptor", doc)[0];
    const spDescriptor = select("//md:SPSSODescriptor", doc)[0];
    
    if (! spDescriptor || ! entityDescriptor) {
        throw new errors.ValidationError("No service provider defined in metadata");
    }
    
    // base config attributes from root node
    const sp = {
        entityID: entityDescriptor.getAttribute("entityID"),
        endpoints: {
        }
    };
    
    // assign credentials, encryption algorithms
    Object.assign(sp, getCredentialsFromRoleDescriptor(spDescriptor));
    
    // read endpoint bindings
    const assertBindings = select("//md:AssertionConsumerService", spDescriptor);
    const ssoLogoutBindings = select("//md:SingleLogoutService", spDescriptor);
    
    assertBindings.forEach(assertBinding => {
        const location = assertBinding.getAttribute("Location");
        const bindingURI = assertBinding.getAttribute("Binding");
        if (bindingURI in bindingKeyMap) {
            const bindingKey = bindingKeyMap[bindingURI];
            sp.endpoints.assert = sp.endpoints.assert || {
            };
            sp.endpoints.assert[bindingKey] = location;
            if (assertBinding.getAttribute("isDefault")) {
                sp.endpoints.assert._default = bindingKey;
            }
        }
    });
    
    ssoLogoutBindings.forEach(logoutBinding => {
        const location = logoutBinding.getAttribute("Location");
        const bindingURI = logoutBinding.getAttribute("Binding");
        if (bindingURI in bindingKeyMap) {
            const bindingKey = bindingKeyMap[bindingURI];
            sp.endpoints.logout = sp.endpoints.logout || {
            };
            sp.endpoints.logout[bindingKey] = location;
            if (logoutBinding.getAttribute("isDefault")) {
                sp.endpoints.logout._default = bindingKey;
            }
        }
    });
    
    // read name ID formats
    const nameIDFormats = select("//md:NameIDFormat/text()", spDescriptor);
    if (nameIDFormats.length) {
        sp.nameIDFormats = nameIDFormats.map(nameIDFormat => {
            return nameIDFormat.nodeValue;
        });
    }
    
    // add signing requirement flag if specified
    if (spDescriptor.getAttribute("WantAssertionsSigned") == "true") {
        sp.requireSignedResponses = true;
    }
    
    return sp;
}

/**
 * Gets signing and/or encryption credentials from a given role descriptor
 * @param roleDescriptor: an SAML role descriptor
 * @return a role config descriptor fragment with credentials and algorithms
 */
function getCredentialsFromRoleDescriptor(roleDescriptor) {
    const result = {
        credentials:[]
    };
    
    // invert encryption algorithm support map to categorize listed
    // encryption algorithms
    const encAlgorithmMap = Object.keys(encryption.supportedAlgorithms).reduce((encAlgMap, algType) => {
        encryption.supportedAlgorithms[algType].forEach(algURI => {
            encAlgMap[algURI] = algType;
        });
        return encAlgMap;
    }, {
    });
    
    select("md:KeyDescriptor", roleDescriptor).forEach(keyDescriptor => {
        
        // read the essential bits
        const x509Cert = select("//ds:X509Certificate/text()", keyDescriptor)[0];
        
        // X509 certificates are typically formatted as columns, and are likely
        // to be indented when dumped into XML as text. As such, we clobber
        // all whitespace in the blob before adding PEM headers.
        const formattedCert = pemFormatting.addPEMHeaders("certificate", x509Cert.nodeValue.replace(/[\t\s\n\r]/g, ""));
        const use = keyDescriptor.getAttribute("use");
        if (x509Cert) {
            const credential = {
                certificate: formattedCert
            };
            if (use) {
                credential.use = use;
            }
            result.credentials.push(credential);
        }
        
        // read encryption methods
        const encryptionMethods = select("md:EncryptionMethod", keyDescriptor);
        encryptionMethods.forEach(encMethod => {
            const algURI = encMethod.getAttribute("Algorithm");
            const algCategory = encAlgorithmMap[algURI];
            if (algCategory) {
                if (! result.algorithms) {
                    result.algorithms = {
                    };
                }
                if (! result.algorithms[algCategory]) {
                    result.algorithms[algCategory] =[];
                }
                if (result.algorithms[algCategory].indexOf(algURI) < 0) {
                    result.algorithms[algCategory].push(algURI);
                }
            }
        });
    });
    
    return result;
}
