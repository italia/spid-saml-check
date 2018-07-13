"use strict";

const xmlbuilder = require("xmlbuilder");
const xmldom = require("xmldom");

const errors = require("./errors");
const namespaces = require("./namespaces");
const protocol = require("./protocol");
const protocolBindings = require("./protocol-bindings");
const credentials = require("./util/credentials");
const encryption = require("./util/encryption");
const randomID = require("./util/random-id");

module.exports = {
    
    // primary exposed methods
    buildBoundSuccessResponse,
    buildBoundAuthnFailureResponse,
    
    // secondary methods exposed for testing
    createSuccessResponse,
    createAuthnFailureResponse,
    constructAssertion
};

function buildBoundSuccessResponse(sp, idp, model, inResponseTo, nameID, attributes) {
    const bindingChoice = protocolBindings.chooseBinding(sp, "assert");
    return createSuccessResponse(sp, idp, inResponseTo, nameID, attributes, bindingChoice.url).then(responseXML => {
        return protocolBindings.applyBinding(idp, sp, responseXML, true, "assert", bindingChoice);
    });
}

function buildBoundAuthnFailureResponse(sp, idp, model, inResponseTo, errorMessage) {
    const bindingChoice = protocolBindings.chooseBinding(sp, "assert");
    return createAuthnFailureResponse(sp, idp, inResponseTo, errorMessage, bindingChoice.url).then(responseXML => {
        return protocolBindings.applyBinding(idp, sp, responseXML, true, "assert", bindingChoice);
    });
}

/**
 * Create a success response containing an assertion with the specified
 * attributes
 * @param sp: service provider
 * @param idp: identity provider
 * @param inResponseTo: AuthnRequest ID which this addresses
 * @param attributes: user attributes to convey
 * @return Promise resolving to a Response XML string
 */
function createSuccessResponse(sp, idp, inResponseTo, nameID, attributes, destinationURL) {
    
    const now = new Date();
    
    let xml = xmlbuilder.begin({
        separateArrayItems: true
    }).ele({
        "samlp:Response":[ {
            "@ID": randomID(),
            "@InResponseTo": inResponseTo,
            "@IssueInstant": now.toISOString(),
            "@Destination": destinationURL,
            "@Version": "2.0",
            "@xmlns:samlp": namespaces.samlp,
            "@xmlns:saml": namespaces.saml
        }, {
            "saml:Issuer": idp.entityID
        }, { "samlp:Status": {
                "samlp:StatusCode": {
                    "@Value": protocol.STATUS.SUCCESS
                }
            }
        },
        constructAssertion(sp, idp, inResponseTo, nameID, attributes, now, destinationURL)]
    }).end();
    
    // encrypt if necessary
    if (sp.requireEncryptedResponses || idp.encryptAllResponses) {
        const encryptCredential = credentials.getCredentialsFromEntity(sp, "encryption")[0];
        if (! encryptCredential) {
            throw new errors.ProtocolError("Unable to encrypt assertion; no credential provided");
        }
        // re-parse with xmldom, encrypt (not fast, but not heinous), serialize
        const doc = new xmldom.DOMParser().parseFromString(xml);
        encryption.encryptAssertion(doc, encryptCredential);
        xml = new xmldom.DOMSerializer().serializeToString(doc);
    }
    
    return Promise.resolve(xml);
}

/**
 * Create an authentication failure response
 * @param sp: service provider
 * @param idp: identity provider
 * @param inResponseTo: AuthnRequest ID which this addresses
 * @param statusMessage: status message to convey
 * @return Promise resolving to a Response XML string
 */
