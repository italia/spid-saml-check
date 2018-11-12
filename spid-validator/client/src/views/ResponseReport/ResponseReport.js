import React, { Component } from 'react';
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
        test_cases: {},
        detailview: false
    };  
  }	

  componentDidMount() { 
    let store = ReduxStore.getMain();
    let storeState = store.getState();
    let testDone = storeState.response_test_done;
    let testSuccess = storeState.response_test_success;
    let testNote = storeState.response_test_note;

    let testCases = config_test["test-suite-1"].cases;

    for(let i in testCases) {
        testCases[i].done = (testDone[i]!=null && testDone[i])? true:false;
        testCases[i].success = (testSuccess[i]!=null && testSuccess[i])? true:false;

        if(!testDone[i]) {
            testCases[i].classColor = "test-none";
            testCases[i].result = "non effettuato";
        } else {
            if(testSuccess[i]) {
                testCases[i].classColor = "test-success";
                testCases[i].result = "Success";
            } else {
                testCases[i].classColor = "test-fail";
                testCases[i].result = "FAIL";
            }
            testCases[i].note = testNote[i];
        }
    }
    
    this.setState({
        test_cases: testCases
    });
  }

    setDetailView(detailed) {
        this.setState({
            detailview: detailed
        });
    }

    print() {
        Utility.print();
    }

  render() {    
	return view(this);
  }
}

export default ResponseReport;
