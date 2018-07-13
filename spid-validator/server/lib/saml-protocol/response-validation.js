"use strict";

const xpath = require("xpath");

const signing = require("./util/signing");
const credentials = require("./util/credentials");
const namespaces = require("./namespaces");
const protocolBindings = require("./protocol-bindings");
const moment = require("moment");
const urlParse = require("url").parse;

const select = xpath.useNamespaces(namespaces);

module.exports = {
    ResponseValidator
};

/**
 * SAML Response validatior - validates decrypted SAMLResponse document nodes
 * @param sp: service provider descriptor
 * @param idp: identity provider descriptor
 * @param model: model used to verify inResponseTo's referened ID
 */
function ResponseValidator(sp, idp, model) {
    
    this.sp = sp;
    this.idp = idp;
    this.model = model;
    
    this.errorMessages =[];
    this.hasValidSignature = false;
    this.inResponseTo = null;
    
    // allow model to override date lookup so that we can test
    // with assertions created in the past
    this.getNow = model.getNow || function () {
        return new Date();
    };
}

ResponseValidator.prototype.addError = function (message) {
    this.errorMessages.push(message);
};

ResponseValidator.prototype.isValid = function () {
    return ! this.errorMessages.length;
};

ResponseValidator.prototype.getErrors = function () {
    return this.errorMessages;
};

/**
 * SAML response payload data validator. Validates everything except
 * signatures, which must be done separately to handle cases where signing
 * and encryption are employed together. Use this as the main entrypoint
 * for data validations.
 *
 * @param doc: fully-decrypted SAML document
 * @return: a promise fulfilled after validation completes
 */
ResponseValidator.prototype.validateResponseDocument = function (doc) {
    
    // ensure that exactly one response node is present
    const responseNodes = select("//samlp:Response", doc);
    if (responseNodes.length != 1) {
        this.addError("Document must contain exactly one Response node");
        return Promise.resolve();
        // nothing left to do
    }
    
    const responseNode = responseNodes[0];
    
    // check destination
    const destination = responseNode.getAttribute("Destination");
    const endpoints = protocolBindings.expandBindings(this.sp.endpoints);
    const validDestinations =[
    endpoints.assert.redirect,
    endpoints.assert.post].filter(ep => ep);
    if (validDestinations.indexOf(destination) == -1) {
        this.addError("Response destination is invalid");
    }
    
    // check optional issuer element outside Assertion
    const issuer = select("saml:Issuer/text()", responseNode).toString();
    if (issuer && issuer !== this.idp.entityID) {
        this.addError("Issuer element does not match IDP's entity ID");
    }
    
    // validate InResponseTo to ensure it matches a request we sent.
    // this operation is asynchronous, so we return a promise of
    // completion
    const inResponseTo = responseNode.getAttribute("InResponseTo");
    const requireInResponseTo = (this.sp.extendedRequirements || {
    }).InResponseTo;
    
    return Promise.resolve().then(() => {
        if (inResponseTo || requireInResponseTo) {
            return this.verifyInResponseTo(inResponseTo, this.idp). catch (() => {
                this.addError("invalid InResponseTo in Response node");
            });
        }
    }).then(() => {
        const assertion = select("saml:Assertion", responseNode)[0];
        if (! assertion) {
            this.addError("no Assertion in response");
        } else {
            return this.validateAssertion(assertion);
        }
    });
};

/**
 * Validates an Assertion
 * @param assertion: an SAML Assertion node
 * @return: a promise chain
 */
ResponseValidator.prototype.validateAssertion = function (assertion) {
    
    // ensure that the assertion came from the right place
    // unlike the parent document's Issuer, this Issuer element is REQUIRED
    const issuer = select("saml:Issuer/text()", assertion).toString();
    if (issuer != this.idp.entityID) {
        this.addError("Issuer does not match IDP's entity ID");
    }
    
    // run the rest of the validations, return the resulting promise chain
    return Promise.all([
    this.validateSubjectConfirmation(assertion),
    this.validateConditions(assertion),
    this.validateAuthnStatement(assertion)]);
};

/**
 * Validates a SubjectConfirmation node inside an assertion. According to the
 * proticol, there can be more than one. Most implementations only produce
 * one in reality.
 * @param assertion: Assertion element on which to validate the confirmation
 * @return: a promise chain
 */
ResponseValidator.prototype.validateSubjectConfirmation = function (assertion) {
    
    const subjectConfirmation = select("//saml:SubjectConfirmation", assertion)[0];
    if (! subjectConfirmation) {
        this.addError("no SubjectConfirmation in Assertion");
        return Promise.resolve();
    }
    
    const method = subjectConfirmation.getAttribute("Method");
    if (method != "urn:oasis:names:tc:SAML:2.0:cm:bearer") {
        this.addError("subject confirmation method must be bearer");
    }
    
    const data = select("//saml:SubjectConfirmationData", subjectConfirmation)[0];
    if (! data) {
        this.addError("subject confirmation does not contain a data element");
        return Promise.resolve();
    }
    
    const recipient = data.getAttribute("Recipient");
    const notOnOrAfter = data.getAttribute("NotOnOrAfter");
    const inResponseTo = data.getAttribute("InResponseTo");
    
    const extendedRequirements = this.sp.extendedRequirements || {
    };
    
    if (recipient) {
        
        const endpoints = protocolBindings.expandBindings(this.sp.endpoints);
        const validRecipients =[
        endpoints.assert.redirect,
        endpoints.assert.post].filter(ep => ep);
        
        if (validRecipients.indexOf(recipient) == -1) {
            this.addError("SubjectConfirmationData.Recipient is not valid");
        }
    } else {
        if (extendedRequirements.Recipient) {
            this.addError("SubjectConfirmationData.Recipient is required");
        }
    }
    
    if (notOnOrAfter) {
        if (new Date(notOnOrAfter) <= this.getNow()) {
            this.addError("SubjectConfirmationData.NotOnOrAfter is in the past");
        }
    } else {
        if (extendedRequirements.NotOnOrAfter) {
            this.addError("SubjectConfirmationData.NotOnOrAfter is required");
        }
    }
    
    if (inResponseTo) {
        
        // verify InResponseTo, return chain
        return this.verifyInResponseTo(inResponseTo). catch (() => {
            this.addError("SubjectConfirmationData.InResponseTo is not valid");
        });
    } else {
        if (extendedRequirements.InResponseTo) {
            this.addError("SubjectConfirmationData.InResponseTo is required");
        }
    }
};

