import CircularJSON from "circular-json";
import ReduxStore from "./redux/store";
import ModalActions from "./redux/modal/actions";
import UtilActions from "./redux/util/actions";
import sha256 from 'crypto-js/sha256';


class Utility {

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
                btnSecondaryText: data.btnSecondaryText
            })
        );        
    }


    static blockUI(value) {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setBlockUI(value));
    }	

    static print() {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setPrint(true));
    }

    static printed() {
        let util = ReduxStore.getUtil();
        util.dispatch(UtilActions.setPrint(false));
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
