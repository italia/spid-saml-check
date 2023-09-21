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
			loading: false,
			loaded: false,
			fileName: null,
			fileSize: null,
      fileType: null,
      result: ""
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

	uploadMetadataZip(metadata_zip) {
		
		let service = Services.getMainService();

		this.setState({
			loading: true,
			loaded: false,
			fileName: metadata_zip.name,
			fileSize: metadata_zip.size,
			fileType: metadata_zip.type
		});

    Utility.blockUI(true);
		service.uploadFile(metadata_zip, 
			(progress)=> {
        this.setState({progress: (progress.loaded*100)/progress.total});
			},
			(uploaded)=> {
				this.setState({
					loading: false,
					loaded: false,
          progress: 0,
          result: uploaded
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
					loading: false,
					loaded: false
        });

        Utility.blockUI(false);
			}
		);
	}

}

export default MetadataSpUploadZip;
