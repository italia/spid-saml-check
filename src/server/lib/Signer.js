const signing = require("./saml-protocol/util/signing");

const SIGN_MODE = {
    SIGN_RESPONSE: 0,
    SIGN_ASSERTION: 1,
    SIGN_RESPONSE_ASSERTION: 2,
    GET_SIGNATURE: 3,
    SIGN_METADATA: 4,
}


class Signer {
    constructor(signatureOptions) {
        this.signatureOptions = signatureOptions;
    }

    sign(xml, mode) {
        let signed = "";
        mode = (mode!=null)? mode : SIGN_MODE.SIGN_RESPONSE_ASSERTION;

        switch(mode) {
            case SIGN_MODE.SIGN_RESPONSE: 
                signed = this.singleSign(xml, "Response"); 
                break;
            case SIGN_MODE.SIGN_ASSERTION: 
                signed = this.singleSign(xml, "Assertion"); 
                break;
            case SIGN_MODE.SIGN_RESPONSE_ASSERTION: 
                signed = this.singleSign(xml, "Assertion"); 
                signed = this.singleSign(signed, "Response"); 
                break;
            case SIGN_MODE.GET_SIGNATURE: 
                signed = this.getSignature(xml); 
                break;            
            case SIGN_MODE.SIGN_METADATA: 
                signed = this.singleSign(xml, "EntityDescriptor")
                break;
        }
        return signed;
    }

    singleSign(xml, element) {
        let signed = "";
        
        try {
            signed = signing.signXML(
                xml, 
                {
                    reference: "//*[local-name(.)='" + element + "']/*[local-name(.)='Issuer']",
                    action: "after"
                },
                "//*[local-name(.)='" + element + "']",
                {
                    certificate: this.signatureOptions.certificate,
                    privateKey: this.signatureOptions.privateKey
                }, 
                {
                    signatureAlgorithm: this.signatureOptions.signatureAlgorithm
                }
            );
        } catch(exception) {
            signed = signing.signXML(
                xml, 
                {
                    reference: "//*[local-name(.)='" + element + "']",
                    action: "prepend"
                },
                "//*[local-name(.)='" + element + "']",
                {
                    certificate: this.signatureOptions.certificate,
                    privateKey: this.signatureOptions.privateKey
                }, 
                {
                    signatureAlgorithm: this.signatureOptions.signatureAlgorithm
                }
            );
        }

        return signed;    
    } 

    getSignature(xml) {
        let privateKey = this.signatureOptions.privateKey;
        let sigAlg = this.signatureOptions.signatureAlgorithm;
        return signing.createURLSignature(privateKey, xml, sigAlg);
    }
}



module.exports.Signer = Signer;
module.exports.SIGN_MODE = SIGN_MODE;
