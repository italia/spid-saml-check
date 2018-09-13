import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Response Report</p>
            {me.state.test_cases!=null && 
                <div className="row testset"> 
                    <div className="col-sm-12">
                        {Object.keys(me.state.test_cases).map((t)=> {
                            return(
                                <a className={(me.state.test_cases[t].success)? "test-success" : "test-fail" }
                                    title={me.state.test_cases[t].name +
                                             ": " + me.state.test_cases[t].success}> &#9724; </a> 
                            );
                        })}

                    </div>                                      
                </div> 
            }

        </div>
    );
}

export default view;                        
