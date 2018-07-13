import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';

function view(me) { 
    return (
        <div className="animated fadeIn">
            <AceEditor code={me.state.xml} />
        </div>
    );
}

export default view;                        