import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">

            {me.state.strict!=null && 

                Object.keys(me.state.strict.test.sp.metadata_strict.TestSPMetadata).map((t)=> {
                    return(
                    <div className="row testset"> 
                        <div className="col-sm-12">
                            <p><b>STRICT</b> : {me.state.strict.test.sp.metadata_strict.TestSPMetadata[t].description}</p>
                            
                            {Object.keys(me.state.strict.test.sp.metadata_strict.TestSPMetadata[t].assertions).map((a)=> {
                                return(
                                    <a className={(me.state.strict.test.sp.metadata_strict.TestSPMetadata[t].assertions[a].result=="success")? "test-success" : "test-fail" }
                                        title={me.state.strict.test.sp.metadata_strict.TestSPMetadata[t].assertions[a].test +
                                                 ": " + me.state.strict.test.sp.metadata_strict.TestSPMetadata[t].assertions[a].value}> &#9724; </a> 
                                );
                            })}

                        </div>                                      
                    </div> 
                    );
                })
            }

            {me.state.certs!=null && 

                Object.keys(me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates).map((t)=> {
                    return(
                    <div className="row testset"> 
                        <div className="col-sm-12">
                            <p><b>CERTS</b> : {me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates[t].description}</p>
                            
                            {Object.keys(me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates[t].assertions).map((a)=> {
                                return(
                                    <a className={(me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates[t].assertions[a].result=="success")? "test-success" : "test-fail" }
                                        title={me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates[t].assertions[a].test +
                                                 ": " + me.state.certs.test.sp.metadata_certs.TestSPMetadataCertificates[t].assertions[a].value}> &#9724; </a> 
                                );
                            })}

                        </div>                                      
                    </div> 
                    );
                })
            }

        </div>
    );
}

export default view;                        