/**
 * Validates InResponseTo attribute - should be the same across all instances
 * in the request, and correspond to an issued AuthnRequest. This wraps the
 * model's implementation in a cache.
 * @param id: ID to check
 * @return a promise which will resolve if the ID was issued against this IDP
 */
ResponseValidator.prototype.verifyInResponseTo = function (id) {
    if (this.inResponseToChecked) {
        if (this.inResponseTo && (this.inResponseTo == id)) {
            return Promise.resolve();
        } else {
            return Promise.reject();
        }
    } else {
        return this.model.verifyRequestID(id, this.idp).then(() => {
            this.inResponseToChecked = true;
            this.inResponseTo = id;
        });
    }
};

/**
 * Assertion conditions validation
 * @param assertion: SAML assertion node
 * @return: a promise chain
 */
ResponseValidator.prototype.validateConditions = function (assertion) {
    
    let responseLatencyInSecs = 0;
    
    if (this.idp)
    responseLatencyInSecs = this.idp.responseLatencyInSecs || 0;
    
    // extract Conditions statement and process it if it exists
    const conditions = select("//saml:Conditions", assertion)[0];
    
    if (! conditions) {
        this.addError("no Conditions in Assertion");
        return Promise.resolve();
    }
    
    let notBefore = moment(conditions.getAttribute("NotBefore"));
    let notOnOrAfter = moment(conditions.getAttribute("NotOnOrAfter"));
    
    const now = moment(this.getNow());
    
    if (responseLatencyInSecs > 0) {
        notBefore.subtract(responseLatencyInSecs, "seconds");
        notOnOrAfter.add(responseLatencyInSecs, "seconds");
    }
    
    if (notBefore) {
        if (notBefore > now) {
            this.addError("Conditions.NotBefore is in the future");
        }
    }
    
    if (notOnOrAfter) {
        if (notOnOrAfter <= now) {
            this.addError("Conditions.NotOnOrAfter is in the past");
        }
    }
    
    const audienceRestriction = select("saml:AudienceRestriction", conditions)[0];
    if (audienceRestriction) {
        const resolvedEntityID = urlParse(this.sp.entityID).href;
        const audiences = select("saml:Audience", audienceRestriction);
        const matchesAudience = audiences.some(audience => {
            const resolvedAudienceURI = urlParse(audience.textContent || "").href;
            return resolvedAudienceURI == resolvedEntityID;
        });
        if (! matchesAudience) {
            this.addError("Conditions.AudienceRestriction.Audience does not match the service provider");
        }
    }
    
    return Promise.resolve();
};

/**
 * Validates the presence of an AuthnStatement
 * @param assertion: Assertion node
 * @return: promise chain
 */
ResponseValidator.prototype.validateAuthnStatement = function (assertion) {
    
    const authnStatements = select("//saml:AuthnStatement", assertion);
    if (authnStatements.length === 0) {
        this.addError("Assertion must contain at least one AuthnStatement");
    }
    
    return Promise.resolve();
};


/**
 * XML signature validatior - accepts the raw XML instance and parsed XML
 * document for performance reasons. This gets called before and after
 * assertion decryption of the Response and Assertion as-necessary;
 * as per SAML 2.0 Core - subheading 6.2 "Combining Signatures and Encryption",
 * signed and encrypted assertions must be signed first and then encrypted - but
 * the parent Request object may also be signed, which can only be performed
 * once the assertion subdocument is encrypted. Therefore, this method is
 * optimized to facilitate the following flow:
 *
 * 1) check for and validate a top-level document signature
 * 2) decrypt any encrypted assertions
 * 3) check for and validate assertion signatures
 *
 * @param xml: raw XML document string
 * @param node: parsed XML document node upon which to validate signatures
 * @param cert: certificate to use for validation
 */
ResponseValidator.prototype.validateAllSignatures = function (xml, node) {
    
    const signatures = select("//ds:Signature", node);
    const creds = credentials.getCredentialsFromEntity(this.idp, "signing");
    
    // no signatures = no problem, we'll deal with response.numSignatures and
    // its implications in the parent function.
    if (signatures.length == 0) {
        return;
    }
    
    // validate all the sigs - there are edge cases where we have more than one!
    signatures.forEach(sig => {
        let sigValid = false;
        creds.forEach(credential => {
            const validationErrors = signing.validateXMLSignature(xml, sig, credential);
            if (! validationErrors) {
                sigValid = true;
            }
        });
        if (sigValid) {
            this.hasValidSignature = true;
        } else {
            this.addError("unable to validate signature");
        }
    });
    
    return;
};

/**
 * Signature requirement validator - adds an error if the SP is configured
 * to require signatures and no valid signatures have been encountered.
 */
ResponseValidator.prototype.validateSignatureRequirement = function () {
    if (this.sp.requireSignedResponses && ! this.hasValidSignature) {
        this.addError("no valid signature in request");
    }
};