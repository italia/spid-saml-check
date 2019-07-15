const utility = require("./utils.js");
const sqlite3 = require('better-sqlite3');
const fs = require('fs');

const dbfile = "config/database.sqlite";


class Database {


    constructor() {

    }

    connect() {
        this.db = new sqlite3(dbfile, { verbose: (text)=> {
            utility.log("DATABASE : QUERY", text);
        }});
        return this;
    }

    close() {
        if(!this.db) { utility.log("DATABASE", "Error: DB null."); return -1; }
        this.db.close();
    }

    checkdb() {
        let me = this;
        let exists = fs.existsSync(dbfile);
        if(!me || !me.db || !exists) {
            me = this.connect().setup();
        }

        if(!me.db) { utility.log("DATABASE", "Error: DB null."); return false; }            
        return me;
    }

    setup() {
        if(!this.checkdb()) return;

        try { 
            this.db.exec(" \
                CREATE TABLE log ( \
                    timestamp   DATETIME, \
                    type        STRING,   \
                    text        STRING (1024) \
                ); \
                CREATE TABLE store ( \
                    user                        STRING, \
                    entity_id                   STRING, \
                    external_code               STRING UNIQUE, \
                    timestamp                   DATETIME, \
                    type                        STRING, \
                    store                       TEXT, \
                    PRIMARY KEY (user, entity_id)     \
                ); \
            ");
        } catch(exception) {
            utility.log("DATABASE already exists. Skip database creation.", exception);
        }
        return this;
    }

    select(sql) {
        if(!this.checkdb()) return;
        
        let result = [];
        try { 
            result = this.db.prepare(sql).all();
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (select)", exception.toString());
        }
        return result;
    }

    log(tag, text) {
        if(!this.checkdb()) return;

        let sql = "INSERT INTO log(timestamp, type, text) VALUES (DATETIME('now', 'localtime'), ?, ?)";
        try { 
            result = this.db.prepare(sql).run(tag, text);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (log)", exception.toString());;
        }
    }


    saveStore(user, entity_id, external_code, type, store) {
        if(!this.checkdb()) return;

        let sql1 = "INSERT OR IGNORE INTO store(user, entity_id, external_code, timestamp, type, store) VALUES (?, ?, ?, DATETIME('now', 'localtime'), ?, ?);";
        let sql2 = "UPDATE store SET timestamp=DATETIME('now', 'localtime'), ";
        if(external_code!=null && external_code!='') sql2 += "external_code=?, ";
        sql2 += "type=?, store=? WHERE user=? AND entity_id=?";

        try { 
            let storeSerialized = JSON.stringify(store);
            this.db.prepare(sql1).run(user, entity_id, external_code, type, storeSerialized);
            if(external_code!=null && external_code!='') {
                this.db.prepare(sql2).run(external_code, type, storeSerialized, user, entity_id);
            } else {
                this.db.prepare(sql2).run(type, storeSerialized, user, entity_id);
            }
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (saveStore)", exception.toString());
        } 
    }

