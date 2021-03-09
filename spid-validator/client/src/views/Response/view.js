import React from 'react';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import Select from 'react-select-plus';
import 'react-select-plus/dist/react-select-plus.css';
import './switches.css';
import './style.css';

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Response</p>
            <div className="row">
                <div className="col-md-9 main">

                    <b>Seleziona la Response di test da inviare al Service Provider...</b>

                    <Select id="response-select" 
                        name="response-select"
                        placeholder={me.state.name}
                        value={(me.state.response_select!=null)? me.state.response_select:""}
                        onChange={(e)=>{ me.setResponseTemplate((e!=null)? e.value:null) }}
                        options={me.getTestOptions()} >
                    </Select>

                    <AceEditor code={me.state.xml_signed} />
                </div>
                <div className="col-md-3">
                    <div className="row alert alert-warning">
                        <b>Descrizione e risultato atteso</b><br/>
                        <p className="test-description">{me.state.description}</p>
                        <form ref="form" action={me.state.response_destination} onSubmit={(e)=>{me.sendResponse(e)}} method="post" target="_blank">
                            <input type="hidden" name="RelayState" value={me.state.response_relayState} ></input>
                            <input type="hidden" name="SAMLResponse" value={me.state.response_samlResponse} ></input>                                                   
                            <input type="submit" value="Invia response al Service Provider" className="btn btn-send btn-success float-right" data-style="zoom-in"></input>
                        </form>
                    </div>    
                    <div className={me.state.test_success? "row alert alert-success" : "row alert alert-danger"} >
                        {!me.state.test_done &&
                            <span><b>Esito del test : NON EFFETTUATO</b><br/></span>
                        }
                        {me.state.test_done &&
                            <span><b>Esito del test : {me.state.test_success? "SUPERATO" : "NON superato"}</b><br/></span>
                        }
                        <p className="test-description">Se il risultato del service provider all'invio della response è conforme al risultato atteso è possibile impostare il test come superato</p>
                        <div className="col-sm-12">
                            <label className="switch switch-success">
                                <input type="checkbox" className="switch-input" 
                                    checked={me.state.test_done}
                                    onChange={(e)=>{me.setTestDone(e.target.checked)}}>
                                </input>
                                <span className="switch-slider"></span>
                            </label>
                            <span className="panel-send-label">Test effettuato</span>
                        </div>
                        {me.state.test_done &&
                            <div className="col-sm-12">
                                <label className="switch switch-success">
                                    <input type="checkbox" className="switch-input" 
                                        checked={me.state.test_success}
                                        onChange={(e)=>{me.setTestSuccess(e.target.checked)}}>
                                    </input>
                                    <span className="switch-slider"></span>
                                </label>
                                <span className="panel-send-label">Test superato</span>
                            </div>
                        }
                        {me.state.test_done &&
                            <div className="col-sm-12">
                                <textarea 
                                    value={me.state.test_note} 
                                    onChange={(e)=>{me.setTestNote(e.target.value)}}>
                                </textarea>
                            </div>
                        }
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
                                        <input type="submit" value="Invia response al Service Provider" className="btn btn-send btn-success float-right" data-style="zoom-in"></input>
                                    </form>
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
