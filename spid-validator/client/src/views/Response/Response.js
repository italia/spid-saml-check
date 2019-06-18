import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import config_test from '../../../../config/test.json';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Response extends Component {

  constructor(props) {
    super(props);

    // search for first test not yet executed
    if(props.match.params.suiteid==null || props.match.params.caseid==null) {

        let store = ReduxStore.getMain();
        let storeState = store.getState();
        let testDone = storeState.response_test_done;
        let testCases = config_test["test-suite-1"].cases;     
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
        Utility.log("LOAD RESPONSE", nextTest);
        this.newResponse("test-suite-1", nextTest);

    } else {
        Utility.log("LOAD RESPONSE", props.match.params.caseid);
        this.newResponse(props.match.params.suiteid, props.match.params.caseid);  
    }
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
      test_done: false,
      test_success: false, 
      test_note: ""   
    };  
  }

  static getDerivedStateFromProps(props, state) { 
    let suiteid = (props.match.params.suiteid!=null)? props.match.params.suiteid : state.suiteid;
    let caseid = (props.match.params.caseid!=null)? props.match.params.caseid : state.caseid;

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
    let suiteid = (prevProps.match.params.suiteid!=null)? prevProps.match.params.suiteid : this.state.suiteid;
    let caseid = (prevProps.match.params.caseid!=null)? prevProps.match.params.caseid : this.state.caseid;

    if(this.state.suiteid!=suiteid || 
        this.state.caseid!=caseid) {
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
      service.saveWorkspace(store.getState());
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
      service.saveWorkspace(store.getState());
    });     
  }

  setTestNote(note) {
    this.setState({test_note: note}, ()=> {
      let store = ReduxStore.getMain();
      store.dispatch(Actions.setResponseTestNote(this.state.caseid, this.state.test_note)); 

      let service = Services.getMainService();
      service.saveWorkspace(store.getState());
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

        let test_done = storeState.response_test_done[this.state.caseid];
        if(test_done==null) test_done = false;

        let test_success = storeState.response_test_success[this.state.caseid];
        if(!test_done || test_success==null) test_success = false;

        let test_note = storeState.response_test_note[this.state.caseid];
        if(!test_note || test_note==null) test_note = "";


        this.setState({
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
    this.props.history.push("/response/" + this.state.suiteid + "/" + templateId);
    this.newResponse(this.state.suiteid, templateId); 
    this.getTestResponse();
  }

  render() { 
	return view(this);
  }
  
}

export default Response;
