import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';


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
      response_relayState: ""      
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
      response_relayState: state.response_relayState
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
 
  sendResponse(e) { 
    e.preventDefault();
    let destination = this.state.params.filter((p)=> {
      return (p.key=="AssertionConsumerURL");
    })[0].val;
    let audience = this.state.params.filter((p)=> {
      return (p.key=="Audience");
    })[0].val;

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

        ok = false;
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
        this.setState({
          name: testResponse.name,
          description: testResponse.description,
          xml: testResponse.compiled, 
          xml_signed: testResponse.compiled,
          params: testResponse.params,
          sign_response: testResponse.sign_response,
          sign_assertion: testResponse.sign_assertion
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
    this.props.history.push("/response/test-suite-1/" + templateId);
  }

  render() { 
	return view(this);
  }
  
}

export default Response;
