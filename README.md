# SPID SAML Check

SPID SAML Check is a tool that lets you to performs some tests on Service Provider, as inspect requests shipped to the IdP, check metadata compliance and send custom responses back to SP. It includes a tool based on Tox (specs-compliance-tests) to check the SPID specifications compliance, a Node.js web application (spid-validator) that provides an easy to use interface and an extension for Google Chrome that interceps the request.

SPID SAML Check has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

## How to buld with Docker

```
$ docker buld -t spid-saml-check .
```

## How to run with Docker

```
$ docker run -t -i -p 8080:8080 spid-saml-check
```

## How to install Google Chrome extension
- Go to **chrome://extensions/** and check the box for Developer mode in the top right.
- Click the Load unpacked extension button and select the folder 'spid-validator/chrome-extension' to install it

