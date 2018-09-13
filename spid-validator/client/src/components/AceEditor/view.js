import React from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/xml';
import 'brace/theme/cobalt';
import "./style.css";

function view(me) { 
    
    return(
        <AceEditor
            mode="xml"
            theme="cobalt"
            name="AceEditor"
            className="AceEditor"
            defaultValue={me.state.code}
            value={me.state.code}
            readOnly={true}
            maxLines={10000}
            wrapEnabled={true}
            editorProps={{$blockScrolling: true}}
        />
    );
};

export default view;
