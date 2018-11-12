export const SET_REQUEST_XML = "SET_REQUEST_XML";
export const SET_METADATA_SP_URL = "SET_METADATA_SP_URL";
export const SET_METADATA_SP_XML = "SET_METADATA_SP_XML";
export const SET_RESPONSE_TEST_DONE = "SET_RESPONSE_TEST_DONE";
export const SET_RESPONSE_TEST_SUCCESS = "SET_RESPONSE_TEST_SUCCESS";
export const SET_RESPONSE_TEST_NOTE = "SET_RESPONSE_TEST_NOTE";
export const SET_STORE = "SET_STORE";

class Actions {

    static setRequestXML(value) {
        return {
            type: SET_REQUEST_XML,
            value: value
        }        
    }

    static setMetadataSpURL(value) {
        return {
            type: SET_METADATA_SP_URL,
            value: value
        }        
    }

    static setMetadataSpXML(value) {
        return {
            type: SET_METADATA_SP_XML,
            value: value
        }        
    }

    static setResponseTestDone(key, value) {
        return {
            type: SET_RESPONSE_TEST_DONE,
            key: key,
            value: value
        }        
    }

    static setResponseTestSuccess(key, value) {
        return {
            type: SET_RESPONSE_TEST_SUCCESS,
            key: key,
            value: value
        }        
    }

    static setResponseTestNote(key, value) {
        return {
            type: SET_RESPONSE_TEST_NOTE,
            key: key,
            value: value
        }        
    }

    static setStore(value) {
        return {
            type: SET_STORE,
            value: value
        }        
    }
}

export default Actions;