function createAuthnFailureResponse(sp, idp, inResponseTo, statusMessage, destinationURL) {
    
    const now = new Date();
    
    const xml = xmlbuilder.begin({
        separateArrayItems: true
    }).ele({
        "samlp:Response":[ {
            "@ID": randomID(),
            "@InResponseTo": inResponseTo,
            "@IssueInstant": now.toISOString(),
            "@Destination": destinationURL,
            "@Version": "2.0",
            "@xmlns:samlp": namespaces.samlp,
            "@xmlns:saml": namespaces.saml
        }, {
            "saml:Issuer": idp.entityID
        }, { "samlp:Status": {
                "samlp:StatusCode": {
                    "@Value": protocol.STATUS.AUTHNFAILED
                },
                "samlp:StatusMessage": statusMessage
            }
        }]
    }).end();
    
    return Promise.resolve(xml);
}

/**
 * Constructs an Assertion as xmlbuilder input JSON
 * @param sp: service provider
 * @param idp: identity provider
 * @param inResponseTo: authentication request ID that this assertion addresses
 * @param attributes: user attribute payload to encode
 * @param issueInstant: Date instance reflecting now
 * @return: Assertion descriptor JSON
 */
function constructAssertion(sp, idp, inResponseTo, nameID, attributes, issueInstant, destinationURL) {
    
    // define a window of time for which the assertion is valid.
    // this current implementation is a bit long, but servicable
    const now = issueInstant;
    const later = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // get an attribute mapping to use when mapping from provided attributes
    // to assertion attributes. this behavior can be disabled by setting sp
    // or idp attribute_mapping to {};
    const attributeMapping = (
    sp.attribute_mapping ||
    idp.attribute_mapping ||
    protocol.default_attribute_mapping);
    
    // construct Attribute nodes
    const attributeNodes =[];
    if (attributes) {
        Object.keys(attributes).forEach(attributeKey => {
            
            let attributeName = attributeKey;
            let attributeValues = attributes[attributeName];
            
            if (attributeKey in attributeMapping) {
                attributeName = attributeMapping[attributeKey][0];
            }
            if (! Array.isArray(attributeValues)) {
                attributeValues =[attributeValues];
            }
            attributeNodes.push({
                "saml:Attribute":[ {
                    "@Name": attributeName,
                    "@NameFormat": protocol.ATTRNAMEFORMAT.BASIC
                }].concat(attributeValues.map(value => {
                    return { "saml:AttributeValue": {
                            "@xsi:type": "xs:string",
                            "#text": value
                        }
                    };
                }))
            });
        });
    }
    
    // return the assertion as JSON for merge into a larger structure
    // before serialization
    let tmp = {
        "saml:Assertion":[// assertion child elements are ordered
        {
            "@ID": randomID(),
            "@IssueInstant": now.toISOString(),
            "@Version": "2.0",
            "@xmlns:xs": namespaces.xs,
            "@xmlns:xsi": namespaces.xsi
        }, { "saml:Issuer": {
                "@Format": protocol.NAMEIDFORMAT.ENTITY,
                "#text": idp.entityID
            }
        }, { "saml:Subject": {
                "saml:NameID": {
                    "@Format": protocol.NAMEIDFORMAT. TRANSIENT,
                    "#text": nameID
                },
                "saml:SubjectConfirmation": {
                    "@Method": protocol.CONFIRMATIONMETHODS.BEARER,
                    "saml:SubjectConfirmationData": {
                        "@NotOnOrAfter": later.toISOString(),
                        "@Recipient": destinationURL,
                        "@InResponseTo": inResponseTo
                    }
                },
            }
        }, { "saml:Conditions": {
                "@NotBefore": now.toISOString(),
                "@NotOnOrAfter": later.toISOString(),
                "saml:AudienceRestriction": {
                    "saml:Audience": sp.entityID
                }
            }
        }, { "saml:AuthnStatement": {
                "@AuthnInstant": now.toISOString(),
                "@SessionNotOnOrAfter": later.toISOString(),
                "@SessionIndex": "0",
                "saml:AuthnContext": {
                    "saml:AuthnContextClassRef": protocol.AUTHNCONTEXT.PASSWORD
                }
            }
        }]
    };
    if (attributes) {
        tmp[ "saml:Assertion"].push({
            "saml:AttributeStatement": attributeNodes
        });
    }
    return tmp;
}