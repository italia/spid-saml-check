import React from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/xml';
import 'brace/mode/json';
import 'brace/theme/cobalt';
import "./style.css";

function view(me) { 
    
    return(
        <AceEditor
            mode={me.state.mode}
            theme="cobalt"
            name="AceEditor"
            className="AceEditor"
            defaultValue={me.state.code}
            value={me.state.code}
            readOnly={true}
            maxLines={10000}
            showPrintMargin={false}
            wrapEnabled={true}
            editorProps={{$blockScrolling: true}}
        />
    );
};

export default view;
