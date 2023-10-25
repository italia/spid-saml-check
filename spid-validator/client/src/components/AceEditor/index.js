import { Component } from 'react';
import view from "./view.js";
import format from 'xml-formatter';
import Utility from '../../utility';

class AceEditor extends Component {
    
  constructor(props) {
    super(props);
    this.state = {
      mode: 'xml',
      code: ""
    };
  }  

  static getDerivedStateFromProps(props, state) {

    let mode = props.mode;
    let code = props.code;

    switch(props.mode) {
      case 'json':
        code = JSON.stringify(props.code, null, 4);
      break;

      case 'xml':
      default:
        mode = 'xml';
        code = format((props.code!=null)? props.code : "");
      break;
    }

    return {
      code: code,
      mode: mode
    }
  }  

  render() { return view(this); }
}

export default AceEditor;
