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
                CREATE TABLE status ( \
                    user                        STRING, \
                    entity_id                   STRING, \
                    timestamp                   DATETIME, \
                    metadata                    TEXT, \
                    report_metadata_strict      TEXT,\
                    report_metadata_cert        TEXT, \
                    report_metadata_extra       TEXT, \
                    report_request_strict       TEXT, \
                    report_request_cert         TEXT, \
                    report_request_extra        TEXT, \
                    report_response             TEXT, \
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

    isWorkSaved(user, entity_id) {
        if(!this.checkdb()) return;

        let data = {result: false};
        let result = this.select("SELECT user, entity_id FROM status WHERE user='" + user + "' AND entity_id='" + entity_id + "'");
        if(result.length==1) data.result = true;
        return data; 
    }

    saveData(user, entity_id, key, val) {
        if(!this.checkdb()) return;

        let sql1 = "INSERT OR IGNORE INTO status(user, entity_id, timestamp, " + key + ") VALUES (?, ?, DATETIME('now', 'localtime'), ?);";
        let sql2 = "UPDATE status SET timestamp=DATETIME('now', 'localtime'), " + key + "=? WHERE user=? AND entity_id=?";

        try { 
            val = JSON.stringify(val);
            this.db.prepare(sql1).run(user, entity_id, val);
            this.db.prepare(sql2).run(val, user, entity_id);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
        }        
    }

    getData(user, entity_id, key) {
        if(!this.checkdb()) return;

        let data = {result: false};
        let result = this.select("SELECT " + key + " FROM status WHERE user='" + user + "' AND entity_id='" + entity_id + "'");
        if(result.length==1) data.result = result[0];
        return data; 
    }

}
    
module.exports = Database;
