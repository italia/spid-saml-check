"use strict";

const xmldom = require("xmldom");
const xpath = require("xpath");

const errors = require("./errors");
const namespaces = require("./namespaces");

const credentials = require("./util/credentials");
const signing = require("./util/signing");

const DOMParser = xmldom.DOMParser;
const ProtocolError = errors.ProtocolError;
const ValidationError = errors.ValidationError;

const select = xpath.useNamespaces(namespaces);

module.exports = {
    
    // methods used by rest of app
    processAuthnRequest
};

/**
 * Entrypoint for authentication request processing - takes an SAML request
 * and returns a description of the requesting servide provider and other
 * request data.
 * @param model: model for SP lookup
 * @param idp: Identity Provider config object
 * @param samlRequest: SAML request passed from protocol layer
 * @returns: a description of the data in the request
 * @throws: errors in case of failure
 */
function processAuthnRequest(model, idp, samlRequest) {
    
    // decode and parse the SAML document
    let doc = new DOMParser().parseFromString(samlRequest.payload);
    
    // choose the first Issuer node from the document, which
    // should reflect the assertion's IDP
    const issuer = select("//saml:Issuer/text()", doc)[0];
    if (! issuer) {
        throw new errors.ProtocolError("Unable to identify issuer");
    }
    
    let sp;
    let hasValidSignature;
    
    // look up IDP corresponding to this response
    return model.getServiceProvider(issuer.nodeValue). catch (err => {
        throw new ProtocolError("Unable to identify SP", err);
    }).then(resolvedSP => {
        
        // construct IDP, validator
        sp = resolvedSP;
        
        // validate redirect binding signatures
        if (samlRequest.verifySignature) {
            hasValidSignature = samlRequest.verifySignature(idp);
        }
        // validate post binding signatures
        else {
            const signatures = select("//ds:Signature", doc);
            const creds = credentials.getCredentialsFromEntity(sp, "signing");
            
            // validate all the sigs - there are edge cases where we have more than one!
            signatures.forEach(sig => {
                creds.forEach(credential => {
                    const validationErrors = signing.validateXMLSignature(samlRequest.payload, sig, credential);
                    if (! validationErrors) {
                        hasValidSignature = true;
                    }
                });
            });
        }
        
        // throw error if sig check fails
        if (! hasValidSignature && idp.requireSignedRequests) {
            throw new ValidationError("IDP requires authentication requests to be signed.");
        }
        
        // start building request
        const requestObj = {
            idp: idp,
            sp: sp,
            requestID: select("//samlp:AuthnRequest", doc)[0].getAttribute("ID")
        };
        
        // attach nameID policy if specified
        const nameIDPolicyNode = select("//samlp:NameIDPolicy", doc)[0];
        if (nameIDPolicyNode) {
            requestObj.nameID = {
                format: nameIDPolicyNode.getAttribute("Format"),
                allowCreate: nameIDPolicyNode.getAttribute("AllowCreate")
            };
        }
        
        return requestObj;
    });
}