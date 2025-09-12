import React, { Component } from 'react';
import { Link, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Container, Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import ScrollToTop from "react-scroll-to-top";
import { BlockUI } from "ns-react-block-ui";

import Header from '../../components/Header/';
import Sidebar from '../../components/Sidebar/';
import Breadcrumb from '../../components/Breadcrumb/';
import Aside from '../../components/Aside/';
import Footer from '../../components/Footer/';

import ReduxStore from "../../redux/store";
import Utility from '../../utility';
import Services from '../../services';
import config from '../../config.json';

var moment = require('moment');
moment.locale('it');

import './switches.css'; 
import "./style.css";


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
			modal_btn_secondary_text: "",
			modal_switch1: false,
			modal_switch1_func: null,
			modal_switch1_text: "",
			modal_switch2: false,
			modal_switch2_func: null,
			modal_switch2_text: "",
			modal_input_visible: false,
			modal_input_enabled: false,
			modal_input: "",
			modal_input_func: null,
			modal_switch1_control: null,

			print: false,
            infoprint_issuer: "-",
            infoprint_metadata: "-",
			infoprint_datetime: "-",
			user: ""
		};

		this.utilStore = ReduxStore.getUtil();		
		this.modalStore = ReduxStore.getModal();		
		this.unsubscribeUtil = this.utilStore.subscribe(()=>this.onUtilStoreUpdate());
		this.unsubscribeModal = this.modalStore.subscribe(()=>this.onModalStoreUpdate());
	}	

	componentDidMount() {
		let service = Services.getMainService();
		service.getInfo(
			(info)=> { 
				this.setState({user: info.user});
			},
			(info)=> {
				this.setState({user: info.user});

				// here let to enter even if metadata configuration is not present
				/*
				Utility.showModal({
					title: "Warning",
					body: "Session is expired. Please reauthenticate",
					isOpen: true,
					btnPrimaryFunc: ()=> {
						window.location = config.basepath;
					}
				});
				*/
			},
			(error)=> {
				console.log(error);
			}
		);
	}
	
	onUtilStoreUpdate() {
		let utilState = this.utilStore.getState(); 
		this.setState({
			blocking: utilState.blockUI,
			print: utilState.print,
		}, ()=>{
			// state updated
            if(this.state.print) {
                this.getInfo(utilState.printTitle);
                this.setState({
					print: false
                });
                Utility.printed();
            }
		});
	}

	onModalStoreUpdate() {
		let modalState = this.modalStore.getState(); 
		//Utility.log("State", this.state);
  
		//Utility.log("New state", modalState);
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
			modal_switch1: modalState.switch1,
			modal_switch1_func: modalState.switch1Func,
			modal_switch1_text: modalState.switch1Text,
			modal_switch2: modalState.switch2,
			modal_switch2_func: modalState.switch2Func,
			modal_switch2_text: modalState.switch2Text,
			modal_input_visible: modalState.inputVisible,
			modal_input_enabled: modalState.inputEnabled,
			modal_input: modalState.input,
			modal_input_func: modalState.inputFunc,
			modal_switch1_control: modalState.switch1
		}, ()=>{
			//Utility.log("Updated state", this.state);
		});
	}	

    getInfo(title) {
        let service = Services.getMainService();
        service.getInfo(
          (info)=> {  
            this.setState({
                infoprint_issuer: info.issuer,
                infoprint_metadata: info.metadata,
                infoprint_datetime: moment().format('dddd DD/MM/YYYY - HH:mm:ss')
            }, ()=> {
				let doctitle = document.title;
				document.title = "_" + moment().format("YYYYMMDD") + "_" + title + "-";
				window.print();
				document.title = doctitle;
            });
		  }, 
		  (info)=> { // no session
			this.setState({
                infoprint_issuer: 'N/A (validazione solo metadata)',
                infoprint_metadata: info.metadata,
                infoprint_datetime: moment().format('dddd DD/MM/YYYY - HH:mm:ss')
            }, ()=> {
				let doctitle = document.title;
				document.title = "_" + moment().format("YYYYMMDD") + "_" + title + "-";
				window.print();
				document.title = doctitle;
            });
		  },
          (error)=> { ;
            Utility.showModal({
                title: "Errore",
                body: error,
                isOpen: true
            });
          }
        );
    }

	render() {    
		
		if(!Utility.isAuthenticated()) {
			Utility.log("AUTH CHECK", "User not authenticated, redirect to login");
			window.location="/login";
			return null;
			
		} else {
			Utility.log("AUTH CHECK", "User authenticated, you can continue");

			return (
				<div id="main" className="container-main">
					<BlockUI tag="div" blocking={this.state.blocking} mode="full-screen" loader="default"> 
						<div className="app">
							<Header />
							<div className="app-body">
								<Sidebar {...this.props}/> 
								
								<main className="main">
									<img className="agid-logo-print" src="/../../img/spid-agid-logo-lb.png" />

									<Breadcrumb {...this.props} user={this.state.user}/>	
									<Container fluid>
										<Outlet />
									</Container>
									
									<div className="info-print">
										User: {this.state.user}<br/>
										Issuer: {this.state.infoprint_issuer} <br/>
										Metadata: {this.state.infoprint_metadata} <br/>
										Report generato il: {this.state.infoprint_datetime}
									</div>
									
									<ScrollToTop smooth className="btn btn-lg btn-primary" component={
										<span className="fa fa-chevron-up"></span>
									} />		
												
								</main>
								<Aside />
							</div>
							<Footer />
						</div>
					</BlockUI>

					<Modal isOpen={this.state.modal_open}>
						<ModalHeader>{this.state.modal_title}
							<span className="modal-subtitle" dangerouslySetInnerHTML={{__html:this.state.modal_subtitle}}></span>
						</ModalHeader>
						<ModalBody>
							<div dangerouslySetInnerHTML={{__html: this.state.modal_body}}></div>

							{(this.state.modal_switch1_func!=null || this.state.modal_switch2_func!=null) &&
								<p><b>Assessment</b></p>
							}

							{(this.state.modal_switch1_func!=null) &&
								<div>
									<label className="switch switch-success me-3">
										<input type="checkbox" className="switch-input" 
											defaultChecked={this.state.modal_switch1}
											onChange={(e)=>{
												this.setState({modal_switch1_control: e.target.checked});
												this.state.modal_switch1_func(e.target.checked)}
											}>
										</input>
										<span className="switch-slider"></span>
									</label>
									<span className="align-super">{this.state.modal_switch1_text}</span>
								</div>
							}

							{(this.state.modal_switch2_func!=null && this.state.modal_switch1_control) &&
								<div>  
									<label className="switch switch-success me-3">
										<input type="checkbox" className="switch-input" 
											defaultChecked={this.state.modal_switch2}
											onChange={(e)=>{this.state.modal_switch2_func(e.target.checked)}}>
										</input>
										<span className="switch-slider"></span>
									</label>
									<span className="align-super">{this.state.modal_switch2_text}</span>
								</div>
							}

							{this.state.modal_input_visible &&
								<div>
									<p className="mt-3"><b>Notes</b><br/>
									<textarea className="modal-textarea" disabled={!this.state.modal_input_enabled || !this.state.modal_input_func}
										onChange={(e)=> {this.state.modal_input_func(e.target.value)}}
										defaultValue={this.state.modal_input} >
									</textarea>
									</p>
								</div>
							}

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
