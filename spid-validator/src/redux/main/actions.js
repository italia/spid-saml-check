export const SET_REQUEST_XML = "SET_REQUEST_XML";

class Actions {

    static setRequestXML(value) {
        return {
            type: SET_REQUEST_XML,
            value: value
        }        
    }

}

export default Actions;