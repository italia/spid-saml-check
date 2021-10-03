import React, {Component, version} from 'react';
import Services from '../../services';
import Utility from '../../utility';

class Footer extends Component {

  constructor(props) {
    super(props);

    this.state = {
      version: "Not found"
    }

    let service = Services.getMainService();

    let info = service.getServerInfo(
      (info) => { 
        this.setState({ version: info.version })
        Utility.log("Server info", this.state.version);
      }, 
      ()=> {
        this.setState({version: "Not found"})
        Utility.log("Session not found");
      },
      (error)   => { 
        this.setState({version: "Error occurred"})
        Utility.error("Error on call Server Info API");
      }
    );
  }

  render() {
    return (
      <footer className="app-footer">
        <span>SPID Validator (versione: {this.state.version})</span>
        <span className="ml-auto">AgID - Agenzia per l'Italia Digitale</span>
      </footer>
    )
  }
}

export default Footer;
