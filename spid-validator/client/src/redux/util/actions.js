export const SET_BLOCKUI = "SET_BLOCKUI";
export const SET_APPLICATIONNAME = "SET_APPLICATIONNAME";
export const SET_AUTHENTICATED = "SET_AUTHENTICATED";
export const SET_APIKEY = "SET_APIKEY";
export const SET_PRINT = "SET_PRINT";

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

    static setPrint(value) {
        return {
            type: SET_PRINT,
            value: value
        }        
    }	

}

export default Actions;
