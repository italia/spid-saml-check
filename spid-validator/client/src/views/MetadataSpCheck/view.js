import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import { BlockUI } from 'primereact/blockui';
import AceEditor from '../../components/AceEditor/';
import './switches.css';
import "./style.css";

function view(me) { 
    return (
        <div id="MetadataSpCheck" className="animated fadeIn">
            <p className="title h3">Metadata Service Provider Report</p>
            <p className="subtitle h4">Data Validazione: <strong>{me.state.report_datetime}</strong></p>
            <div className="row">

                {!me.state.detailview &&
                    <div className="col-md-8 main">
                        {me.state.report!=null && 
                            <div className="row testset"> 
                                <div className="col-sm-12">
                                    <p>Check <b><span class="first-upper">{me.state.test}</span></b></p>
                                    {me.state.report_profile!=null && <p>Profilo <b>{me.state.report_profile}</b></p> }
                                    
                                    {me.state.report.map((t, i)=> {
                                        return(
                                            <a key={i} 
                                                className={(t.result=="success")? "test-success" : (t.result=="warning")? "test-warning" : "test-fail" }
                                                title={t.test + (t.value? ": " + t.value : "")}> {i} 
                                            </a> 
                                        );
                                    })}

                                </div>                                      
                            </div> 
                        }
                    </div>
                }

                {me.state.detailview &&
                    <div className="col-md-8 main">
                        {me.state.report!=null && 
                            <div className="row testset"> 
                                <div className="col-sm-12">
                                    <p>Check <b><span class="first-upper">{me.state.test}</span></b></p>
                                    {me.state.report_profile!=null && <p>Profilo <b>{me.state.report_profile}</b></p> }
                                    
                                    <table className="detail-table">
                                        <tr className="detail-header">
                                            <th className="detail-num">#</th>
                                            <th className="detail-description">Test</th>
                                            <th className="detail-result">Test Result</th>
                                        </tr>
                                        {me.state.report.map((t, i)=> {
                                            return(
                                                <tr key={i} className="detail-row">
                                                    <td className={(t.result=="success")? "detail-num test-success-dm" : (t.result=="warning")? "detail-num test-warning-dm" : "detail-num test-fail-dm"}>{i}</td>
                                                    <td className="detail-description">{t.test}</td>
                                                    <td className={(t.result=="success")? "detail-result test-success-dm" : (t.result=="warning")? "detail-result test-warning-dm" : "detail-result test-fail-dm"}>
                                                        {t.result + (t.value? " - value: " + t.value : "")}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </table>
                                </div>                                      
                            </div> 
                        }
                    </div>
                }


                <div className="col-md-4">   
                    <div className="tools">
                        <div className="col-sm-12">
                            <label className="switch switch-success">
                                <input type="checkbox" className="switch-input" 
                                    checked={me.state.detailview}
                                    onChange={(e)=>{me.setDetailView(e.target.checked)}}>
                                </input>
                                <span className="switch-slider"></span>
                            </label>
                            <span>Visualizzazione dettaglio</span>
                            <hr/>

                            {me.state.deprecable && 
                                <div>
                                    <label className="switch switch-warning">
                                        <input type="checkbox" className="switch-input" 
                                            checked={me.state.deprecated}
                                            onChange={(e)=>{me.setDeprecated(e.target.checked)}}>
                                        </input>
                                        <span className="switch-slider"></span>
                                    </label>
                                    <span>Metadata deprecato (pre Avviso n.29)</span>
                                    <hr/>
                                </div>
                            }

                            <div>
                                <label className="switch switch-success">
                                    <input type="checkbox" className="switch-input" 
                                        checked={me.state.production}
                                        onChange={(e)=>{me.setProduction(e.target.checked)}}>
                                    </input>
                                    <span className="switch-slider"></span>
                                </label>
                                <span>Check per Produzione</span>
                                <hr/>
                            </div>

                            <button type="button" className="btn btn-success"
                                onClick={()=>{me.print()}}>
                                <span className="cui-print"></span> Stampa
                            </button>
                            <button type="button" className="btn btn-primary"
                                onClick={()=>{me.checkMetadata()}}>
                                <span className="cui-print"></span> Nuova validazione
                            </button>
                        </div>
                    </div>
                </div>
            </div> 
        </div>
    );
}

export default view;                        
