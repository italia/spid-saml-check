import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Worksave extends Component {

	constructor(props) {
		super(props);
        this.state = { workspace: false };
	}

    componentDidMount() {
        let service = Services.getMainService();
        let store = ReduxStore.getMain();

        service.loadWorkspace(
        (data)=> {
            // no workspace found
            if(!data) this.props.history.push('/request');
            else this.setState({ workspace: data });
        },
        ()=> {
            this.props.history.push('/metadata-sp-download');
        },
        (error)=> {
            Utility.showModal({
                title: "Attenzione, si è verificato un errore",
                body: error,
                isOpen: true
            });
        });
    }
  
    startContinue() {
        Utility.log("WorkSave", "Start CONTINUE");	
        let store = ReduxStore.getMain();
        store.dispatch(Actions.setStore(this.state.workspace)); 
        this.props.history.push('/request');
    }

    startNew() {
        Utility.log("WorkSave", "Start NEW");
        let service = Services.getMainService();
		service.resetWorkspace();
        this.props.history.push('/request');
    }
  
	render() {    
		if(this.state.workspace!=false) {
            return view(this);
        } else return (
            <div>Loading...</div>
        );
	}
  
}

export default Worksave;
