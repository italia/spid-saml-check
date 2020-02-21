import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class MetadataSpDownload extends Component {

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
    //let storeState = store.getState();

    service.getInfo(
      (info) => { 
        if(info.metadata!=null && info.metadata_xml!=null) {
          this.setState({
            url: info.metadata,
            xml: info.metadata_xml
          });
  
          store.dispatch(Actions.setMetadataSpURL(info.metadata)); 
          store.dispatch(Actions.setMetadataSpXML(info.metadata_xml));
        } 
      }
    );
  }
  
    render() {    
		return view(this);
  }
  

  downloadMetadata(url) {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    service.downloadMetadataSp(url,
      (metadata) => { 
        this.setState({xml: metadata});
        store.dispatch(Actions.setMetadataSpURL(url)); 
        store.dispatch(Actions.setMetadataSpXML(metadata)); 
      }, 
      (error)   => { 
        this.setState({xml: ""});
        store.dispatch(Actions.setMetadataSpURL(""));
        store.dispatch(Actions.setMetadataSpXML(""));
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
      }
    );
  }

}

export default MetadataSpDownload;
