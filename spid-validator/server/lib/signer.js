const signing = require("./saml-protocol/util/signing");

const SIGN_MODE = {
    SIGN_RESPONSE: 0,
    SIGN_ASSERTION: 1,
    SIGN_RESPONSE_ASSERTION: 2
}


function Signer(signatureOptions) {
    this.signatureOptions = signatureOptions;
}

Signer.prototype.sign = function(xml, mode) {
    let signed = "";
    mode = (mode!=null)? mode : SIGN_MODE.SIGN_RESPONSE_ASSERTION;

    switch(mode) {
        case 0: 
            signed = this.singleSign(xml, "Response"); 
            break;
        case 1: 
            signed = this.singleSign(xml, "Assertion"); 
            break;
        case 2: 
            signed = this.singleSign(xml, "Assertion"); 
            signed = this.singleSign(signed, "Response"); 
            break;
    }
    return signed;
};


Signer.prototype.singleSign = function(xml, element) {
    let signed = signing.signXML(
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
    return signed;    
}

module.exports.Signer = Signer;
module.exports.SIGN_MODE = SIGN_MODE;
