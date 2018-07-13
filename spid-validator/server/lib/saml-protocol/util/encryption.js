"use strict";

const xpath = require("xpath");
const xmldom = require("xmldom");
const xmlenc = require("xml-encryption");

const credentials = require("./credentials");
const pemFormatting = require("./pem-formatting");

const namespaces = require("../namespaces");

const DOMParser = xmldom.DOMParser;
const XMLSerializer = xmldom.XMLSerializer;
const select = xpath.useNamespaces(namespaces);

// these are the encryption algorithms supported by xml-encryption
const supportedAlgorithms = {
    encryption:[
    "http://www.w3.org/2001/04/xmlenc#aes128-cbc",
    "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
    "http://www.w3.org/2001/04/xmlenc#tripledes-cbc"],
    keyEncryption:[
    "http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p",
    "http://www.w3.org/2001/04/xmlenc#rsa-1_5"]
};

const defaultAlgorithms = {
    encryption: "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
    keyEncryption: "http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p"
};

module.exports = {
    decryptAssertion,
    encryptAssertion,
    decryptData,
    encryptData,
    supportedAlgorithms
};

/**
 * Mutates a SAML document, converting an EncryptedAssertion into an Assertion
 * if one is present.
 * @param doc: XML document to operate upon
 * @param credential: an array of credential objects containing private keys
 */
function decryptAssertion(doc, credentials) {
    
    const encryptedAssertion = select("//saml:EncryptedAssertion", doc)[0];
    
    // bail if there's nothing to do
    if (! encryptedAssertion) {
        return Promise.resolve(doc);
    }
    
    // find and the encrypted data node - xmlenc can accept this directly
    const encryptedDataNode = select("//*[local-name(.)='EncryptedData']", encryptedAssertion)[0];
    const encryptedDataStr = new XMLSerializer().serializeToString(encryptedDataNode);
    
    // decrypt the XML - this will be a string
    return decryptData(encryptedDataStr, credentials).then(decryptedXml => {
        
        // deserialize the assertion and mutate the document
        const newAssertionDoc = new DOMParser().parseFromString(decryptedXml, namespaces.saml);
        const assertion = select("//*[local-name(.)='Assertion']", newAssertionDoc)[0];
        encryptedAssertion.parentNode.replaceChild(assertion, encryptedAssertion);
        
        // we have to do another serialize/deserialize pass to get the
        // subdocument to respect the parent's namespaces
        const newDocXML = new XMLSerializer().serializeToString(doc);
        const newDoc = new DOMParser().parseFromString(newDocXML);
        return newDoc;
    });
}

/**
 * Mutates a SAML document, converting an Assertion into an EncryptedAssertion.
 * @param doc: an SAML document
 * @param credential: a credential object containing a public_key and certificate
 * @param alogrithms: optional specifier to set encryption algorithms
 */
function encryptAssertion(doc, credential, algorithms) {
    
    // get the assertion body (there can only be one) as a string.
    const assertion = select("//saml:Assertion", doc)[0];
    const assertXml = new XMLSerializer().serializeToString(assertion);
    
    // encrypt the XML payload
    return encryptData(assertXml, credential, algorithms).then(encryptedData => {
        
        // cobble together the EncryptedAssertion node as a string and parse
        const encTagName = "saml:EncryptedAssertion";
        const encAssertString = ` < $ {
            encTagName
        } > $ {
            encryptedData
        } < / $ {
            encTagName
        } > `;
        const encryptedAssertion = new DOMParser().parseFromString(encAssertString);
        
        // replace the assertion with the encrypted node
        doc.replaceChild(encryptedAssertion, assertion);
        
        return doc;
    });
}

/**
 * @param encryptedData: encrypted XML node
 * @param credential: array of credentials containing private keys
 * @return a promise of decrypted data
 */
function decryptData(encryptedData, credentials) {
    
    // we're working with an asynchronous decryption library,
    // so reduce the credentials array using a rejection chain which
    // ends after the first resolution
    return credentials.reduce(function (chain, credential) {
        return chain. catch (function () {
            
            // promise => decryption or bust
            return new Promise(function (resolve, reject) {
                const decryptOptions = {
                    key: credential.privateKey
                };
                xmlenc.decrypt(
                encryptedData,
                decryptOptions,
                function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        });
    },
    Promise.reject("No decryption credentials"));
}

/**
 * @param data: XML node to encrypt
 * @param credential: credential to use for encryption - may optionally
 * include a publicKey attribute, but will infer one from the certificate
 * attribute otherwise.
 * @param algorithms: optional specifier to set algorithms
 * @return a promise of encrypted data
 */
function encryptData(data, credential, algorithms) {
    return new Promise(function (resolve, reject) {
        const algs = algorithms || {
        };
        
        // ensure PEM headers are present on the credential
        const certificate = pemFormatting.addPEMHeaders("CERTIFICATE", credential.certificate);
        
        // resolve public key
        let publicKey = credential.publicKey;
        if (! publicKey) {
            // only invoke if publicKey attribute is not present for performance
            publicKey = credentials.getPublicKeyFromCertificate(certificate);
        }
        
        const encryptOptions = {
            encryptionAlgorithm: algs.encryption || defaultAlgorithms.encryption,
            // xmlenc's API spells this this way :(
            keyEncryptionAlgorighm: algs.keyEncryption || defaultAlgorithms.keyEncryption,
            pem: certificate,
            rsa_pub: publicKey
        };
        xmlenc.encrypt(data, encryptOptions, function (err, result) {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
}