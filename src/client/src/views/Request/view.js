import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import { BlockUI } from "ns-react-block-ui";
import AceEditor from '../../components/AceEditor/';
import Sticky from 'react-sticky-el';
import "./style.css";

function view(me) { 
    return (
        <div id="Request" className="animated fadeIn">
            <p className="title h3">Request</p>
            {me.state.binding && (
                <p className="subtitle h4">Binding: <b>{me.state.binding}</b> </p>
            )}
            <div className="row">
                <div className="col-md-12">
                    <div className="main">
                        <div className="row">
                            <div className="col-sm-12 code">
                                <AceEditor code={me.state.xml} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default view;                        
