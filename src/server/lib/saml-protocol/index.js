"use strict";

const errors = require("./errors");
const metadata = require("./metadata");
const requestConstruction = require("./request-construction");
const requestHandling = require("./request-handling");
const responseConstruction = require("./response-construction");
const responseHandling = require("./response-handling");
const protocolBindings = require("./protocol-bindings");

module.exports = {
    ServiceProvider,
    IdentityProvider,
    errors
};

function ServiceProvider (config, model) {
    this.sp = config;
    this.model = model;
}

function IdentityProvider (config, model) {
    this.idp = config;
    this.model = model;
}

ServiceProvider.prototype.produceAuthnRequest = function (idp) {
    return requestConstruction.createBoundAuthnRequest(this.sp, idp, this.model);
};

ServiceProvider.prototype.consumePostResponse = function (formParams) {
    const response = protocolBindings.getDataFromPostBinding(formParams);
    return responseHandling.processResponse(this.model, this.sp, response);
};

ServiceProvider.prototype.consumeRedirectResponse = function (queryParams) {
    const response = protocolBindings.getDataFromRedirectBinding(queryParams);
    return responseHandling.processResponse(this.model, this.sp, response);
};

ServiceProvider.prototype.produceSPMetadata = function (shouldSign) {
    return metadata.buildSPMetadata(this.sp, (shouldSign === undefined) ? true: shouldSign);
};

ServiceProvider.prototype.getIDPFromMetadata = function (xml) {
    return metadata.getIDPFromMetadata(xml);
};

IdentityProvider.prototype.consumePostAuthnRequest = function (formParams) {
    const request = protocolBindings.getDataFromPostBinding(formParams);
    return requestHandling.processAuthnRequest(this.model, this.idp, request);
};

IdentityProvider.prototype.consumeRedirectAuthnRequest = function (queryParams) {
    const request = protocolBindings.getDataFromRedirectBinding(queryParams);
    return requestHandling.processAuthnRequest(this.model, this.idp, request);
};

IdentityProvider.prototype.produceSuccessResponse = function (sp, inResponseTo, nameID, attributes) {
    return responseConstruction.buildBoundSuccessResponse(sp, this.idp, this.model, inResponseTo, nameID, attributes);
};

IdentityProvider.prototype.produceFailureResponse = function (sp, inResponseTo, errorMessage) {
    return responseConstruction.buildBoundAuthnFailureResponse(sp, this.idp, this.model, inResponseTo, errorMessage);
};

IdentityProvider.prototype.produceIDPMetadata = function (shouldSign) {
    return metadata.buildIDPMetadata(this.idp, (shouldSign === undefined) ? true: shouldSign);
};

IdentityProvider.prototype.getSPFromMetadata = function (xml) {
    return metadata.getSPFromMetadata(xml);
};