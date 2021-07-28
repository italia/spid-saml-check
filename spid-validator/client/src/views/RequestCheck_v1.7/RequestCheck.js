import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";
import moment from 'moment';


class RequestCheck extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        test: props.test,
        report: null,
        report_datetime: null,
        detailview: false
    };  
  }	

  componentDidMount() { 
    this.getLastCheck();
  }

  getLastCheck() {
    let service = Services.getMainService(); 
    Utility.blockUI(true);
    service.getLastCheckRequest(
      this.state.test,
      (lastcheck) => { 
        Utility.blockUI(false); 
        let report = null;
        switch(this.state.test) {
            case "strict": report = lastcheck.report.test.sp.authn_request_strict.TestAuthnRequest; break;
            case "certs": report = lastcheck.report.test.sp.authn_request_certs.TestAuthnRequestCertificates; break;
            case "extra": report = lastcheck.report.test.sp.authn_request_extra.TestAuthnRequestExtra; break;
        } 
        this.setState({
          report: report,
          report_datetime: moment(lastcheck.datetime).format('DD/MM/YYYY HH:mm:ss')
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.checkRequest();
        /*
        this.setState({
            result: null
        });
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
        */
      }
    );
  }
  
  checkRequest() {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    Utility.blockUI(true);
    service.checkRequest(
      this.state.test,
      (check) => { 
        Utility.blockUI(false); 
        let report = null;
        switch(this.state.test) {
            case "strict": report = check.report.test.sp.authn_request_strict.TestAuthnRequest; break;
            case "certs": report = check.report.test.sp.authn_request_certs.TestAuthnRequestCertificates; break;
            case "extra": report = check.report.test.sp.authn_request_extra.TestAuthnRequestExtra; break;
        } 
        this.setState({
          report: report,
          report_datetime: moment(check.datetime).format('DD/MM/YYYY HH:mm:ss')
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.setState({
          report: null,
          report_datetime: null
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
      Utility.print("request-" + this.state.test);
    }

  render() {    
	return view(this);
  }
}

export default RequestCheck;
