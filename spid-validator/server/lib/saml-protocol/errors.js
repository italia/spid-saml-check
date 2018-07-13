"use strict";

/**
 * Errors thrown when one or more conditions invalidated an assertion
 * or request. Groups an array of validation errors.
 */
class ValidationError extends Error {
    constructor (message, errors, sp, idp, payload) {
        super (message);
        
        this.message = message;
        this.errors = errors ||[message];
        
        // add extended debug data in function bindings in case anyone's error
        // handler tries to serialize one of these.
        this.getSP = function () {
            return sp;
        };
        this.getIDP = function () {
            return idp;
        };
        this.getPayload = function () {
            return payload;
        };
    }
}

/**
 * Errors thrown when an issue completely prevents the SAML protocol from
 * functioning - primairly entity configuration.
 */
class ProtocolError extends Error {
    constructor (message, sp, idp, payload) {
        super (message);
        
        // add extended debug data in function bindings in case anyone's error
        // handler tries to serialize one of these.
        this.getSP = function () {
            return sp;
        };
        this.getIDP = function () {
            return idp;
        };
        this.getPayload = function () {
            return payload;
        };
    }
}

/**
 * Thrown when an IDP rejects an auth request
 */
class RejectionError extends Error {
    constructor (message, sp, idp, payload) {
        super (message);
        
        // add extended debug data in function bindings in case anyone's error
        // handler tries to serialize one of these.
        this.getSP = function () {
            return sp;
        };
        this.getIDP = function () {
            return idp;
        };
        this.getPayload = function () {
            return payload;
        };
    }
}

module.exports = {
    ValidationError,
    ProtocolError,
    RejectionError
};