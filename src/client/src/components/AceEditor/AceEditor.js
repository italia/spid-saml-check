import { Component } from 'react';
import view from "./view.js";
import format from 'xml-formatter';
import Utility from '../../utility';

class AceEditor extends Component {
    
  constructor(props) {
    super(props);
    let mode = (props.mode!=null)? props.mode : 'xml';
    let code = (props.code!=null)? props.code : '';

    try {
      if(mode=='xml') code = format(code);
      else if(mode=='json') code = JSON.stringify(code, null, 4);
      else code = code;
    } catch(err) {
      console.log(err.message);
    }

    this.state = {
      mode: mode,
      code: code
    };
  }  

  static getDerivedStateFromProps(props, state) {
    let mode = (props.mode!=null)? props.mode : 'xml';
    let code = (props.code!=null)? props.code : '';

    try {
      if(mode=='xml') code = format(code);
      else if(mode=='json') code = JSON.stringify(code, null, 4);
      else code = code;
    } catch(err) {
      console.log(err.message);
    }

    return {
      mode: mode,
      code: code
    }
  }  

  render() { return view(this); }
}

export default AceEditor;
