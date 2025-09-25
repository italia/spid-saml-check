const samlProtocol = require("./saml-protocol/protocol-bindings");
const errors = require("./saml-protocol/errors");
const namespaces = require("./saml-protocol/namespaces");
const saml = require("./saml-protocol");
const xmldom = require("@xmldom/xmldom");
const xpath = require("xpath");
const DOMParser = xmldom.DOMParser;
const zlib = require("zlib");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jose = require('node-jose');
const moment = require('moment');

const select = xpath.useNamespaces({
    ...namespaces, 
    "spid": "https://spid.gov.it/saml-extensions"
});



class TestSuite {

    constructor(config_idp, config_test) {
        this.config = {
            idp: config_idp,
            test: config_test
        } 
    }

    // get param from user customized input 
    // or from testsuite config 
    // or testcase config 
    // or from defaults
    getActualParam(pKey, userParams, testsuiteParams, testcaseParams, defaultParams) {
        let defaultParam = defaultParams.filter((p)=> { return (p.key==pKey) })[0];
        let userParam = userParams.filter((p)=> { return (p.key==pKey) })[0];

        let pVal = null;
        pVal = (defaultParam!=null)? defaultParam.val : null;
        pVal = (testsuiteParams!=null && testsuiteParams[pKey]!=null && testsuiteParams[pKey]!="")? testsuiteParams[pKey] : pVal;
        pVal = (testcaseParams!=null && testcaseParams[pKey]!=null && testcaseParams[pKey]!="")? testcaseParams[pKey] : pVal;
        pVal = (userParam!=null)? userParam.val : pVal;

        return pVal;
    }

