import initialState from "./initialState";
import * as Type from "./actions";


function transitions(state = initialState, action) {
 
    switch(action.type) {

        case Type.SET_INFO:
            state = Object.assign({}, state, {
                title: action.value.title,
                subtitle: action.value.subtitle,
                body: action.value.body,
                isOpen: action.value.isOpen,
                hideButtons: action.value.hideButtons,
                btnPrimaryFunc: action.value.btnPrimaryFunc,
                btnPrimaryText: action.value.btnPrimaryText,
                btnSecondaryFunc: action.value.btnSecondaryFunc,
                btnSecondaryText: action.value.btnSecondaryText
            });
            break;     
            
        default: 
            state = Object.assign({}, state);
            break;  
    }

    return state;
}

export default transitions;
