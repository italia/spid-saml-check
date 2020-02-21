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
        this.setState({ url: info.metadata });
        if(info.metadata!=null && info.metadata!='') 
          this.downloadMetadata(info.metadata);
      },
      (info)=> { // no session
        this.setState({ url: info.metadata });
        if(info.metadata!=null && info.metadata!='') 
          this.downloadMetadata(info.metadata);
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
