import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import config_test from '../../../config/test.json';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Response extends Component {

  constructor(props) {
    super(props);
    this.newResponse(props.match.params.suiteid, props.match.params.caseid);  
  }	

  newResponse(suiteid, caseid) {
    this.state = {
      suiteid: suiteid,
      caseid: caseid,
      name: "",
      description: "",
      sign_response: null,      // null to grab default
      sign_assertion: null,     // null to grab default
      xml: "",
      xml_signed: "",
      params: [],
      response_destination: "",
      response_samlResponse: "",
      response_relayState: "",
      test_success: false     
    };  
  }

  static getDerivedStateFromProps(props, state) { 
    return {
      suiteid: props.match.params.suiteid,
      caseid: props.match.params.caseid,
      name: state.name,
      description: state.description,
      sign_response: state.sign_response,
      sign_assertion: state.sign_assertion,
      xml: state.xml,
      xml_signed: state.xml_signed,
      params: state.params,
      response_destination: state.response_destination,
      response_samlResponse: state.response_samlResponse,
      response_relayState: state.response_relayState,
      test_success: state.test_success
    }
  }

  componentDidMount() { 
    this.getTestResponse();    	
  }

  componentDidUpdate(prevProps) {
    if(this.state.suiteid!=prevProps.match.params.suiteid || 
        this.state.caseid!=prevProps.match.params.caseid) {
        this.newResponse(this.state.suiteid, this.state.caseid); 
        this.getTestResponse(); 
    }
  }

  getTestOptions() {
    let options = [];
    let testcases = config_test[this.state.suiteid]["cases"];

    for(let i in testcases) {
        options.push({
            value: i,
            label: testcases[i].name
        });
    }
    return options;
  }
 
  sendResponse(e) { 
    e.preventDefault();
    let destination = null;
    let audience = null;

    try {
        destination = this.state.params.filter((p)=> {
          return (p.key=="AssertionConsumerURL");
        })[0].val;

        audience = this.state.params.filter((p)=> {
          return (p.key=="Audience");
        })[0].val;
    } catch(exception) {
        Utility.log("ERROR", exception);
    }

    let ok = true;

    if(destination==null 
      || destination.trim()==""
      || !(destination.startsWith("http://") 
        || destination.startsWith("https://"))) { 
        
        ok = false; 
        Utility.showModal({
            title: "Attenzione",
            body: "Inserire un valore corretto per AssertionConsumerURL",
            isOpen: true
        });
    }

    if(audience==null
      || audience.trim()=="") { 

        ok = true;
        Utility.showModal({
            title: "Attenzione",
            body: "Inserire in Audience l'Entity ID del Service Provider oppure effettuare il download del Metadata del Service Provider",
            isOpen: true
        });
    }

    if(ok) {
      this.setState({
        response_destination: destination,
        response_samlResponse: new Buffer(this.state.xml_signed, "utf8").toString("base64"),
        response_relayState: "RELAY"
      }, ()=> {
        Utility.log("SEND Response", this.state);
        this.refs["form"].submit();
      });
    } 

  }

  setTestSuccess(success) {
    this.setState({test_success: success}, ()=> {
      let store = ReduxStore.getMain();
      store.dispatch(Actions.setResponseTestSuccess(this.state.caseid, this.state.test_success)); 
    });     
  }

  setSignResponse(e) {
    this.setState({sign_response: e}, ()=> {
      this.getTestResponse();
    });  
  }

  setSignAssertion(e) {
    this.setState({sign_assertion: e}, ()=> {
      this.getTestResponse();
    });  
  }  

  getTestResponse() {
    let service = Services.getMainService();	
    service.getTestResponse({
        suiteid: this.state.suiteid,
        caseid: this.state.caseid,
        params: this.state.params,
        sign_response: this.state.sign_response,
        sign_assertion: this.state.sign_assertion
      },
      (testResponse) => { 

        // retrieve test success
        let store = ReduxStore.getMain();
        let storeState = store.getState();
        Utility.log("ZZZ", storeState);
        let test_success = storeState.response_test_success[this.state.caseid];
        if(test_success==null) test_success = false;

        this.setState({
          name: testResponse.name,
          description: testResponse.description,
          xml: testResponse.compiled, 
          xml_signed: testResponse.compiled,
          params: testResponse.params,
          sign_response: testResponse.sign_response,
          sign_assertion: testResponse.sign_assertion,
          test_success: test_success
        }, ()=> {
          Utility.log("getTestResponse <-", this.state);
        });
      }, 
      (error)   => { 
        this.setState({
          xml: "",
          params: []
        });      
      }
    );    
  }

  setParam(key, val) {
    this.setState({
      params: this.state.params.map((p)=> {
        return (p.key==key)? {"key": key, "val": val, "attribute": p.attribute} : p
      })
    }, ()=> {
      this.getTestResponse();
    });
  }

  setResponseTemplate(templateId) {
    const { router } = this.context
    this.props.history.push("/response/" + this.state.suiteid + "/" + templateId);
  }

  render() { 
	return view(this);
  }
  
}

export default Response;
