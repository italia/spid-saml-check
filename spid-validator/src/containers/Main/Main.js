import React, {Component} from 'react';
import {Link, Switch, Route, Redirect} from 'react-router-dom';
import {Container} from 'reactstrap';
import BlockUi from 'react-block-ui';

import Header from '../../components/Header/';
import Sidebar from '../../components/Sidebar/';
import Breadcrumb from '../../components/Breadcrumb/';
import Aside from '../../components/Aside/';
import Footer from '../../components/Footer/';
import MetadataSpDownload from '../../views/MetadataSpDownload/';
import MetadataSpCheck from '../../views/MetadataSpCheck/';
import Request from '../../views/Request/';
import RequestCheck from '../../views/RequestCheck/';
import Response from '../../views/Response/';

import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import ScrollToTop from 'react-scroll-up';

import ReduxStore from "../../redux/store";
import Utility from '../../utility';


new ReduxStore();

class Main extends Component {

	constructor(props) {
		super(props);

		this.state = {
			blocking: false,
			modal_open: false,
            modal_hide_buttons: false,
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
			modal_hide_buttons: modalState.hideButtons,
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
		
		if(!Utility.isAuthenticated()) {
			Utility.log("AUTH CHECK", "User not authenticated, redirect to login");
			window.location="/#/login";
			return null;
			
		} else {
			Utility.log("AUTH CHECK", "User authenticated, you can continue");
			return (
				<div id="main">
					<BlockUi tag="div" blocking={this.state.blocking}> 
						<div className="app">
							<Header />
							<div className="app-body">
								<Sidebar {...this.props}/>
								<main className="main">
								<Breadcrumb />
								<Container fluid>
									<Switch>
									<Route path="/metadata-sp-download" name="Metadata Service Provider / Download" component={MetadataSpDownload}/>
									<Route path="/metadata-sp-check-strict" key="metadata-sp-check-strict" render={()=><MetadataSpCheck test="strict" />} />
									<Route path="/metadata-sp-check-certs" key="metadata-sp-check-certs" render={()=><MetadataSpCheck test="certs" />} />
									<Route path="/metadata-sp-check-extra" key="metadata-sp-check-extra" render={()=><MetadataSpCheck test="extra" />} />
									<Route path="/request" component={Request}/>
									<Route path="/request-check-strict" key="request-check-strict" render={()=><RequestCheck test="strict" />} />
									<Route path="/request-check-certs" key="request-check-certs" render={()=><RequestCheck test="certs" />} />
									<Route path="/request-check-extra" key="request-check-extra" render={()=><RequestCheck test="extra" />} />
									<Route path="/response/:suiteid/:caseid" component={Response}/>
									<Redirect from="/" to="/request"/>
									</Switch>
								</Container>
								<ScrollToTop showUnder={160}>
									<button className="btn btn-lg btn-primary"><span className="icon-arrow-up"></span></button>
								</ScrollToTop>							
								</main>
								<Aside />
							</div>
							<Footer />
						</div>
					</BlockUi>
					<Modal isOpen={this.state.modal_open}>
						<ModalHeader>{this.state.modal_title}
							<span className="modal-subtitle" dangerouslySetInnerHTML={{__html:this.state.modal_subtitle}}></span>
						</ModalHeader>
						<ModalBody>
							<div dangerouslySetInnerHTML={{__html: this.state.modal_body}}></div>
						</ModalBody>
                        {(!this.state.modal_hide_buttons) &&
						    <ModalFooter>
							    {(this.state.modal_btn_primary_func!=null) &&
								    <Button color="primary" onClick={ this.state.modal_btn_primary_func }>{ this.state.modal_btn_primary_text }</Button>
							    }
							    {(this.state.modal_btn_secondary_func!=null) &&
								    <Button color="secondary" onClick={ this.state.modal_btn_secondary_func }>{ this.state.modal_btn_secondary_text }</Button>
							    }
						    </ModalFooter>
                        }
					</Modal>
				</div>			
			);
		}
  }
  
}

export default Main; 
