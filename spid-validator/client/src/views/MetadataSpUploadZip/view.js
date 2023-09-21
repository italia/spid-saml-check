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
                    <b>Metadata ZIP</b>
                </div>                                      
                <div className="col-sm-12">  
                    {!me.state.loading &&
                        <div>
                            <input type="file" 
                                ref="inputMetadata"
                                id="input-metadata-upload" 
                                className="mt-3"
                                placeholder={me.state.filename} />
                            <button type="button" 
                                className="btn btn-sm btn-primary" 
                                onClick={(e)=>{me.uploadMetadataZip(me.refs.inputMetadata.files[0])}}
                            >Upload ZIP</button>
                        </div>
                    }
                    {me.state.loading &&
                        <div className="mt-3">
                            Uploading file... {me.state.progress}%
                        </div>
                    }
                </div>
            </div>
            {me.state.result!="" &&
                <div className="row">
                    <div className="col-sm-12 code">
                        <AceEditor code={me.state.result} mode="json" />
                    </div>
                </div>
            }
        </div>
    );
}

export default view;                        