    async getTestTemplate(testsuiteId, testcaseId, requestedAttributes, defaultParams, userParams) {
        
        let testsuite = this.config.test[testsuiteId];
        let testcase = testsuite.cases[testcaseId];
        let template = fs.readFileSync(testcase.path, "utf8");
        let attributesNameFormat = (testcase.attributesNameFormat!=null)? testcase.attributesNameFormat:true;
        let params = [];
        
        let compiled = template;

        // Compile response template from config data
        const compiledPromises = compiled.match(/{{\s*[\w\.]+\s*}}/g).map(async(e) => {
            let eKey = e.replace("{{", "").replace("}}", "");
            let eVal = this.getActualParam(eKey, userParams, testsuite.response, testcase.response, defaultParams);
            if (eVal == null) eVal = "";
            
            if(eKey=="Attributes") {
                let attributesCompiled = "";
                for(let attributeName in eVal) {
                    
                    // override value from frontend
                    let userParam = userParams.filter((p)=> { return (p.key==attributeName) })[0];
                    let userVal = (userParam!=null)? userParam.val : eVal[attributeName];
                    let attributeVal = userVal;

                    // requestedAttributes === true for all, or array for selected
                    if(requestedAttributes===true ||
                        requestedAttributes.indexOf(attributeName)>-1 ||
                        userParam!=null) {

                        if(attributeVal!=null) {
                            if(attributeName=="dateOfBirth" || attributeName=="expirationDate") {
                                attributesCompiled += " \
                                    <saml:Attribute Name=\"" + attributeName + "\" ";
                                        if(attributesNameFormat) attributesCompiled += " NameFormat=\"urn:oasis:names:tc:SAML:2.0:attrname-format:basic\"";
                                        attributesCompiled += "> \
                                        <saml:AttributeValue xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" \
                                            xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:type=\"xs:date\">"
                                                + attributeVal +
                                        "</saml:AttributeValue> \
                                    </saml:Attribute> \
                                ";
                            } else {
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
                
                if(attributesCompiled!='') {
                    let attributeStatementCompiled = "<saml:AttributeStatement>" + attributesCompiled + "</saml:AttributeStatement>";
                    compiled = compiled.replace("{{Attributes}}", attributeStatementCompiled);  
                } else {
                    compiled = compiled.replace("{{Attributes}}", "");
                }

            } else if(eKey=="GrantTokens") {
                let grantTokensCompiled = "";
                for(let grantTokenDestination in eVal) {
                    let grantTokenVal = eVal[grantTokenDestination];
                    
                    let sid = this.getActualParam('ResponseID', userParams, testsuite.response, testcase.response, defaultParams);
                    let acr = this.getActualParam('AuthnContextClassRef', userParams, testsuite.response, testcase.response, defaultParams);
                    let iss = this.getActualParam('Issuer', userParams, testsuite.response, testcase.response, defaultParams);
                    let sub = this.getActualParam('fiscalNumber', userParams, testsuite.response? testsuite.response.Attributes : null, testcase.response? testcase.response.Attributes : null, defaultParams);
                    let aud = this.getActualParam('Audience', userParams, testsuite.response, testcase.response, defaultParams);

                    if(grantTokenVal!=null) {
                        let grantToken = await this.makeGrantToken(
                            grantTokenVal.header, 
                            grantTokenVal.payload,
                            grantTokenDestination,
                            "saml:" + sid,
                            acr,
                            iss,
                            sub,
                            aud
                        );

                        grantTokensCompiled += "<GrantToken Destination=\"" + grantTokenDestination + "\">" + grantToken + "</GrantToken>";
                    }
                }
                if(grantTokensCompiled!='') {
                    let grantedAttributeAuthorityCompiled = "<spid:GrantedAttributeAuthority xmlns:spid=\"https://spid.gov.it/saml-extensions\">" 
                        + grantTokensCompiled + "</spid:GrantedAttributeAuthority>";
                    compiled = compiled.replace("{{GrantTokens}}", grantedAttributeAuthorityCompiled);  
                } else {
                    compiled = compiled.replace("{{GrantTokens}}", "");
                }

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

        await Promise.all(compiledPromises);
        
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

    // Grant Token, prima firmato e po crittato
    async makeGrantToken(header, payload, aud, sid, acr, iss, sub, actsub) {
        const config_prv_key = fs.readFileSync(path.resolve(__dirname, '../../config/spid-saml-check.key'));
        const config_pub_key = fs.readFileSync(path.resolve(__dirname, '../../config/spid-saml-check.crt'));
        const keystore = jose.JWK.createKeyStore();
        
        const prv_key = await keystore.add(config_prv_key, 'pem');
        const pub_key = await keystore.add(config_pub_key, 'pem');

        let kid = crypto.randomUUID();
        let iat = moment();
        let exp = iat.clone().add(1, 'years')

        header = {
            typ: (header!=null && header.typ!=null) ? header.typ : "aa-grant+jwt",
            alg: (header!=null && header.alg!=null) ? header.alg : undefined,
            enc: (header!=null && header.enc!=null) ? header.enc : undefined,
            kid: (header!=null && header.kid!=null) ? header.kid : kid
        }

        payload = JSON.stringify({
            iat: (payload!=null && payload.iat!=null) ? payload.iat===false? undefined : payload.iat : iat.unix(),
            exp: (payload!=null && payload.exp!=null) ? payload.exp===false? undefined : payload.exp : exp.unix(),
            nbf: (payload!=null && payload.nbf!=null) ? payload.nbf===false? undefined : payload.nbf : iat.unix(),
            jti: (payload!=null && payload.jti!=null) ? payload.jti===false? undefined : payload.jti : kid,
            aud: (payload!=null && payload.aud!=null) ? payload.aud===false? undefined : payload.aud : aud,
            sid: (payload!=null && payload.sid!=null) ? payload.sid===false? undefined : payload.sid : sid,
            acr: (payload!=null && payload.acr!=null) ? payload.acr===false? undefined : payload.acr : acr,
            iss: (payload!=null && payload.iss!=null) ? payload.iss===false? undefined : payload.iss : iss,
            sub: (payload!=null && payload.sub!=null) ? payload.sub===false? undefined : payload.sub : sub,
            act: (payload!=null && payload.act!=null) ? payload.act===false? undefined : payload.act : {"sub": actsub},
            userID: (payload!=null && payload.userID!=null) ? payload.userID : sub
        })

        const signedGrantToken = await jose.JWS.createSign({
            format: 'compact',
            alg: header.alg ?? 'RS256',
            fields: {...header}
        }, prv_key).update(payload).final();

        console.log("GrantToken JWS (" + aud + ") : ", signedGrantToken);

        const encryptedToken = await jose.JWE.createEncrypt({ 
            format: 'compact',
            fields: {...header} 
        }, pub_key).update(signedGrantToken).final();

        return encryptedToken;
    }
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

    existsAssertionConsumerServiceURL(url) {
        let exists = false;
        let doc = new DOMParser().parseFromString(this.metadata.xml);
        let acs = select("//md:EntityDescriptor/md:SPSSODescriptor/md:AssertionConsumerService", doc);
        for(let i in acs) {
            let acsLocation = acs[i].getAttribute("Location");
            if(acsLocation==url) {
                exists = true;
                break;
            }
        }
        return exists;
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

    getOrganization() {
        let organization = {
            name: "",
            displayName: "",
            url: ""   
        };

        let doc = new DOMParser().parseFromString(this.metadata.xml);

        let organization_name = select("//md:EntityDescriptor/md:Organization/md:OrganizationName", doc);
        if(organization_name && organization_name.length>0) {
            organization.name = select("string(//md:OrganizationName)", organization_name[0]);
            if(organization_name.length > 1) {
                for(let n in organization_name) {
                    let name = organization_name[n];
                    if(name.getAttribute("lang")=="it") {
                        organization.name = select("string(//)", name);
                    }
                }
            }
        }

        let organization_display_name = select("//md:EntityDescriptor/md:Organization/md:OrganizationDisplayName", doc);
        if(organization_display_name && organization_display_name.length>0) {
            organization.displayName = select("string(//md:OrganizationDisplayName)", organization_display_name[0]);
            if(organization_display_name.length > 1) {
                for(let n in organization_display_name) {
                    let display_name = organization_display_name[n];
                    if(display_name.getAttribute("lang")=="it") {
                        organization.displayName = select("string(//)", display_name);
                    }
                }
            }
        }

        let organization_url = select("//md:EntityDescriptor/md:Organization/md:OrganizationURL", doc);
        if(organization_url && organization_url.length>0) {
            organization.url = select("string(//md:OrganizationURL)", organization_url[0]);
            if(organization_url.length > 1) {
                for(let n in organization_url) {
                    let url = organization_url[n];
                    if(url.getAttribute("lang")=="it") {
                        organization.url = select("string(//)", url);
                    }
                }
            }
        }

        return organization;
    }

    /*
     * Functions for ContactPerson
     */

    getSPIDContactPerson() {
        let contact_person = [];

        let doc = new DOMParser().parseFromString(this.metadata.xml);

        let contact_person_doc = select("//md:EntityDescriptor/md:ContactPerson", doc);
        for(let n in contact_person_doc) {
            let cpe = contact_person_doc[n];
            let cpe_contact_type = cpe.getAttribute("contactType");
            let cpe_entity_type = cpe.getAttribute("spid:entityType");

            contact_person.push({
                contactType: cpe_contact_type,
                entityType: cpe_entity_type,
                IPACode: select("string(md:Extensions/spid:IPACode)", cpe),
                VATNumber: select("string(md:Extensions/spid:VATNumber)", cpe),
                FiscalCode: select("string(md:Extensions/spid:FiscalCode)", cpe),

                PublicServicesFullAggregator: select("boolean(md:Extensions/spid:PublicServicesFullAggregator)", cpe),
                PublicServicesLightAggregator: select("boolean(md:Extensions/spid:PublicServicesLightAggregator)", cpe),
                PrivateServicesFullAggregator: select("boolean(md:Extensions/spid:PrivateServicesFullAggregator)", cpe),
                PrivateServicesLightAggregator: select("boolean(md:Extensions/spid:PrivateServicesLightAggregator)", cpe),
                PublicServicesFullOperator: select("boolean(md:Extensions/spid:PublicServicesFullOperator)", cpe),
                PublicServicesLightOperator: select("boolean(md:Extensions/spid:PublicServicesLightOperator)", cpe),

                Public: select("boolean(md:Extensions/spid:Public)", cpe),
                PublicOperator: select("boolean(md:Extensions/spid:PublicOperator)", cpe),
                Private: select("boolean(md:Extensions/spid:Private)", cpe),  

                Company: select("string(md:Company)", cpe),
                EmailAddress: select("string(md:EmailAddress)", cpe),
                TelephoneNumber: select("string(md:TelephoneNumber)", cpe),
            });
        }

        return contact_person;
    }

    getSPIDSPContactPerson() {
        let sp_contact_person = null;
        if(!this.isMetadataForAggregated()) {
            let contactPerson = this.getSPIDContactPerson();
            for(let n in contactPerson) {
                if(contactPerson[n].contactType=="other")
                    sp_contact_person = contactPerson[n];
            }
        }
        
        return sp_contact_person;
    }

    getSPIDAggregatedContactPerson() {
        let aggregated = null;
        if(this.isMetadataForAggregated()) {
            let contactPerson = this.getSPIDContactPerson();
            for(let n in contactPerson) {
                if(contactPerson[n].entityType=="spid:aggregated")
                    aggregated = contactPerson[n];
            }
        }

        return aggregated;
    }

    getSPIDAggregatorContactPerson() {
        let aggregator = null;
        if(this.isMetadataForAggregated()) {
            let contactPerson = this.getSPIDContactPerson();
            for(let n in contactPerson) {
                if(contactPerson[n].entityType=="spid:aggregator")
                    aggregator = contactPerson[n];
            }
        }

        return aggregator;
    }

    getSPIDFullOperatorContactPerson() {
        let aggregator = null;
        if(this.isMetadataForFullOperator()) {
            let contactPerson = this.getSPIDContactPerson();
            for(let n in contactPerson) {
                if(contactPerson[n].entityType=="spid:aggregator")
                    aggregator = contactPerson[n];
            }
        }

        return aggregator;
    }

    getSPIDBillingContactPerson() {
        let contact_person = [];

        let doc = new DOMParser().parseFromString(this.metadata.xml);

        let contact_person_doc = select("//md:EntityDescriptor/md:ContactPerson", doc);
        for(let n in contact_person_doc) {
            let cpe = contact_person_doc[n];
            let cpe_contact_type = cpe.getAttribute("contactType");

            if(cpe_contact_type=="billing") {
                contact_person.push({
                    contactType: cpe_contact_type,
                    Company: select("string(md:Company)", cpe),
                });
            }
        }

        return contact_person;
    }


    /*
     * Functions for check metadata type
     */
    isMetadataForPrivate() {
        let contactPerson = this.getSPIDBillingContactPerson();

        for(let n in contactPerson) {
            if(contactPerson[n].contactType=="billing") {
                return true;
            };
        };

        return false;
    }

    isMetadataForAggregated() {
        let contactPerson = this.getSPIDContactPerson();

 //       let assertLength = (contactPerson.length==2);  !!!non valido per gli aggregatori privati
        let assertAggregator = false;
        let assertAggregated = false;

        for(let n in contactPerson) {
            assertAggregator = assertAggregator || (contactPerson[n].entityType=="spid:aggregator");
            assertAggregated = assertAggregated || (contactPerson[n].entityType=="spid:aggregated");
        }
        
//        return assertLength && assertAggregator && assertAggregated;
        return assertAggregator && assertAggregated;
    }

    isMetadataForOperator() {
        let contactPerson = this.getSPIDContactPerson();

        let assertLength = (contactPerson.length==1);
        let assertOperator = (contactPerson[0].entityType=="spid:aggregator");
        
        return assertLength && assertOperator;
    }

    isMetadataForFullOperator() {
        let contactPerson = this.getSPIDContactPerson();

        let assertLength = (contactPerson.length==1);
        let assertAggregator = false;

        for(let n in contactPerson) {
            assertAggregator = assertAggregator || (contactPerson[n].entityType=="spid:aggregator");
        }
        
        return assertLength && assertAggregator;
    }

    isMetadataForAgPublicFull() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pub-ag-full') > -1;
        return this.isMetadataForAggregated() && checkActivityCode;
    }

    isMetadataForAgPublicLite() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pub-ag-lite') > -1;
        return this.isMetadataForAggregated() && checkActivityCode;
    }

    isMetadataForOpPublicFull() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pub-op-full') > -1;
        return this.isMetadataForOperator() && checkActivityCode;
    }

    isMetadataForOpPublicLite() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pub-op-lite') > -1;
        return this.isMetadataForOperator() && checkActivityCode;
    }

    isMetadataForAgPrivateFull() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pri-ag-full') > -1;
        return this.isMetadataForAggregated() && checkActivityCode;
    }

    isMetadataForAgPrivateLite() {
        let entityId = this.getServiceProviderEntityId();
        let checkActivityCode = entityId.indexOf('pri-ag-lite') > -1;
        return this.isMetadataForAggregated() && checkActivityCode;
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
        let requestID = select("//samlp:" + samlp, doc)[0];
        if(requestID!=null) requestID = requestID.getAttribute("ID") 
        else requestID = undefined;
        return requestID;
    }

    IssueInstant() {
        let samlp = (this.request.type==1)? "AuthnRequest" : "LogoutRequest";
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestIssueInstant = select("//samlp:" + samlp, doc)[0];
        if(requestIssueInstant!=null) requestIssueInstant = requestIssueInstant.getAttribute("IssueInstant") 
        else requestIssueInstant = undefined;
        return requestIssueInstant;
    }

    Issuer() {
        let samlp = (this.request.type==1)? "AuthnRequest" : "LogoutRequest";
        let doc = new DOMParser().parseFromString(this.request.xml);
        let issuer = select("string(//samlp:" + samlp + "/saml:Issuer)", doc);
        return issuer.trim();
    }

    AuthnContextClassRef() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAuthnContextClassRef = select("string(//samlp:AuthnRequest/samlp:RequestedAuthnContext/saml:AuthnContextClassRef)", doc);
        return requestAuthnContextClassRef;
    }

    AssertionConsumerServiceURL() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAssertionConsumerServiceURL = select("//samlp:AuthnRequest", doc)[0];
        if(requestAssertionConsumerServiceURL!=null) requestAssertionConsumerServiceURL = requestAssertionConsumerServiceURL.getAttribute("AssertionConsumerServiceURL") 
        else requestAssertionConsumerServiceURL = undefined;
        return requestAssertionConsumerServiceURL;
    }

    AssertionConsumerServiceIndex() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAssertionConsumerServiceIndex = select("//samlp:AuthnRequest", doc)[0];
        if(requestAssertionConsumerServiceIndex!=null) requestAssertionConsumerServiceIndex = requestAssertionConsumerServiceIndex.getAttribute("AssertionConsumerServiceIndex") 
        else requestAssertionConsumerServiceIndex = undefined;
        return requestAssertionConsumerServiceIndex;
    }

    AttributeConsumingServiceIndex() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let requestAttributeConsumingServiceIndex = select("//samlp:AuthnRequest", doc)[0];
        if(requestAttributeConsumingServiceIndex!=null) requestAttributeConsumingServiceIndex = requestAttributeConsumingServiceIndex.getAttribute("AttributeConsumingServiceIndex") 
        else requestAttributeConsumingServiceIndex = undefined;
        return requestAttributeConsumingServiceIndex;
    }

