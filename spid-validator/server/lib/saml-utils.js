const samlProtocol = require("./saml-protocol/protocol-bindings");
const errors = require("./saml-protocol/errors");
const namespaces = require("./saml-protocol/namespaces");
const xmldom = require("xmldom");
const xpath = require("xpath");
const DOMParser = xmldom.DOMParser;
const select = xpath.useNamespaces(namespaces);

const path = require("path");
const fs = require("fs");


function TestSuite(config_idp, config_test) {
    this.config = {
        idp: config_idp,
        test: config_test
    } 
}

TestSuite.prototype.getTestTemplate = function(testsuiteId, testcaseId, userParams) {
    
    let testsuite = this.config.test[testsuiteId];
    let testcase = testsuite.cases[testcaseId];
    let template = fs.readFileSync(testsuite.path, "utf8");
    let params = [];
    
    let compiled = template;

    // Compile response template from config data
    compiled.match(/{{\s*[\w\.]+\s*}}/g).map((e) => {
        eKey = e.replace("{{", "").replace("}}", "");

        let userParam = userParams.filter((p)=> { return (p.key==eKey) })[0];
        let eVal = (userParam!=null)? userParam.val : null;
        
        if (eVal == null) eVal = testcase.response[eKey];
        if (eVal == null) eVal = testsuite.response[eKey];
        if (eVal == null) eVal = "";

        if(eKey=="Attributes") {
            let attributesCompiled = "";
            for(let attributeName in eVal) {
                
                // override value from fontend
                userParam = userParams.filter((p)=> { return (p.key==attributeName) })[0];
                let userVal = (userParam!=null)? userParam.val : eVal[attributeName];
                let attributeVal = userVal;

                if(attributeVal!=null) {
                    attributesCompiled += " \
                        <saml:Attribute Name=\"" + attributeName + "\" NameFormat=\"urn:oasis:names:tc:SAML:2.0:attrname-format:basic\"> \
                            <saml:AttributeValue xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" \
                                xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:type=\"xs:string\">"
                                    + attributeVal +
                            "</saml:AttributeValue> \
                        </saml:Attribute> \
                    ";
                }

                // if params not yet contains param
                if(params.filter((p)=> {
                    return (p.key == attributeName);
                }).length == 0) {
                    params.push({ "key": attributeName, "val": attributeVal, "attribute": true });
                }
            }         
            
            compiled = compiled.replace("{{Attributes}}", attributesCompiled);  

        } else {
            compiled = compiled.replaceAll(e, eVal);

            // if params not yet contains param
            if(params.filter((p)=> {
                return (p.key == eKey);
            }).length == 0) {
                params.push({ "key": eKey, "val": eVal, "attribute": false });
            }
        }
    });
    
    return {
        description: testsuite.description,
        template: template,
        params: params,
        compiled: compiled
    };
};

TestSuite.prototype.getDestination = function(testsuiteId) {
    let testsuite = this.config.test[testsuiteId];
    let destination = testsuite.response.AssertionConsumerURL;
    return destination;
};


function PayloadDecoder() {}

PayloadDecoder.decode = function(payload) {
    let xml = samlProtocol.decodeXMLPayload(payload);
    return xml;
}

function RequestParser(xml) {
    this.request = {
        xml: xml
    }
}

RequestParser.prototype.isAuthnRequest = function() {
    let isAuthnRequest = false;
    let doc = new DOMParser().parseFromString(this.request.xml);
    let request = select("//samlp:AuthnRequest", doc);
    if(request.length>0) isAuthnRequest = true;
    return isAuthnRequest;
}

RequestParser.prototype.isLogout = function() {
    let isLogout = false;
    let doc = new DOMParser().parseFromString(this.request.xml);
    let request = select("//samlp:LogoutRequest", doc);
    if(request.length>0) isLogout = true;
    return isLogout;
}

RequestParser.prototype.ID = function() {
    let doc = new DOMParser().parseFromString(this.request.xml);
    let requestID = select("//samlp:AuthnRequest", doc)[0].getAttribute("ID");
    return requestID;
}

RequestParser.prototype.IssueInstant = function() {
    let doc = new DOMParser().parseFromString(this.request.xml);
    let requestIssueInstant = select("//samlp:AuthnRequest", doc)[0].getAttribute("IssueInstant");
    return requestIssueInstant;
}

RequestParser.prototype.AuthnContextClassRef = function() {
    let doc = new DOMParser().parseFromString(this.request.xml);
    let requestAuthnContextClassRef = select("string(//samlp:AuthnRequest/samlp:RequestedAuthnContext/saml:AuthnContextClassRef)", doc);
    return requestAuthnContextClassRef;
}

RequestParser.prototype.AssertionConsumerServiceURL = function() {
    let doc = new DOMParser().parseFromString(this.request.xml);
    let requestAssertionConsumerServiceURL = select("//samlp:AuthnRequest", doc)[0].getAttribute("AssertionConsumerServiceURL");
    return requestAssertionConsumerServiceURL;
}

module.exports.TestSuite = TestSuite;
module.exports.RequestParser = RequestParser;
module.exports.PayloadDecoder = PayloadDecoder;
