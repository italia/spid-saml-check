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

    static download(src, dest) {
        return new Promise((resolve, reject) => {
     
            // extract the file name
            const file_name = url.parse(src).pathname.split('/').pop();
     
            // get the file extention
            const file_extention = path.extname(file_name);
     
            // compose the wget command
            const wget = 'wget -O ' + dest + ' ' + src;           
     
            // excute wget using child_process' exec function
            child_process.exec(wget, function (err, stdout, stderr) {
                return err ? reject(stderr) : resolve(file_name);
            });
        });
    }
}
    
module.exports = Utils;
