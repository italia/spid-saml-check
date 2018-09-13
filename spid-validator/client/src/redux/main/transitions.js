import initialState from "./initialState";
import * as Type from "./actions";


function transitions(state = initialState, action) {
 
    switch(action.type) {

        case Type.SET_REQUEST_XML:
            state = Object.assign({}, state, {
                request_XML: action.value
            });
            break;     

        case Type.SET_METADATA_SP_URL:
            state = Object.assign({}, state, {
                metadata_SP_URL: action.value
            });
            break

        case Type.SET_METADATA_SP_XML:
            state = Object.assign({}, state, {
                metadata_SP_XML: action.value
            });
            break;     

        case Type.SET_RESPONSE_TEST_SUCCESS:
            let response_test_success = state.response_test_success;
            response_test_success[action.key] = action.value;

            state = Object.assign({}, state, {
                response_test_success: response_test_success
            });
            break; 
            
        default: 
            state = Object.assign({}, state);
            break;  
    }

    return state;
}

export default transitions;
