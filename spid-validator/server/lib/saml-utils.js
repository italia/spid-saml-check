const samlProtocol = require("./saml-protocol/protocol-bindings");
const errors = require("./saml-protocol/errors");
const namespaces = require("./saml-protocol/namespaces");
const saml = require("./saml-protocol");
const xmldom = require("xmldom");
const xpath = require("xpath");
const DOMParser = xmldom.DOMParser;
const select = xpath.useNamespaces(namespaces);

const path = require("path");
const fs = require("fs");


class TestSuite {

    constructor(config_idp, config_test) {
        this.config = {
            idp: config_idp,
            test: config_test
        } 
    }

    getTestTemplate(testsuiteId, testcaseId, requestedAttributes, defaultParams, userParams) {
        
        let testsuite = this.config.test[testsuiteId];
        let testcase = testsuite.cases[testcaseId];
        let template = fs.readFileSync(testcase.path, "utf8");
        let attributesNameFormat = (testcase.attributesNameFormat!=null)? testcase.attributesNameFormat:true;
        let params = [];
        
        let compiled = template;

        // Compile response template from config data
        compiled.match(/{{\s*[\w\.]+\s*}}/g).map((e) => {
            let eKey = e.replace("{{", "").replace("}}", "");

            let eVal = null;

            let defaultParam = defaultParams.filter((p)=> { return (p.key==eKey) })[0];
            let userParam = userParams.filter((p)=> { return (p.key==eKey) })[0];

            eVal = (defaultParam!=null)? defaultParam.val : null;
            eVal = (testsuite.response[eKey]!=null && testsuite.response[eKey]!="")? testsuite.response[eKey] : eVal;
            eVal = (testcase.response[eKey]!=null && testcase.response[eKey]!="")? testcase.response[eKey] : eVal;
            eVal = (userParam!=null)? userParam.val : eVal;

            if (eVal == null) eVal = "";
            
            if(eKey=="Attributes") {
                let attributesCompiled = "";
                for(let attributeName in eVal) {
                    
                    // override value from fontend
                    userParam = userParams.filter((p)=> { return (p.key==attributeName) })[0];
                    let userVal = (userParam!=null)? userParam.val : eVal[attributeName];
                    let attributeVal = userVal;

                    // requestedAttributs === true for all, or array for selected
                    if(requestedAttributes===true ||
                        requestedAttributes.indexOf(attributeName)>-1 ||
                        userParam!=null) {

                        if(attributeVal!=null) {
                            attributesCompiled += " \
                                <saml:Attribute Name=\"" + attributeName + "\" ";
                                    if(attributesNameFormat) attributesCompiled += " NameFormat=\"urn:oasis:names:tc:SAML:2.0:attrname-format:basic\"";
                                    attributesCompiled += "> \
                                    <saml:AttributeValue xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" \
                                        xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:type=\"xs:string\">"
                                            + attributeVal +
                                    "</saml:AttributeValue> \
                                </saml:Attribute> \
                            ";
                        }

                    } else {
                        attributeVal = null;
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
            testsuite: testsuite.description,
            name: testcase.name,
            description: testcase.description,
            template: template,
            params: params,
            compiled: compiled,
            sign_response: testcase.sign_response,
            sign_assertion: testcase.sign_assertion,
            sign_credentials: testcase.sign_credentials
        };
    };

    getDestination(testsuiteId) {
        let testsuite = this.config.test[testsuiteId];
        let destination = testsuite.response.AssertionConsumerURL;
        return destination;
    };
}




class PayloadDecoder {

    static decode(payload) {
        let xml = samlProtocol.decodeXMLPayload(payload);
        return xml;
    }
}



class MetadataParser {

    constructor(xml) {
        this.metadata = {
            xml: xml
        }
    }

    getServiceProviderEntityId() {
        let doc = new DOMParser().parseFromString(this.metadata.xml);
        let serviceProviderEntityId = select("//md:EntityDescriptor", doc)[0].getAttribute("entityID");
        return serviceProviderEntityId;
    }

    getAssertionConsumerServiceURL(index) {
        let assertionConsumerServiceURL = null;
        let doc = new DOMParser().parseFromString(this.metadata.xml);
        let acs = select("//md:EntityDescriptor/md:SPSSODescriptor/md:AssertionConsumerService", doc);
        for(let i in acs) {
            let acsIndex = acs[i].getAttribute("index");
            let acsIsDefault = acs[i].getAttribute("isDefault");
            let acsLocation = acs[i].getAttribute("Location");
            if(index==acsIndex) {
                assertionConsumerServiceURL = acsLocation;
                break;
            }
        }
        return assertionConsumerServiceURL;
    }

    getSingleLogoutServiceURL() {
        let singleLogoutServiceURL = [];
        let doc = new DOMParser().parseFromString(this.metadata.xml);
        let slo = select("//md:EntityDescriptor/md:SPSSODescriptor/md:SingleLogoutService", doc);
        for(let i in slo) {
            let sloLocation = slo[i].getAttribute("Location");
            singleLogoutServiceURL.push(sloLocation);
        }
        return singleLogoutServiceURL;
    }

    getAttributeConsumingService(index) {
        let attributeConsumingService = {ServiceName: "", RequestedAttributes:[]};
        let doc = new DOMParser().parseFromString(this.metadata.xml);
        let acs = select("//md:EntityDescriptor/md:SPSSODescriptor/md:AttributeConsumingService", doc);
        for(let i in acs) {
            let acsIndex = acs[i].getAttribute("index");
            if(index==acsIndex) {
                let serviceName = select("string(//md:ServiceName)", acs[i]);
                let attributes = select("md:RequestedAttribute", acs[i]);
                attributeConsumingService.ServiceName = serviceName;
                for(let j in attributes) {
                    let friendlyName = attributes[j].getAttribute("FriendlyName");
                    let name = attributes[j].getAttribute("Name");
                    attributeConsumingService.RequestedAttributes.push({FriendlyName: friendlyName, Name: name});
                }
                break;
            }
        }
        return attributeConsumingService;
    }
}


class RequestParser {

    constructor(xml) {
        let isAuthnRequest = false;
        let isLogout = false;

        let doc = new DOMParser().parseFromString(xml);
        if(select("//samlp:AuthnRequest", doc).length>0) isAuthnRequest = true;
        if(select("//samlp:LogoutRequest", doc).length>0) isLogout = true

        let type = 0;   // 0: unknown, 1: AuthnRequest, 2: Logout

        if(isAuthnRequest) type = 1;
        else if(isLogout) type = 2;

        this.request = {
            xml: xml,
            type: type
        }
    }

    isAuthnRequest() { return (this.request.type==1)? true : false; }
    isLogoutRequest() { return (this.request.type==2)? true : false; }

    ID() {
        let samlp = (this.request.type==1)? "AuthnRequest" : "LogoutRequest";
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestID = select("//samlp:" + samlp, doc)[0].getAttribute("ID");
        return requestID;
    }

    IssueInstant() {
        let samlp = (this.request.type==1)? "AuthnRequest" : "LogoutRequest";
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestIssueInstant = select("//samlp:" + samlp, doc)[0].getAttribute("IssueInstant");
        return requestIssueInstant;
    }

    Issuer() {
        let samlp = (this.request.type==1)? "AuthnRequest" : "LogoutRequest";
        let doc = new DOMParser().parseFromString(this.request.xml);
        let issuer = select("string(//samlp:" + samlp + "/saml:Issuer)", doc);
        return issuer;
    }

    AuthnContextClassRef() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAuthnContextClassRef = select("string(//samlp:AuthnRequest/samlp:RequestedAuthnContext/saml:AuthnContextClassRef)", doc);
        return requestAuthnContextClassRef;
    }

    AssertionConsumerServiceURL() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAssertionConsumerServiceURL = select("//samlp:AuthnRequest", doc)[0].getAttribute("AssertionConsumerServiceURL");
        return requestAssertionConsumerServiceURL;
    }

    AssertionConsumerServiceIndex() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAssertionConsumerServiceIndex = select("//samlp:AuthnRequest", doc)[0].getAttribute("AssertionConsumerServiceIndex");
        return requestAssertionConsumerServiceIndex;
    }

    AttributeConsumingServiceIndex() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAttributeConsumingServiceIndex = select("//samlp:AuthnRequest", doc)[0].getAttribute("AttributeConsumingServiceIndex");
        return requestAttributeConsumingServiceIndex;
    }
}

class IdPModel { 
    /*
    getServiceProvider(entityID) {
	    return new Promise(function (resolve, reject) {
		    try {
			    resolve(getMetadataSP(entityID));
		    } catch(e) {
			    reject("ERROR");
		    }
	    }
    );
    */
}


class IdP {
    constructor(idpConfig) {
        this.idp = new saml.IdentityProvider(idpConfig, new IdPModel());
    }
    
    getMetadata() {
        return this.idp.produceIDPMetadata(true);
    }
}


module.exports.TestSuite = TestSuite;
module.exports.MetadataParser = MetadataParser;
module.exports.RequestParser = RequestParser;
module.exports.PayloadDecoder = PayloadDecoder;
module.exports.IdP = IdP;
