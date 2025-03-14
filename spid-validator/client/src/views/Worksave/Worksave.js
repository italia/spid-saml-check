import React, {Component} from 'react';
import view from "./view.js";
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import Actions from "../../redux/main/actions";


class Worksave extends Component {

	constructor(props) {
		super(props);
        this.state = { 
            available_stores: [],
            selected_type: 'test',
            workspace: false 
        };
	}

    componentDidMount() {
        let service = Services.getMainService();
        let store = ReduxStore.getMain();

        service.loadAllWorkspace(
            (data)=> {
                if(data.length==0) {
                    this.startWorkspace('main');
                } else {
                    this.setState({ 
                        available_stores: data,
                        selected_type: data[0].store_type,
                        workspace: data[0]
                    });
                }
            },
            ()=> {
                // case no workspace, go to download metadata
                this.props.history.push('/metadata-sp-download');
            },
            (error)=> {
                Utility.showModal({
                    title: "Attenzione, si è verificato un errore",
                    body: error,
                    isOpen: true
                });
            }
        );
    }

    isTypeAvailable(store_type) {
        for(let t in this.state.available_stores) {
            if(this.state.available_stores[t].store_type==store_type) {
                return true;
            }
        }
        return false;
    }

    setType(store_type) {
        Utility.blockUI(true);
        for(let t in this.state.available_stores) {
            let store = this.state.available_stores[t];
            if(store.store_type==store_type) {
                this.setState({ 
                    selected_type: store.store_type,
                    workspace: store
                }, ()=> {
                    Utility.log("Selected STORE", this.state.workspace);
                    Utility.blockUI(false);
                    return;
                });
            }
        }
        return;
    }
  
    startContinue() {
        Utility.log("WorkSave", "Start CONTINUE");	
        let store = ReduxStore.getMain();
        store.dispatch(Actions.setStore(this.state.workspace)); 
        this.startWorkspace(this.state.selected_type);
        this.props.history.push('/request');
    }

    startNew() {
        let store_type = "";
        switch(this.state.selected_type) {
            case 'main': store_type = ""; break;
            case 'test': store_type = " di TEST"; break;
            case 'prod': store_type = " di PRODUZIONE"; break;
        }
        if(confirm("Sei sicuro di voler iniziare una nuova sessione di validazione per il metadata" + store_type
                 + "? Il metadata caricato e tutti gli esiti dei test salvati andranno persi.")) {
            Utility.log("WorkSave", "Start NEW");
            let service = Services.getMainService();
            service.resetWorkspace(this.state.selected_type, ()=> {
                this.startWorkspace(this.state.selected_type);
            });
        }
    }

    startWorkspace(store_type) {
        Utility.blockUI(true);
        let service = Services.getMainService();
        service.loadWorkspace(store_type,
            (data)=> {
                this.props.history.push('/request');
                Utility.blockUI(false);
            },
            ()=> {
                this.props.history.push('/metadata-sp-download');
            },
            (error)=> {
                Utility.blockUI(false);
                Utility.showModal({
                    title: "Attenzione, si è verificato un errore",
                    body: error,
                    isOpen: true
                });
            }
        );
    }
  
	render() {    
		if(this.state.workspace!=false) {
            return view(this);
        } else return (
            <div>Loading...</div>
        );
	}
  
}

export default Worksave;
