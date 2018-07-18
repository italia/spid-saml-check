import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class MetadataSp extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        url: "https://",
        xml: ""
    };  
  }	

  componentDidMount() { 
    let service = Services.getMainService();
    let store = ReduxStore.getMain();
    let storeStatestore = store.getState();
    this.setState({
        url: storeStatestore.metadata_SP_URL,
        xml: storeStatestore.metadata_SP_XML
    });
  }
  
	render() {    
		return view(this);
  }
  
  getMetadata(url) {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    service.getMetadataSp(url,
      (metadata) => { 
        this.setState({xml: metadata});
        store.dispatch(Actions.setMetadataSpURL(url)); 
        store.dispatch(Actions.setMetadataSpXML(metadata)); 
      }, 
      (error)   => { 
        this.setState({xml: ""});
        store.dispatch(Actions.setMetadataSpURL(""));
        store.dispatch(Actions.setMetadataSpXML(""));
      }
    );
  }

}

export default MetadataSp;
