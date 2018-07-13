"use strict";

const xmlbuilder = require("xmlbuilder");

const namespaces = require("./namespaces");
const protocol = require("./protocol");
const protocolBindings = require("./protocol-bindings");
const randomID = require("./util/random-id");

module.exports = {
    
    // method used by rest of app
    createBoundAuthnRequest,
    
    // internal methods exposed for testing
    createAuthnRequest,
    chooseFirstSharedNameIDFormat
};

/**
 * Constructs and returns a description of how to direct the user to
 * an IDP, or throws an error.
 */
function createBoundAuthnRequest(sp, idp, model) {
    const idpBindingChoice = protocolBindings.chooseBinding(idp, "login");
    return createAuthnRequest(sp, idp, model, idpBindingChoice.url).then(authnRequestXML => {
        return protocolBindings.applyBinding(sp, idp, authnRequestXML, false, "login", idpBindingChoice);
    });
}

/**
 * Creates an AuthnRequest and records its ID in redis
 * @param sp: service provider config
 * @param idp: identity provider config
 * @param model: model instance capable of persisting a request ID
 */
function createAuthnRequest(sp, idp, model, destinationURL) {
    
    // generate an ID - 21 random bytes should be unique enough
    const requestID = randomID();
    
    // choose which consumption endpoint and method the assertion should
    // come in on
    const spBindingChoice = protocolBindings.chooseBinding(sp, "assert");
    
    // choose an agreed-upon name ID format, or use 'unspecified'
    const nameIDFormat = chooseFirstSharedNameIDFormat([idp, sp]) || protocol.NAMEIDFORMAT.UNSPECIFIED;
    
    // build request payload
    const authnRequest = xmlbuilder.begin({
        separateArrayItems: true
    }).ele({
        "samlp:AuthnRequest":[// request child elements are ordered
        {
            "@xmlns:samlp": namespaces.samlp,
            "@xmlns:saml": namespaces.saml,
            "@Version": "2.0",
            "@ID": requestID,
            "@IssueInstant": new Date().toISOString(),
            "@Destination": destinationURL,
            "@AssertionConsumerServiceURL": spBindingChoice.url,
            "@ProtocolBinding": spBindingChoice.longformURI,
        }, {
            "saml:Issuer": sp.entityID
        },
        (nameIDFormat ? { "samlp:NameIDPolicy": {
                "@Format": nameIDFormat,
                "@AllowCreate": true
            }
        }: null), { "samlp:RequestedAuthnContext": {
                "@Comparison": "exact",
                "saml:AuthnContextClassRef": protocol.AUTHNCONTEXT.PASSWORDPROTECTEDTRANSPORT
            }
        }].filter(exists => exists)
    }).end();
    
    // persist the request ID, return promise chain
    return model.storeRequestID(requestID, idp).then(() => {
        return authnRequest;
    });
}

/**
 * Selects a NameID format which is supported by both the IDP and SP
 */
function chooseFirstSharedNameIDFormat(entities) {
    
    const orderedSharedFormats = entities.map(entity => entity.nameIDFormats).filter(formatList => formatList);
    
    if (orderedSharedFormats.length == 0) {
        return null;
    }
    
    const reducedList = orderedSharedFormats.slice(1).reduce((entityFormats, currentList) => {
        return currentList.filter(format => (currentList.indexOf(format) >= 0));
    },
    orderedSharedFormats[0]);
    
    return reducedList[0] || null;
}