import CircularJSON from "circular-json";
import ReduxStore from "./redux/store";
import ModalActions from "./redux/modal/actions";
import UtilActions from "./redux/util/actions";
import sha256 from 'crypto-js/sha256';


class Utility {

    static isObject(obj) {
        return typeof obj == 'object' || Array.isArray(obj);
    }

    static log(tag, text) {
        console.log("\n\n>>> " + tag);
        if(text!=null) console.log(CircularJSON.stringify(text, null, 4));
    }

    static showModal(data) {
        let modal = ReduxStore.getModal();
        modal.dispatch(
            ModalActions.setInfo({
                title: data.title,
                subtitle: data.subtitle,
                body: data.body,
                isOpen: data.isOpen,
                hideButtons: data.hideButtons,
                btnPrimaryFunc: data.btnPrimaryFunc,
                btnPrimaryText: data.btnPrimaryText,
                btnSecondaryFunc: data.btnSecondaryFunc,
                btnSecondaryText: data.btnSecondaryText,
                switch1: data.switch1,
                switch1Func: data.switch1Func,
                switch1Text: data.switch1Text,
                switch2: data.switch2,
                switch2Func: data.switch2Func,
                switch2Text: data.switch2Text,
                inputVisible: data.inputVisible,
                inputEnabled: data.inputEnabled,
                input: data.input, 
                inputFunc: data.inputFunc
            })
        );        
    }


    static blockUI(value) {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setBlockUI(value));
    }	

    static print(title) {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setPrint(true, title));
    }

    static printed() {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setPrint(false, ""));
    }
	
	static isAuthenticated() {
		let util = ReduxStore.getUtil();
        let state = util.getState();
        return state.authenticated;
    }
    
    static setApikey(apikey) {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setAuthenticated(apikey!=null));
		util.dispatch(UtilActions.setApikey(apikey));		
    }    
	
	static getApikey() {
		let util = ReduxStore.getUtil();
		let state = util.getState();
		return state.apikey;
    }
 
}

export default Utility;
