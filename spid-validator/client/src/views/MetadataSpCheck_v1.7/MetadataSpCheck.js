import React, { Component } from 'react';
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
        detailview: false,
        deprecable: false,
        deprecated: false
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
            case "xsd": 
              report = lastcheck.report.test.sp.metadata_xsd.TestSPMetadataXSD; 
              deprecable = report.test_xsd.type=='sp' || report.test_xsd.type=='sp-av29';
              deprecated = report.test_xsd.type=='sp';
            break;
            case "strict": report = lastcheck.report.test.sp.metadata_strict.TestSPMetadata; break;
            case "certs": report = lastcheck.report.test.sp.metadata_certs.TestSPMetadataCertificates; break;
            case "extra": report = lastcheck.report.test.sp.metadata_extra.TestSPMetadataExtra; break;
        } 
        this.setState({
          report: report,
          deprecated: deprecated,
          deprecable: deprecable,
          report_datetime: moment(lastcheck.datetime).format('DD/MM/YYYY HH:mm:ss')
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
      (check) => { 
        Utility.blockUI(false); 
        let report = null;
        let deprecable = false;
        let deprecated = false;
        switch(this.state.test) {
            case "xsd": 
              report = check.report.test.sp.metadata_xsd.TestSPMetadataXSD; 
              deprecable = report.test_xsd.type=='sp' || report.test_xsd.type=='sp-av29';
              deprecated = report.test_xsd.type=='sp';
            break;
            case "strict": report = check.report.test.sp.metadata_strict.TestSPMetadata; break;
            case "certs": report = check.report.test.sp.metadata_certs.TestSPMetadataCertificates; break;
            case "extra": report = check.report.test.sp.metadata_extra.TestSPMetadataExtra; break;
        } 
        this.setState({
          report: report,
          deprecated: deprecated,
          deprecable: deprecable,
          report_datetime: moment(check.datetime).format('DD/MM/YYYY HH:mm:ss')
        });
      }, 
      (error)   => { 
        Utility.blockUI(false);
        this.setState({
          report: null,
          report_datetime: null
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

    print() {
        Utility.print("metadata-" + this.state.test);
    }

  render() {    
	return view(this);
  }
}

export default MetadataSpCheck;
