import { Component } from 'react';
import view from "./view.js";
import format from 'xml-formatter';
import Utility from '../../utility';

class AceEditor extends Component {
    
  constructor(props) {
    super(props);
    this.state = {code: format((props.code!=null)? props.code:"")};
  }  

  static getDerivedStateFromProps(props, state) {
    Utility.log("State", props.code)
    return {
      code: format((props.code!=null)? props.code:"")
    }
  }  

  render() { return view(this); }
}

export default AceEditor;
