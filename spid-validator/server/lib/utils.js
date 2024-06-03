const url = require("url");
const path = require("path");
const https = require("https");
const CircularJSON = require("circular-json");
const child_process = require('child_process');
const UUID = require("uuidjs");
const moment = require("moment");
const CryptoJS = require("crypto-js");
const config_dir = require("../../config/dir.json");
const config_idp = require("../../config/idp.json");
const fs = require("fs-extra");


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

String.prototype.normalize = function() {
    var target = this;
    return target.replace(/[^a-z0-9]/gi, "_").toLowerCase().trim();
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

            // check if URL is valid
            if(!this.isValidUrl(src)) {
                return reject("Inserire una URL valida");
            }

            // check if URL exists
            var q = url.parse(src, true);
            var protocol = (q.protocol == "http:") ? require('http') : require('https');
            protocol.get(src, (res) => {
                if(res.statusCode!='200') {
                    return reject("Metadata non trovato alla URL indicata");
                }
            })

            const file_name = url.parse(src).pathname.split('/').pop();
            const file_extention = path.extname(file_name);
            const cmd = 'wget -O "' + dest + '" "' + src + '" --no-check-certificate --no-cache --no-cookies  --user-agent="Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:52.0) Gecko/20100101 Firefox/52.0"';   

            try {
                child_process.exec(cmd, function (err, stdout, stderr) {
                    return err ? reject(stderr) : resolve(file_name);
                });
            } catch(e) {
                return reject("Si è verificato un errore durante l'esecuzione di spid-sp-test: " + e.message);
            }
        });
    }

    static metadataCheck(test, dir, profile, config, prod) {
        return new Promise((resolve, reject) => {
            let cmd;
            let dirpath = config_dir["DATA"] + "/" + dir;
            cmd = "env IDP_ENTITYID=\"" + config.entityID + "\" ";
            cmd += " spid_sp_test ";
            cmd += " --metadata-url file://" + dirpath + "/sp-metadata.xml ";
            cmd += " --profile " + profile;
            cmd += " --debug ERROR";
            if(prod) cmd += " --production";

            let reportfile = "";
            switch(test) {
                case "strict": 
                    reportfile = dirpath + "/sp-metadata-strict.json"; 
                    cmd += " -rf json -o " + reportfile;
                    break;
                case "extra": 
                    reportfile = dirpath + "/sp-metadata-extra.json"; 
                    cmd += " -rf json -o " + reportfile + " --extra";
                    break;
            }
             
            try {
                child_process.exec(cmd, function (err, stdout, stderr) {
                    console.log("\n\n>>> " + cmd);
                    console.log("[ERR] " + err);
                    console.log("[STDOUT] " + stdout);
                    console.log("[STDERR] " + stderr);

                    if(!fs.existsSync(reportfile)) {
                        return reject(err? stderr:stdout);
                    }

                    return resolve(stdout);
                });
            } catch(e) {
                return reject("Si è verificato un errore durante l'esecuzione di spid-sp-test: " + e.message);
            }
        });
    }

    static requestCheck(test, dir, config, prod) {
        return new Promise((resolve, reject) => {
            let cmd;
            let dirpath = config_dir["DATA"] + "/" + dir;
            cmd = "env IDP_ENTITYID=\"" + config.entityID + "\" ";
            cmd += " spid_sp_test ";
            cmd += " --metadata-url file://" + dirpath + "/sp-metadata.xml ";
            cmd += " --authn-url file://" + dirpath + "/authn-request.dump ";
            cmd += " --debug ERROR";
            if(prod) cmd += " --production";

            let reportfile = "";
            switch(test) {
                case "strict": 
                    reportfile = dirpath + "/sp-authn-request-strict.json"; 
                    cmd += " -rf json -o " + reportfile;
                    break;
                case "extra": 
                    reportfile = dirpath + "/sp-authn-request-extra.json"; 
                    cmd += " -rf json -o " + reportfile + " --extra";
                    break;
            }
             
            try {
                child_process.exec(cmd, function (err, stdout, stderr) {
                    console.log("\n\n>>> " + cmd);
                    console.log("[ERR] " + err);
                    console.log("[STDOUT] " + stdout);
                    console.log("[STDERR] " + stderr);

                    if(!fs.existsSync(reportfile)) {
                        return reject(err? stderr:stdout);
                    }

                    return resolve(stdout);
                });
            } catch(e) {
                return reject("Si è verificato un errore durante l'esecuzione di spid-sp-test: " + e.message);
            }
        });
    }

    static getSpidSPTestVersion() {
        return new Promise((resolve, reject) => {
            let cmd;
            cmd = "spid_sp_test --version";

            try {
                child_process.exec(cmd, function (err, stdout, stderr) {
                    if(err) return reject(stderr);
                    else return resolve(stdout);
                });
            } catch(e) {
                return reject("Si è verificato un errore durante l'esecuzione di spid-sp-test: " + e.message);
            }
        });
    }

    static encrypt(toencrypt, key) {
        return CryptoJS.AES.encrypt(toencrypt, key);
    }
        
    static decrypt(encrypted, key) {
        return CryptoJS.AES.decrypt(encrypted.toString(), key);
    }

    static btoa(text) {
        return Buffer.from(text).toString('base64');
    }

    static atob(buffer) {
        return Buffer.from(buffer, 'base64').toString('ascii');
    }
    
  static readFiles(dirname, onFileContent, onError) {
    fs.readdir(dirname, function (err, filenames) {
      if (err) {
        onError(err);
        return;
      }
      filenames.forEach(function (filename) {
        if (filename.indexOf('.xml') > 0) {
          let content = fs.readFileSync(dirname + "/" + filename, "utf8");
          onFileContent(filename, content);
        }
      });
    });
  }

  static readDir(filePath) {
      const files = fs.readdirSync(filePath);
      const fileArray = [];
      files.forEach((file) => {
        if (file.split('.')[1] === 'xml') {
          fileArray.push(file);
        }
      });
      return fileArray;
  }

  static isValidUrl(str) {
    const pattern = new RegExp(
      '^([a-zA-Z]+:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', // fragment locator
      'i'
    );
    return pattern.test(str);
  }

}

module.exports = Utils;
