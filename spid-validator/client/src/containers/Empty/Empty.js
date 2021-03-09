import React, {Component} from 'react';
import {Link, Switch, Route, Redirect} from 'react-router-dom';
import {Container, Button, Modal, ModalHeader, ModalBody, ModalFooter} from 'reactstrap';
import BlockUi from 'react-block-ui';
import ReduxStore from "../../redux/store";
import Login from '../../views/Login/';
import Worksave from '../../views/Worksave/';
import Utility from '../../utility';


class Empty extends Component {

	constructor(props) {
		super(props);

		this.state = {
			blocking: false,
			modal_open: false,
			modal_title: "Attendere prego",
			modal_subtitle: "",
			modal_body: "Elaborazione in corso... Si prega di attendere. Grazie.",
			modal_btn_primary_func: ()=> {Utility.showModal({isOpen: false})},
			modal_btn_primary_text: "Chiudi",
			modal_btn_secondary_func: null,
			modal_btn_secondary_text: ""
		};

		this.utilStore = ReduxStore.getUtil();		
		this.modalStore = ReduxStore.getModal();		
		this.unsubscribeUtil = this.utilStore.subscribe(()=>this.onUtilStoreUpdate());
		this.unsubscribeModal = this.modalStore.subscribe(()=>this.onModalStoreUpdate());
	}	
	
	onUtilStoreUpdate() {
		let utilState = this.utilStore.getState(); 
		this.setState({
			blocking: utilState.blockUI
		}, ()=>{
			// state updated
		});
	}

	onModalStoreUpdate() {
		let modalState = this.modalStore.getState(); 
		Utility.log("State", this.state);

		Utility.log("New state", modalState);
		this.setState({
			modal_open: modalState.isOpen,
			modal_title: (modalState.title!=null && modalState.title!="")? modalState.title : this.state.modal_title,
			modal_subtitle: (modalState.subtitle!=null && modalState.subtitle!="")? modalState.subtitle : this.state.modal_subtitle,
			modal_body: (modalState.body!=null && modalState.body!="")? modalState.body : this.state.modal_body,
			modal_btn_primary_func: (modalState.btnPrimaryFunc!=null)? modalState.btnPrimaryFunc : this.state.modal_btn_primary_func,
			modal_btn_primary_text: (modalState.btnPrimaryFunc!=null && modalState.btnPrimaryText!=null && modalState.btnPrimaryText!="")? modalState.btnPrimaryText : this.state.modal_btn_primary_text,
			modal_btn_secondary_func: (modalState.btnSecondaryFunc!=null)? modalState.btnSecondaryFunc : this.state.modal_btn_secondary_func,
			modal_btn_secondary_text: (modalState.btnSecondaryFunc!=null && modalState.btnSecondaryText!=null && modalState.btnSecondaryText!="")? modalState.btnSecondaryText : this.state.modal_btn_secondary_text,
		}, ()=>{
			Utility.log("Updated state", this.state);
		});
	}	

	render() {    
    	return (
			<section id="main">
				<BlockUi tag="div" blocking={this.state.blocking}> 
					<div className="app">
						<Container fluid>
							<Switch>
							<Route path="/login" name="Login" component={Login}/>
                            <Route path="/worksave" name="Worksave" component={Worksave}/>
                            <Redirect from="/" to="/login"/>
							</Switch>
						</Container>
					</div>
				</BlockUi>
				<Modal isOpen={this.state.modal_open}>
					<ModalHeader>{this.state.modal_title}
						<span className="modal-subtitle" dangerouslySetInnerHTML={{__html:this.state.modal_subtitle}}></span>
					</ModalHeader>
					<ModalBody>
						<div dangerouslySetInnerHTML={{__html: this.state.modal_body}}></div>
					</ModalBody>
					<ModalFooter>
						{(this.state.modal_btn_primary_func!=null) &&
							<Button color="primary" onClick={ this.state.modal_btn_primary_func }>{ this.state.modal_btn_primary_text }</Button>
						}
						{(this.state.modal_btn_secondary_func!=null) &&
							<Button color="secondary" onClick={ this.state.modal_btn_secondary_func }>{ this.state.modal_btn_secondary_text }</Button>
						}
					</ModalFooter>
				</Modal>
			</section>			
		);
  }
  
}

export default Empty; 
