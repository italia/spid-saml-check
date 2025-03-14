import React from 'react';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div id="Request" className="animated fadeIn">
            <p className="title h3">Request</p>
            {me.state.binding && (
                <p className="subtitle h4">Binding: <b>{me.state.binding}</b> </p>
            )}
            <AceEditor code={me.state.xml} />
        </div>
    );
}

export default view;                        
