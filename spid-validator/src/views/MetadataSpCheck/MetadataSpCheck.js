import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class MetadataSpCheck extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        strict: null,
        certs: null
    };  
  }	

  componentDidMount() { 
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    Utility.blockUI(true);
    this.checkMetadata();
  }
  
  checkMetadata() {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    service.checkMetadataSp(
      (test) => { 
        Utility.blockUI(false);  
        this.setState({
            strict: test.strict,
            certs: test.certs
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.setState({
            strict: null,
            certs: null
        });
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
      }
    );
  }

  render() {    
	return view(this);
  }
}

export default MetadataSpCheck;
