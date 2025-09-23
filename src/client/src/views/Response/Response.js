import React, { Component } from 'react';
import{ withRouter } from '../../withRouter';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";
import { Buffer } from 'buffer';
import config_test from '../../../../config/test.json';


class Response extends Component {

  constructor(props) {
    super(props);

    Utility.log("PROPS", props);
    let suiteid = props.testsuite? props.testsuite : "test-suite-1";
    this.setResponse(suiteid);
  }	

  // search for first test not yet executed
  getNextTest(suiteid) {
    let store = ReduxStore.getMain();
    let storeState = store.getState();
    let testDone = storeState.response_test_done;
    let testCases = config_test[suiteid].cases;     
    let nextTest = null;
    for(let key in testCases) {
        let executed = false;
        for(let key_done in testDone) {
            if(key==key_done) executed = true;
        }
        if(!executed) {
            nextTest = key;
            break;
        }
    }
    if(nextTest==null) nextTest = "1";
    
    return nextTest;
  }

  setResponse(suiteid, caseid=null) {
    caseid = caseid ?? this.getNextTest(suiteid);

    Utility.log("SET RESPONSE (" + suiteid + ", " + caseid + ")");
    this.state = {
      suiteid: suiteid,
      suite_description: "",
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
      test_done: false,
      test_success: false, 
      test_note: ""   
    }
  }

  newResponse(suiteid, caseid=null, next=null) {
    caseid = caseid ?? this.getNextTest(suiteid);

    Utility.log("NEW RESPONSE (" + suiteid + ", " + caseid + ")");
    this.setState({
      suiteid: suiteid,
      suite_description: "",
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
      test_done: false,
      test_success: false, 
      test_note: ""   
    }, ()=> {
      if(next!=null) next();
    });  
  }

  static getDerivedStateFromProps(props, state) { 
    let suiteid = props.testsuite? props.testsuite : "test-suite-1";
    let caseid = state.caseid? state.caseid : 1;

    return {
      suiteid: suiteid,
      caseid: caseid,
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
      test_done: state.test_done,
      test_success: state.test_success,
      test_note: state.test_note
    }
  }

  componentDidMount() { 
    this.getTestResponse();    	
  }

  componentDidUpdate(prevProps) {
    Utility.log("componentDidUpdate PARAMS: ", prevProps);
    let suiteid = prevProps.testsuite? prevProps.testsuite : "test-suite-1";

    if(this.state.suiteid!=suiteid) {
      this.newResponse(this.state.suiteid, null, ()=> {
        this.getTestResponse(); 
      }); 
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
        /*
        Utility.showModal({
            title: "Attenzione",
            body: "Inserire in Audience l'Entity ID del Service Provider oppure effettuare il download del Metadata del Service Provider",
            isOpen: true
        });
        */
    }

    if(ok) {
      this.setState({
        response_destination: destination,
        response_samlResponse: new Buffer(this.state.xml_signed, "utf8").toString("base64")
      }, ()=> {
        Utility.log("SEND Response", this.state);
        this.refs["form"].submit();
      });
    } 

  }

  setTestDone(done) {
    this.setState({test_done: done}, ()=> {
      let store = ReduxStore.getMain();
      store.dispatch(Actions.setResponseTestDone(this.state.caseid, this.state.test_done)); 

      let service = Services.getMainService();

      // workaround delete lastcheck and validation info to avoid saveStore issue
      let new_store = store.getState();
      delete new_store.metadata_validation_xsd;
      delete new_store.metadata_validation_strict;
      delete new_store.metadata_validation_certs;
      delete new_store.metadata_validation_extra;
      delete new_store.request_validation_strict;
      delete new_store.request_validation_certs;
      delete new_store.request_validation_extra;

      service.saveWorkspace(new_store);
    });  
    
    if(!done) {
        this.setTestSuccess(false);   
        this.setTestNote("");
    }
  }

  setTestSuccess(success) {
    this.setState({test_success: success}, ()=> {
      let store = ReduxStore.getMain();
      store.dispatch(Actions.setResponseTestSuccess(this.state.caseid, this.state.test_success)); 

      let service = Services.getMainService();

      // workaround delete lastcheck and validation info to avoid saveStore issue
      let new_store = store.getState();
      delete new_store.metadata_validation_xsd;
      delete new_store.metadata_validation_strict;
      delete new_store.metadata_validation_certs;
      delete new_store.metadata_validation_extra;
      delete new_store.request_validation_strict;
      delete new_store.request_validation_certs;
      delete new_store.request_validation_extra;

      service.saveWorkspace(new_store); 
    });     
  }

  setTestNote(note) {
    this.setState({test_note: note}, ()=> {
      let store = ReduxStore.getMain();
      store.dispatch(Actions.setResponseTestNote(this.state.caseid, this.state.test_note)); 

      let service = Services.getMainService();

      // workaround delete lastcheck and validation info to avoid saveStore issue
      let new_store = store.getState();
      delete new_store.metadata_validation_xsd;
      delete new_store.metadata_validation_strict;
      delete new_store.metadata_validation_certs;
      delete new_store.metadata_validation_extra;
      delete new_store.request_validation_strict;
      delete new_store.request_validation_certs;
      delete new_store.request_validation_extra;

      service.saveWorkspace(new_store);
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
    Utility.blockUI(true);
    service.getTestResponse({
        suiteid: this.state.suiteid,
        caseid: this.state.caseid,
        params: this.state.params,
        sign_response: this.state.sign_response,
        sign_assertion: this.state.sign_assertion
      },
      (testResponse) => { 
        Utility.blockUI(false);

        // retrieve test success
        let store = ReduxStore.getMain();
        let storeState = store.getState();

        let test_done = storeState.response_test_done[this.state.caseid];
        if(test_done==null) test_done = false;

        let test_success = storeState.response_test_success[this.state.caseid];
        if(!test_done || test_success==null) test_success = false;

        let test_note = storeState.response_test_note[this.state.caseid];
        if(!test_note || test_note==null) test_note = "";


        this.setState({
          suite_description: testResponse.testsuite,
          name: testResponse.name,
          description: testResponse.description,
          xml: testResponse.compiled, 
          xml_signed: testResponse.compiled,
          params: testResponse.params,
          sign_response: testResponse.sign_response,
          sign_assertion: testResponse.sign_assertion,
          test_done: test_done,
          test_success: test_success,
          test_note: test_note,
          response_relayState: testResponse.relayState
        }, ()=> {
          Utility.log("getTestResponse <-", this.state);
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        
        this.setState({
          xml: "",
          params: []
        });   
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
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
    //this.props.navigate("/response/" + this.state.suiteid + "/" + templateId);
    this.newResponse(this.state.suiteid, templateId, ()=> {
      this.getTestResponse();
    }); 
  }

  render() { 
	return view(this);
  }
  
}

export default withRouter(Response);
