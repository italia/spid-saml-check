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
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-9">

                        <b>Seleziona la Response di test da inviare al Service Provider...</b>

                        <Select id="response-select" 
                            name="response-select"
                            placeholder={me.state.name}
                            value={(me.state.response_select!=null)? me.state.response_select:""}
                            onChange={(e)=>{ me.setResponseTemplate((e!=null)? e.value:null) }}
                            options={[
                                { value: '1',   label: '1.   Corretta' },
                                { value: '2',   label: '2.   Response non firmata' },
                                { value: '3',   label: '3.   Assertion non firmata' },
                                { value: '4',   label: '4.   Firma diversa' },
                                { value: '6a',  label: '6a.  ID non specificato' },
                                { value: '6b',  label: '6b.  ID mancante' },
                                { value: '7',   label: '7.   Version diverso da 2.0' },
                                { value: '8a',  label: '8a.  IssueInstant non specificato' },
                                { value: '8b',  label: '8b.  IssueInstant mancante' },
                                { value: '9',   label: '9.   Formato IssueInstant non corretto' },
                                { value: '10',  label: '10.  IssueInstant precedente Request' },
                                { value: '11',  label: '11.  IssueInstant successivo Request' },
                                { value: '12a', label: '12a. InResponseTo non specificato' },
                                { value: '12b', label: '12b. InResponseTo mancante' },
                                { value: '13',  label: '13.  InResponseTo diverso da Request' },
                                { value: '14a', label: '14a. Destination non specificato' },
                                { value: '14b', label: '14b. Destination mancante' },
                                { value: '15',  label: '15.  Destination diverso' },
                                { value: '16a', label: '16a. Elemento Status non specificato' },
                                { value: '16b', label: '16b. Elemento Status mancante' },
                                { value: '17a', label: '17a. Elemento StatusCode non specificato' },
                                { value: '17b', label: '17b. Elemento StatusCode mancante' },
                                { value: '18',  label: '18.  Elemento StatusCode diverso da success' },
                                { value: '19a', label: '19a. Elemento Issuer non specificato' },
                                { value: '19b', label: '19b. Elemento Issuer mancante' },
                                { value: '20',  label: '20.  Elemento Issuer diverso da EntityID IdP' },
                                { value: '21',  label: '21.  Attributo Format di Issuer diverso' },
                                { value: '22',  label: '22.  Autenticazione annullata da IdP' },
                                { value: '23',  label: '23.  Elemento Assertion mancante' },
                                { value: '24a',  label: '24a. Assertion - Attributo ID non specificato' },
                                { value: '24b',  label: '24b. Assertion - Attributo ID mancante' },
                                { value: '25',  label: '25. Assertion - Attributo Version diverso da 2.0' },
                                { value: '26a',  label: '26a. Assertion - Attributo IssueInstant non specificato' },
                                { value: '26b',  label: '26b. Assertion - Attributo IssueInstant mancante' },
                                { value: '27',  label: '27. Assertion - Attributo IssueInstant avente formato non corretto' },
                                { value: '28',  label: '28. Assertion - Attributo IssueInstant precedente a IssueInstant della Request' },
                                { value: '29',  label: '29. Assertion - Attributo IssueInstant successivo a IssueInstant della Request' },
                                { value: '30a',  label: '30a. Assertion - Elemento Subject non specificato' },
                                { value: '30b',  label: '30b. Assertion - Elemento Subject mancante' },
                                { value: '31a',  label: '31a. Assertion - Elemento NameID non specificato' },
                                { value: '31b',  label: '31b. Assertion - Elemento NameID mancante' },
                                { value: '32a',  label: '32a. Assertion - Attributo Format di NameID non specificato' },
                                { value: '32b',  label: '32b. Assertion - Attributo Format di NameID mancante' },
                                { value: '33',  label: '33. Assertion - Attributo Format di NameID diverso' },
                                { value: '34a',  label: '34a. Assertion - Attributo NameQualifier di NameID non specificato' },
                                { value: '34b',  label: '34b. Assertion - Attributo NameQualifier di NameID mancante' },
                                { value: '36a',  label: '36a. Assertion - Elemento SubjectConfirmation non specificato' },
                                { value: '36b',  label: '36b. Assertion - Elemento SubjectConfirmation mancante' },
                                { value: '37a',  label: '37a. Assertion - Attributo Method di SubjectConfirmation non specificato' },
                                { value: '37b',  label: '37b. Assertion - Attributo Method di SubjectConfirmation mancante' },
                                { value: '38',  label: '38. Assertion - Attributo Method di SubjectConfirmation diverso' }
                            ]}>
                        </Select>
 
                        <AceEditor code={me.state.xml_signed} />
                    </div>
                    <div className="col-md-3">
                        <div class="row alert alert-warning" role="alert">
                            <b>Descrizione e risultato atteso</b><br/>
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
