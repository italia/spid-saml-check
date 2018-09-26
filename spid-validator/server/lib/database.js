const utility = require("./utils.js");
const sqlite3 = require('better-sqlite3');
const fs = require('fs');

const dbfile = "config/database.sqlite";


class Database {


    constructor() {

    }

    connect() {
        this.db = new sqlite3(dbfile, {memory: false});
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
            utility.log("DATABASE EXCEPTION", exception.toString());
        }
        return result;
    }

    log(tag, text) {
        if(!this.checkdb()) return;

        let sql = "INSERT INTO log(timestamp, type, text) VALUES (DATETIME('now', 'localtime'), ?, ?)";
        try { 
            result = this.db.prepare(sql).run(tag, text);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());;
        }
    }


    saveStore(user, entity_id, type, store) {
        if(!this.checkdb()) return;

        let sql1 = "INSERT OR IGNORE INTO store(user, entity_id, timestamp, type, store) VALUES (?, ?, DATETIME('now', 'localtime'), ?, ?);";
        let sql2 = "UPDATE store SET timestamp=DATETIME('now', 'localtime'), type=?, store=? WHERE user=? AND entity_id=?";

        try { 
            let storeSerialized = JSON.stringify(store);
            this.db.prepare(sql1).run(user, entity_id, type, storeSerialized);
            this.db.prepare(sql2).run(type, storeSerialized, user, entity_id);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
        } 
    }

    getStore(user, entity_id, type) {
        if(!this.checkdb()) return;

        let data = false;
        let result = this.select("SELECT store FROM store WHERE user='" + user + "' AND entity_id='" + entity_id + "' AND type='" + type + "'");
        if(result.length==1) data = JSON.parse(result[0].store);
        return data; 
    }

    deleteStore(user, entity_id, type) {
        if(!this.checkdb()) return;

        let sql = "DELETE FROM store WHERE user=? AND entity_id=? AND type=?";

        try { 
            this.db.prepare(sql).run(user, entity_id, type);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
        } 
    }

}
    
module.exports = Database;
