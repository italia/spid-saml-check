import React, {Component, version} from 'react';
import Services from '../../services';
import Utility from '../../utility';

class Footer extends Component {

  constructor(props) {
    super(props);

    this.state = {
      version: "...",
      spid_sp_test_version: "..."
    }

    let service = Services.getMainService();

    let info = service.getServerInfo(
      (info) => { 
        this.setState(
          { 
            version: info.version,
            spid_sp_test_version: info.tools.spid_test_sp.version
          })
        Utility.log("Server info", this.state.version);
      }, 
      ()=> {
        Utility.log("Session not found");
      },
      (error)   => { 
        Utility.error("Error on call Server Info API");
      }
    );
  }

  render() {
    return (
      <footer className="app-footer">
        <span>
          SPID Validator - {this.state.version}, SPID SP Test - {this.state.spid_sp_test_version}
        </span>
        <span className="ms-auto">AgID - Agenzia per l'Italia Digitale</span>
      </footer>
    )
  }
}

export default Footer;
