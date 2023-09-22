import React, { Component } from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class MetadataSpUploadZip extends Component {

  constructor(props) {
    super(props);
    
    this.state = {
			detailview: false,
			file: null,
			loading: false,
			loaded: false,
			fileName: null,
			fileSize: null,
			fileType: null,
			check: "extra",
			profile: "spid-sp-ag-public-full",
			production: true,
      report: null
    };  
  }	

  componentDidMount() { 
    let service = Services.getMainService();
    let store = ReduxStore.getMain();
    let storeState = store.getState();
  }
  
  render() {    
		return view(this);
	}
	
	setDetailView(detailed) {
		this.setState({
				detailview: detailed
		});
	}

	setCheck(check) {
		this.setState({
			check: check
		});
	}

	setProfile(profile) {
		this.setState({
			profile: profile
		});
	}
		
	setProduction(production) {
		this.setState({
			production: production
		});
	}

	uploadMetadataZip(metadata_zip) {
		
		let service = Services.getMainService();

		this.setState({
			file: metadata_zip,
			loading: true,
			loaded: false,
			fileName: metadata_zip.name,
			fileSize: metadata_zip.size,
			fileType: metadata_zip.type,
			report: null
		});

    Utility.blockUI(true);
		service.uploadFile(
				metadata_zip, 
				this.state.check,
				this.state.profile, 
				this.state.production? 'Y':'N',

			(progress)=> {
        this.setState({progress: (progress.loaded*100)/progress.total});
			},
			(report)=> {
				this.setState({
					file: metadata_zip,
					loading: false,
					loaded: true,
					progress: 0,
					check: report.check,
					profile: report.profile,
					production: report.production,
          report: report
				});
        
        Utility.blockUI(false);
			},
			(error)=> {
				Utility.showModal({
					title: "Errore",
					body: error,
					isOpen: true
				});
				this.setState({
					file: null,
					loading: false,
					loaded: false,
					fileName: null,
					fileSize: null,
					fileType: null,
					check: "extra",
					profile: "spid-sp-ag-public-full",
					production: true,
					report: null
        });

        Utility.blockUI(false);
			}
		);
	}

	openMetadata(metadata) {
		let service = Services.getMainService();
		let store = ReduxStore.getMain();

		Utility.blockUI(true);
		service.setSessionMetadata(metadata,
			(success)=> {
        store.dispatch(Actions.setMetadataSpURL(metadata.url)); 
				store.dispatch(Actions.setMetadataSpXML(metadata.xml)); 
				this.props.history.push('/metadata-sp-download');
				Utility.blockUI(false);
			},
			(error)=> {
				Utility.showModal({
					title: "Errore",
					body: error,
					isOpen: true
				});
				Utility.blockUI(false);
			}
		);
	}

	print() {
		Utility.print(this.state.fileName);
	}

}

export default MetadataSpUploadZip;
