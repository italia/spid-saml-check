const utility = require('./utils.js');
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
                    organization                INTEGER, \
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


    saveStore(user, organization, entity_id, external_code, store_type, new_store) {
        if(!this.checkdb()) return;

        let sql1 = "INSERT OR IGNORE INTO store(user, organization, entity_id, external_code, timestamp, type, store) VALUES (?, ?, ?, ?, DATETIME('now', 'localtime'), ?, ?);";
        let sql2 = "UPDATE store SET timestamp=DATETIME('now', 'localtime'), ";

        try { 
            let store = this.getStore(user, entity_id, store_type);
            for(let key in store) {
                store[key] = new_store[key];
            }

            store.metadata_SP_XML = utility.btoa(store.metadata_SP_XML);
            let storeSerialized = JSON.stringify(store);

            let sql2_values = [];
            if(external_code!=null && external_code!='') {
                sql2 += "external_code=?, ";
                sql2_values.push(external_code);
            }
            if(organization!=null && organization!='') {
                sql2 += "organization=?, ";
                sql2_values.push(organization);
            } 
            sql2 += "store=? WHERE user=? AND entity_id=? AND type=?";
            sql2_values.push(storeSerialized);
            sql2_values.push(user);
            sql2_values.push(entity_id);
            sql2_values.push(store_type);
           
            this.db.prepare(sql1).run(user, organization, entity_id, external_code, store_type, storeSerialized);
            this.db.prepare(sql2).run(...sql2_values);

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (saveStore)", exception.toString());
            throw(exception);
        } 
    }

    getOrganization(user, entity_id, store_type) {
        if(!this.checkdb()) return;

        try {
            let data = false;
            let sql = this.db.prepare("SELECT organization FROM store WHERE user=? AND entity_id=? AND type=?");
            let result = sql.all(user, entity_id, store_type);
            if(result.length==1) data = result[0].organization;
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getStore)", exception.toString());
            throw(exception);
        }
    }

    getStore(user, entity_id, store_type) {
        if(!this.checkdb()) return;

        try {
            let sql_query = "SELECT store, type FROM store WHERE user=? AND entity_id=? ";

            let multiple_store_type = store_type.indexOf(',')!=-1;
            let store_type_value;
            if(multiple_store_type) {
                store_type = store_type.replaceAll(' ', '');
                let store_types = store_type.split(',');
                sql_query += " AND type IN('" + store_types.join("', '") + "')";

            } else {
                sql_query += " AND type='" + store_type + "'";
            }

            let sql = this.db.prepare(sql_query);
            let result = sql.all(user, entity_id);
            
            let data = false;

            if(multiple_store_type) {
                if(result.length>0) {
                    data = [];
                    for(let row in result) {
                        let store = JSON.parse(result[row].store);
                        store.metadata_SP_XML = utility.atob(store.metadata_SP_XML);
                        store.store_type = result[row].type;
                        data.push(store);
                    }
                }

            } else {
                if(result.length==1) {
                    data = JSON.parse(result[0].store);
                    data.metadata_SP_XML = utility.atob(data.metadata_SP_XML);
                }
            }

            return data;

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getStore)", exception.toString());
            throw(exception);
        }
    }

    getStoreByCode(user, external_code, store_type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(external_code!=null && external_code!='') {
                let sql = this.db.prepare("SELECT store FROM store WHERE user=? AND external_code=? AND type=?");
                let result = sql.all(user, external_code, store_type);
                if(result.length==1) {
                    data = JSON.parse(result[0].store);   
                    data.metadata_SP_XML = utility.atob(data.metadata_SP_XML);
                } 
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getStoreByCode)", exception.toString());
            throw(exception);
        }
    }

    getMetadata(user, entity_id, store_type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(user!=null && 
                entity_id!=null &&
                user!='' &&
                entity_id!='') {

                let sql = this.db.prepare("SELECT entity_id, store FROM store WHERE user=? AND entity_id=? AND type=?");
                let result = sql.all(user, entity_id, store_type);
                if(result.length==1) {
                    let store = JSON.parse(result[0].store);
                    data = {
                        entity_id: result[0].entity_id,
                        url: store.metadata_SP_URL,
                        xml: utility.atob(store.metadata_SP_XML)
                    } 
                }
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getMetadata)", exception.toString());
            throw(exception);
        }
    }

    getUserMetadata(user, organization, store_type) {
        if(!this.checkdb()) return;
        
        try {
            let data = [];
            if(user!=null && 
                user!='') {

                let sql = this.db.prepare("SELECT entity_id FROM store WHERE user=? AND organization=? AND type=?");
                let result = sql.all(user, organization, store_type);
                if(result.length>0) {
                    data = result
                }
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getUserMetadata)", exception.toString());
            throw(exception);
        }
    }

    getMetadataByCode(external_code, store_type) {
        if(!this.checkdb()) return;
        
        try {
            let data = false;
            if(external_code!=null && external_code!='') {
                let sql = this.db.prepare("SELECT entity_id, store FROM store WHERE external_code=? AND type=?");
                let result = sql.all(external_code, store_type);
                if(result.length==1) {
                    let store = JSON.parse(result[0].store);
                    data = {
                        entity_id: result[0].entity_id,
                        url: store.metadata_SP_URL,
                        xml: utility.atob(store.metadata_SP_XML)
                    }
                }
            }
            return data; 

        } catch(exception) {
            utility.log("DATABASE EXCEPTION (getMetadataByCode)", exception.toString());
            throw(exception);
        }
    } 

    setMetadata(user, organization, entity_id, external_code, store_type, url, xml) {
        let store = this.getStore(user, entity_id, store_type);
        if(!store) store = {};
        store.metadata_SP_URL = url;
        store.metadata_SP_XML = xml;
        store.metadata_validation_xsd = false;
        store.metadata_validation_strict = false;
        store.metadata_validation_certs = false;
        store.metadata_validation_extra = false;
        store.request_validation_strict = false;
        store.request_validation_certs = false;
        store.request_validation_extra = false;
        
        this.saveStore(user, organization, entity_id, external_code, store_type, store);
    }

    deleteStore(user, entity_id, store_type) {
        if(!this.checkdb()) return;

        let sql = "DELETE FROM store WHERE user=? AND entity_id=? AND type=?";

        try { 
            this.db.prepare(sql).run(user, entity_id, store_type);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (deleteStore)", exception.toString());
            throw(exception);
        } 
    }

    getLastCheck(user, entity_id, store_type) {
        let store = this.getStore(user, entity_id, store_type);
        if(!store) store = {};
        return {
            metadata_xsd: store.metadata_lastcheck_xsd,
            metadata_strict: store.metadata_lastcheck_strict,
            metadata_certs: store.metadata_lastcheck_certs,
            metadata_extra: store.metadata_lastcheck_extra,
            request_strict: store.request_lastcheck_strict,
            request_certs: store.request_lastcheck_certs,
            request_extra: store.request_lastcheck_extra
        }
    }

    getValidation(user, entity_id, store_type) {
        let store = this.getStore(user, entity_id, store_type);
        if(!store) store = {};
        return {
            metadata_xsd: store.metadata_validation_xsd,
            metadata_strict: store.metadata_validation_strict,
            metadata_certs: store.metadata_validation_certs,
            metadata_extra: store.metadata_validation_extra,
            request_strict: store.request_validation_strict,
            request_certs: store.request_validation_certs,
            request_extra: store.request_validation_extra,
            response_test_done: store.request_validation_extra,
            response_test_success: store.request_validation_success
        }
    }

    getValidationByCode(user, external_code, store_type) {
        let store = this.getStoreByCode(user, external_code, store_type);
        if(!store) store = {};
        return {
            metadata_xsd: store.metadata_validation_xsd,
            metadata_strict: store.metadata_validation_strict,
            metadata_certs: store.metadata_validation_certs,
            metadata_extra: store.metadata_validation_extra,
            request_strict: store.request_validation_strict,
            request_certs: store.request_validation_certs,
            request_extra: store.request_validation_extra,
            response_test_done: store.request_validation_extra,
            response_test_success: store.request_validation_success
        }
    }

    setMetadataLastCheck(user, entity_id, external_code, store_type, test, lastcheck) {
        try {
            let store = this.getStore(user, entity_id, store_type);
            let organization = this.getOrganization(user, entity_id, store_type);
            if(!store) store = {};
            switch(test) {
                case "xsd": store.metadata_lastcheck_xsd = lastcheck; break;
                case "strict": store.metadata_lastcheck_strict = lastcheck; break;
                case "certs": store.metadata_lastcheck_certs = lastcheck; break;
                case "extra": store.metadata_lastcheck_extra = lastcheck; break;
            }
            
            this.saveStore(user, organization, entity_id, external_code, store_type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setMetadataLastCheck)", exception.toString());
            throw(exception);
        }
    }

    setMetadataValidation(user, entity_id, external_code, store_type, test, metadata_validation) {
        try {
            let store = this.getStore(user, entity_id, store_type);
            let organization = this.getOrganization(user, entity_id, store_type);
            if(!store) store = {};
            switch(test) {
                case "xsd": store.metadata_validation_xsd = metadata_validation; break;
                case "strict": store.metadata_validation_strict = metadata_validation; break;
                case "certs": store.metadata_validation_certs = metadata_validation; break;
                case "extra": store.metadata_validation_extra = metadata_validation; break;
            }
            
            this.saveStore(user, organization, entity_id, external_code, store_type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setMetadataValidation)", exception.toString());
            throw(exception);
        }
    }

    setRequestLastCheck(user, entity_id, external_code, store_type, test, request_lastcheck) {
        try {
            let store = this.getStore(user, entity_id, store_type);
            let organization = this.getOrganization(user, entity_id, store_type);
            if(!store) store = {};
            switch(test) {
                case "strict": store.request_lastcheck_strict = request_lastcheck; break;
                case "certs": store.request_lastcheck_certs = request_lastcheck; break;
                case "extra": store.request_lastcheck_extra = request_lastcheck; break;
            }
            
            this.saveStore(user, organization, entity_id, external_code, store_type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setRequestLastCheck)", exception.toString());
            throw(exception);
        }
    }

    setRequestValidation(user, entity_id, external_code, store_type, test, request_validation) {
        try {
            let store = this.getStore(user, entity_id, store_type);
            let organization = this.getOrganization(user, entity_id, store_type);
            if(!store) store = {};
            switch(test) {
                case "strict": store.request_validation_strict = request_validation; break;
                case "certs": store.request_validation_certs = request_validation; break;
                case "extra": store.request_validation_extra = request_validation; break;
            }
            
            this.saveStore(user, organization, entity_id, external_code, store_type, store);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION (setMetadataValidation)", exception.toString());
            throw(exception);
        }
    }
}
    
module.exports = Database; 
