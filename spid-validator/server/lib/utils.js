const url = require("url");
const path = require("path");
const CircularJSON = require("circular-json");
const child_process = require('child_process');
const UUID = require("uuidjs");
const moment = require("moment");
const CryptoJS = require("crypto-js");


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

String.prototype.normalize = function() {
    var target = this;
    return target.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

class Utils {

    static log(tag, text) {
        console.log("\n\n>>> " + tag);
        if(text!=null) console.log(CircularJSON.stringify(text, null, 4));
    }

    static defaultParam(params, key, defaultVal) {
        let val = params.filter((p)=> { return (p.key==key) })[0];
        if(val==null) params.push({"key": key, "val": defaultVal});
        return params;
    }

    static getUUID() {
        // NCName type (https://github.com/italia/spid-saml-check/issues/14)
        return "_" + UUID.generate();
    }

    static getInstant() {
        return moment().utc().format();
    }

    static getInstantMillis() {
        return moment().utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
    }

    static getNotBefore(instant) {
        return moment(instant).utc().format();
    }

    static getNotOnOrAfter(instant) {
        return moment(instant).add(5, 'm').utc().format();
    }

    static metadataDownload(src, dest) {
        return new Promise((resolve, reject) => {
            const file_name = url.parse(src).pathname.split('/').pop();
            const file_extention = path.extname(file_name);
            const cmd = 'wget -O ' + dest + ' ' + src + ' --no-check-certificate --no-cache --no-cookies  --user-agent="Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0"';   

            child_process.exec(cmd, function (err, stdout, stderr) {
                return err ? reject(stderr) : resolve(file_name);
            });
        });
    }

    static metadataCheck(test, dir) {
        return new Promise((resolve, reject) => {
            let cmd = "cd ../specs-compliance-tests && DATA_DIR=./data/" + dir + " SP_METADATA=./data/" + dir + "/sp-metadata.xml \ tox -e cleanup";
            switch(test) {
                case "strict": cmd += ",sp-metadata-strict"; break;
                case "certs": cmd += ",sp-metadata-strict,sp-metadata-certs"; break;
                case "extra": cmd += ",sp-metadata-extra"; break;
            }

            //cmd+=",generate-global-json-report";
             
            child_process.exec(cmd, function (err, stdout, stderr) {
                if(err!=null && stderr!=null && stderr!="") {
                    return reject(stderr);
                } else {
                    return resolve(stdout);
                }
            });
        });
    }

    static requestCheck(test, dir) {
        return new Promise((resolve, reject) => {
            let cmd = "cd ../specs-compliance-tests && DATA_DIR=./data/" + dir + " SP_METADATA=./data/" + dir + "/sp-metadata.xml AUTHN_REQUEST=./data/" + dir + "/authn-request.xml \ tox -e cleanup";
            switch(test) {
                case "strict": cmd += ",sp-metadata-strict,sp-metadata-certs,sp-authn-request-strict"; break;
                case "certs": cmd += ",sp-metadata-strict,sp-metadata-certs,sp-authn-request-strict,sp-authn-request-certs"; break;
                case "extra": cmd += ",sp-metadata-strict,sp-metadata-certs,sp-authn-request-extra"; break;
            }

            //cmd+=",generate-global-json-report";
             
            child_process.exec(cmd, function (err, stdout, stderr) {
                return resolve(stdout);
            });
        });
    }

    static encrypt(toencrypt, key) {
        return CryptoJS.AES.encrypt(toencrypt, key);
    }
       
    static decrypt(encrypted, key) {
        return CryptoJS.AES.decrypt(encrypted.toString(), key);
    }
}
    
module.exports = Utils;
