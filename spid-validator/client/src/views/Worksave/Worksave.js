import React, { Component } from 'react';
import sha256 from 'crypto-js/sha256';
import view from "./view.js";
import Services from '../../services';
import Utility from '../../utility';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Worksave extends Component {

	constructor(props) {
		super(props);
        this.state = { workspace: false };

        let service = Services.getMainService();
        service.loadWorkspace(
        (data)=> {
            // no workspace found
            if(!data) window.location="/#/request";
            else this.setState({ workspace: data });
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
        window.location="/#/request";
    }
    
/*
	login() {	
		let service = Services.getMainService();

		let field_compiled = true;
		this.setState({warn_user: '', warn_password: ''});
		if(this.state.login_user==null || this.state.login_user=="") { this.setState({warn_user: 'warn'}); field_compiled = false; }
		if(this.state.login_password==null || this.state.login_password=="") { this.setState({warn_password: 'warn'}); field_compiled = false; }
		
		if(field_compiled) {
			Utility.blockUI(true);
			service.authenticate({
				user: this.state.login_user, 
				password: this.state.login_password
			}, 
			(data)=>{
				Utility.blockUI(false);
				Utility.setApikey(data);
				Utility.log("Login result", Utility.isAuthenticated());	
				if(Utility.isAuthenticated()) {
					window.location="/#/dashboard";
				}			
			}, 
			(error)=> {
				Utility.blockUI(false);
				Utility.showModal({
					title: "Login",
					subtitle: "Accesso non consentito",
					body: error,
					isOpen: true
				}); 
				Utility.log("login", error);	
				this.setState({warn_user: 'warn', warn_password: 'warn'});			
			});

		}
	}
*/
  
	render() {    
		if(this.state.workspace!=false) {
            return view(this);
        } else return (
            <div>Loading...</div>
        );
	}
  
}

export default Worksave;
