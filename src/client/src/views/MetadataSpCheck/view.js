import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import { BlockUI } from "ns-react-block-ui";
import Sticky from 'react-sticky-el';
import "./style.css";

function view(me) { 
    return (
        <div id="MetadataSpCheck" className="animated fadeIn">
            <p className="title h3">Metadata Service Provider Report</p>
            {me.state.report && 
            <p className="subtitle h4">Data Validazione: <strong>{me.state.report_datetime}</strong></p>
            }

            {me.state.report && 
            <div className="row">

                {!me.state.detailview &&
                    <div className="col-md-8">
                        <div className="main">
                            {me.state.report!=null && 
                                <div className="row testset"> 
                                    <div className="col-sm-12">
                                        <div>
                                            <div>Check: <b><span className="first-upper">{me.state.test}</span></b></div>
                                            {me.state.report_profile!=null && <div>Profilo <b>{me.state.report_profile}</b></div> }
                                        </div>

                                        <div className="mt-3">
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
                                </div> 
                            }
                        </div>
                    </div>
                }

                {me.state.detailview &&
                    <div className="col-md-8">
                        <div className="main">
                            {me.state.report!=null && 
                                <div className="row testset"> 
                                    <div className="col-sm-12 table-responsive">
                                        <div>
                                            <div>Check: <b><span className="first-upper">{me.state.test}</span></b></div>
                                            {me.state.report_profile!=null && <div>Profilo: <b>{me.state.report_profile}</b></div> }
                                        </div>

                                        <table className="table detail-table mt-3">
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
                    </div>
                }


                <div className="col-md-4"> 
                    <Sticky stickyClassName="sticky-tools" topOffset={-50}>  
                        <div className="tools">
                            <div className="col-sm-12">
                                <label className="switch switch-success me-3">
                                    <input type="checkbox" className="switch-input" 
                                        checked={me.state.detailview}
                                        onChange={(e)=>{me.setDetailView(e.target.checked)}}>
                                    </input>
                                    <span className="switch-slider"></span>
                                </label>
                                <span className="align-super">Visualizzazione dettaglio</span>
                                <hr/>

                                {me.state.deprecable && 
                                    <div>
                                        <label className="switch switch-warning me-3">
                                            <input type="checkbox" className="switch-input" 
                                                checked={me.state.deprecated}
                                                onChange={(e)=>{me.setDeprecated(e.target.checked)}}>
                                            </input>
                                            <span className="switch-slider"></span>
                                        </label>
                                        <span className="align-super">Metadata deprecato (pre Avviso n.29)</span>
                                        <hr/>
                                    </div>
                                }

                                <div>
                                    <label className="switch switch-success me-3">
                                        <input type="checkbox" className="switch-input" 
                                            checked={me.state.production}
                                            onChange={(e)=>{me.setProduction(e.target.checked)}}>
                                        </input>
                                        <span className="switch-slider"></span>
                                    </label>
                                    <span className="align-super">Check per Produzione</span>
                                    <hr/>
                                </div>

                                <button type="button" className="btn btn-success"
                                    onClick={()=>{me.print()}}>
                                    <span className="fa fa-print"></span> Stampa
                                </button>
                                <button type="button" className="btn btn-primary"
                                    onClick={()=>{me.checkMetadata()}}>
                                    <span className="fa fa-refresh"></span> Nuova validazione
                                </button>
                            </div>
                        </div>
                    </Sticky>
                </div>
            </div> 
            }
        </div>
    );
}

export default view;                        
