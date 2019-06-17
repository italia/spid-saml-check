import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Request extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
 
    };  
  }	

  componentDidMount() { 
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    let request = service.getRequest(
      (request) => { 
        this.setState({xml: request.xml});
        store.dispatch(Actions.setRequestXML(request.xml)); 
      }, 
      (error)   => { 
        this.setState({xml: ""});
        store.dispatch(Actions.setRequestXML(""));
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

export default Request;
