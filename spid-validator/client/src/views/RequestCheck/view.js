import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Request Report</p>
            {me.state.result!=null && 

                Object.keys(me.state.result).map((t)=> {
                    return(
                    <div className="row testset"> 
                        <div className="col-sm-12">
                            <p><b>{me.state.test}</b> : {me.state.result[t].description}</p>
                            
                            {Object.keys(me.state.result[t].assertions).map((a)=> {
                                return(
                                    <a className={(me.state.result[t].assertions[a].result=="success")? "test-success" : "test-fail" }
                                        title={me.state.result[t].assertions[a].test +
                                                 ": " + me.state.result[t].assertions[a].value}> &#9724; </a> 
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
