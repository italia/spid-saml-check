**Per le istruzioni in Italiano, cliccare [qui](README.it.md).**

# *SPID SAML Check*

*SPID SAML Check* is a tool that performs some tests on Service Providers, as inspecting requests shipped to an Identity Provider, checking metadata compliance and sending custom responses back to Service Provider. It includes a tool based on Tox (_`specs-compliance-tests`_) to check the SPID specifications compliance, a Node.js web application (_`spid-validator`_) that provides an easy to use interface and an extension for Google Chrome that intercepts the request.

*SPID SAML Check* has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

## How to build with Docker

```
$ docker build -t spid-saml-check .
```

## How to run with Docker

```
$ docker run -t -i -p 8080:8080 spid-saml-check
```

## How to use it as a *SPID Validator*

The Node.js application, if invoked as a web application *as is*, provides "basic", formal validation of a Service Provider's SAML metadata.

In order to unleash the **full** set of SPID compliance tests (the proper *SPID Validator*), retrieve the metadata of *SPID Validator* at http://localhost:8080/metadata.xml and configure it on as a new Identity Provider (IdP) under your Service Provider (SP) implementation.

When used in this fashion, the *SPID Validator* can be invoked as an IdP from your SP, listing 300+ individual controls, divided into 7 families:
 * 4 families for the formal validation of the SP **metadata** (already described);
 * 3 families for the formal validation of the SP's SAML **request**;
 * 1 family (111 controls) for *interactively* validating the SP behaviour to SAML **response**s from IdP's.

To use the *SPID Validator* the AuthnRequest are thus sent from your SP, loggin in to Validator with following credentials:

   Username: validator

   Password: validator

