import React from 'react';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import './switches.css';
import './style.css';

function view(me) { 
    return (
        <div className="animated fadeIn">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-9">
                        <AceEditor code={me.state.xml_signed} />
                    </div>
                    <div className="col-md-3">
                        <div class="row alert alert-warning" role="alert">
                            {me.state.description}
                        </div>    
                        <div className="row panel-send">  
                            <div className="col">                   
                                <div className="row">
                                    <div className="col-sm-12">
                                        <label className="switch switch-success">
                                            <input type="checkbox" className="switch-input" 
                                                checked={me.state.sign_response}
                                                onChange={(e)=>{me.setSignResponse(e.target.checked)}}>
                                            </input>
                                            <span className="switch-slider"></span>
                                        </label>                           
                                        <span className="panel-send-label">Firma Response</span>
                                    </div>
                                </div>
                                <div className="row">   
                                    <div className="col-sm-12">                    
                                        <label className="switch switch-success">
                                            <input type="checkbox" className="switch-input" 
                                                checked={me.state.sign_assertion}
                                                onChange={(e)=>{me.setSignAssertion(e.target.checked)}}>
                                            </input>
                                            <span className="switch-slider"></span>
                                        </label>
                                        <span className="panel-send-label">Firma Assertion</span>
                                    </div>
                                </div>     

                                {me.state.params.map((param)=> {
                                    return(
                                        <div className="row"> 
                                            <div className="col-sm-12">
                                                {param.attribute && 
                                                    <input type="checkbox" className="checkAttribute"
                                                        name={'check_' + param.key} 
                                                        checked={(param.val!=null)}
                                                        onChange={(e)=>{me.setParam(param.key, (e.target.checked)? "" : null)}} />
                                                }

                                                <b>{param.key}</b>
                                            </div>                                      
                                            <div className="col-sm-12">  
                                                <input type="text" className="param" 
                                                    placeholder={param.key} 
                                                    value={param.val} 
                                                    onChange={(e)=>{me.setParam(param.key, e.target.value)}} />
                                            </div>
                                        </div> 
                                    );
                                })}
                           
                                <div className="row">   
                                    <div className="col">      
                                        <form ref="form" action={me.state.response_destination} onSubmit={(e)=>{me.sendResponse(e)}} method="post" target="_blank">
                                            <input type="hidden" name="RelayState" value={me.state.response_relayState} ></input>
                                            <input type="hidden" name="SAMLResponse" value={me.state.response_samlResponse} ></input>                                                   
                                            <input type="submit" value="Invia" className="btn btn-send btn-success float-right" data-style="zoom-in"></input>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default view;                        
