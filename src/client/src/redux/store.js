import { createStore, applyMiddleware } from "redux"
import initialState_Util from "./util/initialState";
import transitions_Util from "./util/transitions"
import initialState_Modal from "./modal/initialState";
import transitions_Modal from "./modal/transitions"
import initialState_Main from "./main/initialState";
import transitions_Main from "./main/transitions"
import Utility from "../utility";

class Store {

    constructor() {
        this.modal 	= createStore(transitions_Modal, initialState_Modal, applyMiddleware(logger));
        this.util 	= createStore(transitions_Util, initialState_Util, applyMiddleware(logger));
        this.main 	= createStore(transitions_Main, initialState_Main, applyMiddleware(logger));
        
        Utility.log("STORE", "STORE CREATED");
    }

    static getModal() {
        if(this.modal == null) {
            this.modal = createStore(transitions_Modal, initialState_Modal, applyMiddleware(logger));
            Utility.log("STORE", "MODAL STORE CREATED");
        }
        return this.modal;
    }    
    
    static getUtil() {
        if(this.util == null) {
            this.util = createStore(transitions_Util, initialState_Util, applyMiddleware(logger));
            Utility.log("STORE", "UTIL STORE CREATED");
        }
        return this.util;
    }    

    static getMain() {
        if(this.main == null) {
            this.main = createStore(transitions_Main, initialState_Main, applyMiddleware(logger));
            Utility.log("STORE", "MAIN STORE CREATED");
        }
        return this.main;
    }      
    
}

const logger = store => next => action => {
    Utility.log('STORE Current Action: ', action)
    let result = next(action)
    Utility.log('STORE Next State: ', store.getState())
    return result;
} 

export default Store;
