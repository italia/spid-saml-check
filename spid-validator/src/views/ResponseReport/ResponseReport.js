import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";
import config_test from '../../../config/test.json';


class ResponseReport extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        test_cases: {}    
    };  
  }	

  componentDidMount() { 
    let store = ReduxStore.getMain();
    let storeState = store.getState();
    let testSuccess = storeState.response_test_success;
    Utility.log("Response Success", testSuccess);

    let testCases = config_test["test-suite-1"].cases;

    for(let i in testCases) {
        testCases[i].success = (testSuccess!=null && testSuccess[i])? true:false;
    }
    
    this.setState({
        test_cases: testCases
    });
  }


  render() {    
	return view(this);
  }
}

export default ResponseReport;
