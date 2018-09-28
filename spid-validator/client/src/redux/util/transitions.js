import initialState from "./initialState";
import * as Type from "./actions";


function transitions(state = initialState, action) {
 
    switch(action.type) {

        case Type.SET_BLOCKUI:
            state = Object.assign({}, state, {
                blockUI: action.value
            });
            break;     
			
        case Type.SET_APPLICATIONNAME:
            state = Object.assign({}, state, {
                applicationName: action.value
            });
            break; 			
            
        case Type.SET_AUTHENTICATED:
            state = Object.assign({}, state, {
                authenticated: action.value
            });
            break; 	
			
        case Type.SET_APIKEY:
            state = Object.assign({}, state, {
                apikey: action.value
            });
            break; 		

        case Type.SET_PRINT:
            state = Object.assign({}, state, {
                print: action.value
            });
            break;		
			
        default: 
            state = Object.assign({}, state);
            break;  
    }

    return state;
}

export default transitions;
