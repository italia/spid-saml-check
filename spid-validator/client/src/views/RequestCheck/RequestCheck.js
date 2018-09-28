import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class RequestCheck extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        test: props.test,
        result:null,
        detailview: false
    };  
  }	

  componentDidMount() { 
    this.checkRequest();
  }
  
  checkRequest() {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    Utility.blockUI(true);
    service.checkRequest(
      this.state.test,
      (test) => { 
        Utility.blockUI(false); 
        let result = null;
        switch(this.state.test) {
            case "strict": result = test.test.sp.authn_request_strict.TestAuthnRequest; break;
            case "certs": result = test.test.sp.authn_request_certs.TestAuthnRequestCertificates; break;
            case "extra": result = test.test.sp.authn_request_extra.TestAuthnRequestExtra; break;
        } 
        this.setState({
            result: result
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.setState({
            result: null
        });
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
      }
    );
  }

    setDetailView(detailed) {
        this.setState({
            detailview: detailed
        });
    }

    print() {
        Utility.print();
    }

  render() {    
	return view(this);
  }
}

export default RequestCheck;
