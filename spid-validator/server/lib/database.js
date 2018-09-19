const utility = require("./utils.js");
const sqlite3 = require('better-sqlite3');


class Database {

    constructor() {

        
    }

    connect() {
        this.db = new sqlite3("config/database.sqlite", {memory: false});
        return this;
    }

    close() {
        if(!this.db) { utility.log("DATABASE", "Error: DB null."); return -1; }
        this.db.close();
    }

    setup() {
        if(!this.db) { utility.log("DATABASE", "Error: DB null."); return -1; }
        try { 
            this.db.exec(" \
                CREATE TABLE log ( \
                    timestamp DATETIME, \
                    type      STRING,   \
                    text      STRING (1024) \
                );");
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
            
        }
        return this;
    }

    select(sql) {
        if(!this.db) { utility.log("DATABASE", "Error: DB null."); return -1; }      
        
        let result = [];
        try { 
            result = this.db.prepare(sql).all();
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
        }
        return result;
    }

    log(tag, text) {
        if(!this.db) { utility.log("DATABASE", "Error: DB null."); return -1; }   

        let sql = "INSERT INTO log(timestamp, type, text) VALUES (DATETIME('now', 'localtime'), ?, ?)";
        try { 
            result = this.db.prepare(sql).run(tag, text);
        } catch(exception) {
            utility.log("DATABASE EXCEPTION", exception.toString());
        }
    }

}
    
module.exports = Database;
