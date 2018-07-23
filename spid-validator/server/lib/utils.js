const url = require("url");
const path = require("path");
const CircularJSON = require("circular-json");
const child_process = require('child_process');
const UUID = require("uuidjs");
const moment = require("moment");


String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

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
        return UUID.generate();
    }

    static getInstant() {
        return moment().utc();
    }

    static getNotBefore(instant) {
        return moment(instant).utc();
    }

    static getNotOnOrAfter(instant) {
        return moment(instant).add(5, 'm').utc();
    }

    static metadataDownload(src, dest) {
        return new Promise((resolve, reject) => {
            const file_name = url.parse(src).pathname.split('/').pop();
            const file_extention = path.extname(file_name);
            const cmd = 'wget -O ' + dest + ' ' + src;   
        
            child_process.exec(cmd, function (err, stdout, stderr) {
                return err ? reject(stderr) : resolve(file_name);
            });
        });
    }

    static metadataCheck(test) {
        return new Promise((resolve, reject) => {
            let cmd = 'cd ../specs-compliance-tests && tox -e cleanup';
            switch(test) {
                case "strict": cmd += ",sp-metadata-strict"; break;
                case "certs": cmd += ",sp-metadata-strict,sp-metadata-certs"; break;
                case "extra": cmd += ",sp-metadata-extra"; break;
            }

            //cmd+=",generate-global-json-report";
             
            child_process.exec(cmd, function (err, stdout, stderr) {
                return resolve(stdout);
            });
        });
    }

    static requestCheck(test) {
        return new Promise((resolve, reject) => {
            let cmd = 'cd ../specs-compliance-tests && tox -e cleanup';
            switch(test) {
                case "strict": cmd += ",sp-authn-request-strict"; break;
                case "certs": cmd += ",sp-authn-request-strict,sp-authn-request-certs"; break;
                case "extra": cmd += ",sp-authn-request-extra"; break;
            }

            //cmd+=",generate-global-json-report";
             
            child_process.exec(cmd, function (err, stdout, stderr) {
                return resolve(stdout);
            });
        });
    }
}
    
module.exports = Utils;