    getStore(user, entity_id, type) {
        if(!this.checkdb()) return;

        try {
            let data = false;
            let sql = this.db.prepare("SELECT store FROM store WHERE user=? AND entity_id=? AND type=?");
            let result = sql.all(user, entity_id, type);
            if(result.length==1) data = JSON.parse(result[0].store);
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getStore)", exception.toString());
        }
    }

    getStoreByCode(user, external_code, type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(external_code!=null && external_code!='') {
                let sql = this.db.prepare("SELECT store FROM store WHERE user=? AND external_code=? AND type=?");
                let result = sql.all(user, external_code, type);
                if(result.length==1) data = JSON.parse(result[0].store);    
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getStoreByCode)", exception.toString());
        }
    }

    getMetadata(user, entity_id, type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(user!=null && 
                entity_id!=null &&
                user!='' &&
                entity_id!='') {

                let sql = this.db.prepare("SELECT entity_id, store FROM store WHERE user=? AND entity_id=? AND type=?");
                let result = sql.all(user, entity_id, type);
                if(result.length==1) {
                    let store = JSON.parse(result[0].store);
                    data = {
                        entity_id: result[0].entity_id,
                        url: store.metadata_SP_URL,
                        xml: store.metadata_SP_XML
                    }
                }
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getMetadata)", exception.toString());
        }
    }

    getMetadataByCode(external_code, type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(external_code!=null && external_code!='') {
                let sql = this.db.prepare("SELECT entity_id, store FROM store WHERE external_code=? AND type=?");
                let result = sql.all(external_code, type);
                if(result.length==1) {
                    let store = JSON.parse(result[0].store);
                    data = {
                        entity_id: result[0].entity_id,
                        url: store.metadata_SP_URL,
                        xml: store.metadata_SP_XML
                    }
                }
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getMetadataByCode)", exception.toString());
        }
    }

    setMetadata(user, entity_id, external_code, type, url, xml) {
        let store = this.getStore(user, entity_id, type);
        if(!store) store = {};
        store.metadata_SP_URL = url;
        store.metadata_SP_XML = xml;
        store.metadata_validation_strict = false;
        store.metadata_validation_certs = false;
        store.metadata_validation_extra = false;
        store.request_validation_strict = false;
        store.request_validation_certs = false;
        store.request_validation_extra = false;
        
        this.saveStore(user, entity_id, external_code, type, store);
    }

    deleteStore(user, entity_id, type) {
        if(!this.checkdb()) return;

        let sql = "DELETE FROM store WHERE user=? AND entity_id=? AND type=?";

        try { 
            this.db.prepare(sql).run(user, entity_id, type);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (deleteStore)", exception.toString());
        } 
    }

    getValidation(user, entity_id, type) {
        store = this.getStore(user, entity_id, type);
        if(!store) store = {};
        return {
            metadata_strict: store.metadata_validation_strict,
            metadata_cert: store.metadata_validation_cert,
            metadata_extra: store.metadata_validation_extra,
            request_strict: store.request_validation_strict,
            request_cert: store.request_validation_cert,
            request_extra: store.request_validation_extra,
            response_test_done: store.request_validation_extra,
            response_test_success: store.request_validation_success
        }
    }

    getValidationByCode(user, external_code, type) {
        store = this.getStoreByCode(user, external_code, type);
        if(!store) store = {};
        return {
            metadata_strict: store.metadata_validation_strict,
            metadata_cert: store.metadata_validation_cert,
            metadata_extra: store.metadata_validation_extra,
            request_strict: store.request_validation_strict,
            request_cert: store.request_validation_cert,
            request_extra: store.request_validation_extra,
            response_test_done: store.request_validation_extra,
            response_test_success: store.request_validation_success
        }
    }

    setMetadataValidation(user, entity_id, external_code, type, test, metadata_validation) {
        try {
            let store = this.getStore(user, entity_id, type);
            if(!store) store = {};
            switch(test) {
                case "strict": store.metadata_validation_strict = metadata_validation; break;
                case "certs": store.metadata_validation_certs = metadata_validation; break;
                case "extra": store.metadata_validation_extra = metadata_validation; break;
            }
            
            this.saveStore(user, entity_id, external_code, type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setMetadataValidation)", exception.toString());
        }
    }
    setRequestValidation(user, entity_id, external_code, type, test, request_validation) {
        try {
            let store = this.getStore(user, entity_id, type);
            if(!store) store = {};
            switch(test) {
                case "strict": store.request_validation_strict = request_validation; break;
                case "certs": store.request_validation_certs = request_validation; break;
                case "extra": store.request_validation_extra = request_validation; break;
            }
            
            this.saveStore(user, entity_id, external_code, type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setMetadataValidation)", exception.toString());
        }
    }

}
    
module.exports = Database;
