import {Component} from 'react';
import view from "./view.js";
import Services from '../../services';


class Dashboard extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
 
    };  
  }	

  componentDidMount() { 

	let service = Services.getMainService();			
	
  }
  
	render() {    
		return view(this);
  }
  
}

export default Dashboard;
