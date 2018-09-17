import React, { Component } from 'react';
import view from "./view.js";
import Services from '../../services';
import Utility from '../../utility';
import sha256 from 'crypto-js/sha256';


class Worksave extends Component {

	constructor(props) {
		super(props);
    
		this.state = {

		}
	}	
  
    startContinue() {
        Utility.log("WorkSave", "Start CONTINUE");	
    }

    startNew() {
        Utility.log("WorkSave", "Start NEW");
        window.location="/#/request";
    }
    
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
  
	render() {    
		return view(this);
	}
  
}

export default Worksave;
