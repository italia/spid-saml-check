import React, { Component } from 'react';
import{ withRouter } from '../../withRouter';
import view from './view.js';
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from '../../redux/store';
import Actions from '../../redux/main/actions';
import moment from 'moment';


class MetadataSpCheck extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
        test: props.test,
        report: null,
        report_datetime: null,
        report_profile: null,
        detailview: false,
        deprecable: false,
        deprecated: false,
        production: false
    };  
  }	

  componentDidMount() { 
    this.getLastCheck();
  }
  

  getLastCheck() {
    let service = Services.getMainService(); 
    Utility.blockUI(true);
    service.getLastCheckMetadataSp(
      this.state.test,
      (lastcheck) => { 
        Utility.blockUI(false); 
        let report = null;
        let deprecable = false;
        let deprecated = false;
        switch(this.state.test) {
          case "strict": report = lastcheck.report.test.sp.metadata_strict.SpidSpMetadataCheck; break;
          case "extra": report = lastcheck.report.test.sp.metadata_extra.SpidSpMetadataCheckExtra; break;
        } 

        this.setState({
          report: report,
          deprecated: deprecated,
          deprecable: deprecable,
          report_datetime: moment(lastcheck.datetime).format('DD/MM/YYYY HH:mm:ss'),
          report_profile: lastcheck.profile,
          production: lastcheck.production
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.checkMetadata();
        /*
        this.setState({
            result: null
        });
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
        */
      }
    );
  }

  checkMetadata() {
    let service = Services.getMainService();
    let store = ReduxStore.getMain();

    Utility.blockUI(true);
    service.checkMetadataSp(
      this.state.test,
      this.state.deprecated,
      this.state.production,
      (check) => { 
        Utility.blockUI(false); 
        let report = null;
        let deprecable = false;
        let deprecated = false;
        switch(this.state.test) {
          case "strict": report = check.report.test.sp.metadata_strict.SpidSpMetadataCheck; break;
          case "extra": report = check.report.test.sp.metadata_extra.SpidSpMetadataCheckExtra; break;
        }

        this.setState({
          report: report,
          deprecated: deprecated,
          deprecable: deprecable,
          report_datetime: moment(check.datetime).format('DD/MM/YYYY HH:mm:ss'),
          report_profile: check.profile
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.setState({
          report: null,
          report_datetime: null,
          report_profile: null
        });
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });
      }
    );
  }

    setDetailView(detailed) {
        this.setState({
            detailview: detailed
        });
    }

    setDeprecated(deprecated) {
      this.setState({
          deprecated: deprecated
      }, ()=> {
        this.checkMetadata();
      });
    }

    setProduction(production) {
      this.setState({
        production: production
      }, ()=> {
        this.checkMetadata();
      });
    }

    print() {
        Utility.print("metadata-" + this.state.test);
    }

  render() {    
	return view(this);
  }
}

export default withRouter(MetadataSpCheck);
