# SPID SAML Check

SPID SAML Check is a tool that performs some tests on Service Providers, as inspecting requests shipped to an Identity Provider, checking metadata compliance and sending custom responses back to Service Provider. It includes a tool based on Tox (specs-compliance-tests) to check the SPID specifications compliance, a Node.js web application (spid-validator) that provides an easy to use interface and an extension for Google Chrome that intercepts the request.

SPID SAML Check has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

## How to build with Docker

```
$ docker build -t spid-saml-check .
```

## How to run with Docker

```
$ docker run -t -i -p 8080:8080 spid-saml-check
```

## How to access to SPID Validator

Retrieve metadata of Validator at http://localhost:8080/metadata.xml and configure it on your service provider as a new IdP.

Send an AuthnRequest to Validator from your service provider and login on Validator with following credentials:

Username: validator

Password: validator


