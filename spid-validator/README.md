# SPID Validator 

SPID Validator is a tool that lets you to inspect and debug SAML  authentication requests from SP and send custom responses back to SP to test SPID compliance. It includes an extension for Google Chrome that interceps the request and a Node.js web application that provides an easy to use interface.

Spid Validator has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

## How to buld with Docker

```
$ docker buld -t spid-validator .
```

## How to run with Docker

```
$ docker run -d -p 8080:8080 spid-validator
```

## How to install Google Chrome extension
- Go to **chrome://extensions/** and check the box for Developer mode in the top right.
- Click the Load unpacked extension button and select the folder 'chrome-extension' to install it
