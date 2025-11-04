import React, { Component } from 'react';
import{ withRouter } from '../../withRouter';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";
import config_test from '../../../../config/test.json';


class ResponseReport extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        test_suites: {},
        detailview: false
    };  
  }	

  componentDidMount() { 
    let store = ReduxStore.getMain();
    let storeState = store.getState();
    let testDone = storeState.response_test_done;
    let testSuccess = storeState.response_test_success;
    let testNote = storeState.response_test_note;

    let testSuites = config_test;

    for(let h in testSuites) {     
      for(let i in testSuites[h].cases) {
          testSuites[h].cases[i].done = (testDone[i]!=null && testDone[i])? true:false;
          testSuites[h].cases[i].success = (testSuccess[i]!=null && testSuccess[i])? true:false;

          if(!testDone[i]) {
              testSuites[h].cases[i].classColor = "test-none";
              testSuites[h].cases[i].result = "non effettuato";
          } else {
              if(testSuccess[i]) {
                  testSuites[h].cases[i].classColor = "test-success";
                  testSuites[h].cases[i].result = "Success";
              } else {
                  testSuites[h].cases[i].classColor = "test-fail";
                  testSuites[h].cases[i].result = "FAIL";
              }
              testSuites[h].cases[i].note = testNote[i];
          }
      }
    }

    
    this.setState({
        test_suites: testSuites
    });
  }

    setDetailView(detailed) {
      console.log(this.state);
        this.setState({
            detailview: detailed
        });
    }

    print() {
        Utility.print("response");
    }

  render() {    
	return view(this);
  }
}

export default withRouter(ResponseReport);
