import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Metadata Service Provider</p>
            <div className="row">
                <div className="col-sm-12">
                    <b>Metadata URL</b>
                </div>                                      
                <div className="col-sm-12">  
                    <input type="text"
                        ref="inputMetadata"
                        className="metadata"
                        placeholder={me.state.url} />
                    <button type="button" 
                        className="btn btn-sm btn-primary" 
                        onClick={(e)=>{me.downloadMetadata(me.refs.inputMetadata.value)}}
                    >Download</button>
                </div>
            </div>
            {me.state.xml!="" &&
                <div className="row">
                    <div className="col-sm-12 code">
                        <AceEditor code={me.state.xml} />
                    </div>
                </div>
            }
        </div>
    );
}

export default view;                        
