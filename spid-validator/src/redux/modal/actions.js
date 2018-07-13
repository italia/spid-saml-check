export const SET_INFO = "SET_INFO";

class Actions {

    static setInfo(value) {
        return {
            type: SET_INFO,
            value: value
        }        
    }

}

export default Actions;