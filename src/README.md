# SPID Validator 

SPID Validator is a tool that lets you inspect and debug SAML authentication requests from Service Provider and send custom responses back to Service Provider to check SPID compliance. It includes a Node.js web application that provides an easy to use interface and an extension for Google Chrome that intercepts the request.

Spid Validator has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

## How to buld with Docker

```
$ docker build -t spid-validator .
```

## How to run with Docker

```
$ docker run -d -p 8080:8080 spid-validator
```

## How to install Google Chrome extension
- Go to **chrome://extensions/** and check the box for Developer mode in the top right.
- Click the Load unpacked extension button and select the folder 'chrome-extension' to install it
