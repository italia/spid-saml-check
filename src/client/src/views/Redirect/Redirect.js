import React, { Component } from 'react';
import view from "./view.js";

class Redirect extends Component {

	constructor(props) {
		super(props);
    
		console.log("Redirect", props);	
		window.location = props.redirect;
	}	
  
	render() {
		let render = view(this);
		return render;
	}
}
 
export default Redirect;
 