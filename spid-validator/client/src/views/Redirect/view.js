import React from 'react';
import { BlockUI } from 'primereact/blockui';
import './style.css';


function view(me) { 
    return (
		<div className="container container-redirect animated fadeIn">
			<i className="spinner fa fa-refresh fa-spin"></i>
		</div>
    );
}

export default view;                        