    Purpose() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let purpose = select("string(//samlp:AuthnRequest/samlp:Extensions/spid:Purpose)", doc);
        return purpose;
    }

    MinAge() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let minAge = select("string(//samlp:AuthnRequest/samlp:Extensions/spid:AgeLimit/spid:MinAge)", doc);
        return minAge;
    }

    MaxAge() { // only for type 1
        let doc = new DOMParser().parseFromString(this.request.xml);
        let maxAge = select("string(//samlp:AuthnRequest/samlp:Extensions/spid:AgeLimit/spid:MaxAge)", doc);
        return maxAge;
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

    getLogoutResponseURL(url, SAMLResponse, sigAlg, signature, relayState) {
        let qs = "";

        if (signature !== null) {
            qs += this.getLogoutResponsePayload(SAMLResponse, relayState, sigAlg);
            qs += "&Signature=" + encodeURIComponent(signature);
        } else {
            qs += this.getLogoutResponsePayload(SAMLResponse, relayState, null);
        }

        const searchParams = new URLSearchParams(qs);

        let slo = new URL(url);
        let existingParams = new URLSearchParams(slo.search);
        existingParams.forEach(function(value, key) {
            searchParams.set(key, value);
        });

        slo.search = searchParams.toString();
        return  slo.toString();
    }

    getLogoutResponsePayload(SAMLResponse, relayState, sigAlg) {
        let qs = "SAMLResponse=" + encodeURIComponent(zlib.deflateRawSync(SAMLResponse).toString("base64"));
        qs += "&RelayState=" + encodeURIComponent(relayState);
        qs += (sigAlg !== null) ? "&SigAlg=" + encodeURIComponent(sigAlg) : "";

        return qs;
    }
}


module.exports.TestSuite = TestSuite;
module.exports.MetadataParser = MetadataParser;
module.exports.RequestParser = RequestParser;
module.exports.PayloadDecoder = PayloadDecoder;
module.exports.IdP = IdP;
