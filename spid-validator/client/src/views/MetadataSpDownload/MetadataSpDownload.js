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
    let storeState = store.getState();

    service.getInfo(
      (info) => {

        if(info.metadata_url && info.metadata_xml) {
          this.setState({ url: info.metadata_url, xml: info.metadata_xml });
          store.dispatch(Actions.setMetadataSpURL(info.metadata_url)); 
          store.dispatch(Actions.setMetadataSpXML(info.metadata_xml)); 
        }

        if(info.metadata_url && !info.metadata_xml) {
          this.setState({ url: info.metadata_url });          
          this.downloadMetadata(info.metadata_url);
        }
      },

      (info)=> { // no session

        if(info.metadata_url && info.metadata_xml) {
          this.setState({ url: info.metadata_url, xml: info.metadata_xml });
          store.dispatch(Actions.setMetadataSpURL(info.metadata_url)); 
          store.dispatch(Actions.setMetadataSpXML(info.metadata_xml)); 
        }

        if(info.metadata_url && !info.metadata_xml) {
          this.setState({ url: info.metadata_url });
          this.downloadMetadata(info.metadata_url);
        }
      },

      (error)=> {
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
  

  downloadMetadata(url) {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    service.downloadMetadataSp(url,
      (metadata_xml) => { 
        this.setState({xml: metadata_xml});
        store.dispatch(Actions.setMetadataSpURL(url)); 
        store.dispatch(Actions.setMetadataSpXML(metadata_xml)); 
      }, 
      (error)   => { 
        //this.setState({xml: ""}); 
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
