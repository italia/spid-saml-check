const UUID = require("uuidjs");
const moment = require("moment");

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

class Utils {

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

}
    
module.exports = Utils;