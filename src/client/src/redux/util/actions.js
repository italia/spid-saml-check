export const SET_BLOCKUI = "SET_BLOCKUI";
export const SET_APPLICATIONNAME = "SET_APPLICATIONNAME";
export const SET_AUTHENTICATED = "SET_AUTHENTICATED";
export const SET_APIKEY = "SET_APIKEY";
export const SET_PRINT = "SET_PRINT";
export const UPDATE_SIDEBAR = "UPDATE_SIDEBAR";

class Actions {

    static setBlockUI(value) {
        return {
            type: SET_BLOCKUI,
            value: value
        }        
    }
	
    static setUsersPageApplicationName(value) {
        return {
            type: SET_APPLICATIONNAME,
            value: value
        }        
    }	
	
    static setAuthenticated(value) {
        return {
            type: SET_AUTHENTICATED,
            value: value
        }        
    }	
	
    static setApikey(value) {
        return {
            type: SET_APIKEY,
            value: value
        }        
    }	

    static setPrint(enable, title) {
        return {
            type: SET_PRINT,
            enable: enable,
            title: title
        }        
    }		

    static updateSidebar(value) {
        return {
            type: UPDATE_SIDEBAR,
            value: value
        }        
    }	

}

export default Actions;
