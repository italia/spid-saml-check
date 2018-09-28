import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Request Report</p>
            <div className="row">

                {!me.state.detailview &&
                    <div className="col-md-9 main">
                        {me.state.result!=null && 

                            Object.keys(me.state.result).map((t)=> {
                                return(
                                <div className="row testset"> 
                                    <div className="col-sm-12">
                                        <p><b>{me.state.test}</b> : {me.state.result[t].description}</p>
                                        
                                        {Object.keys(me.state.result[t].assertions).map((a)=> {
                                            return(
                                                <a className={(me.state.result[t].assertions[a].result=="success")? "test-success" : "test-fail" }
                                                    title={me.state.result[t].assertions[a].test +
                                                             ": " + me.state.result[t].assertions[a].value}> &#9724; </a> 
                                            );
                                        })}

                                    </div>                                      
                                </div> 
                                );
                            })
                        }
                    </div>
                }

                {me.state.detailview &&
                    <div className="col-md-9 main">
                        {me.state.result!=null && 

                            Object.keys(me.state.result).map((t)=> {
                                return(
                                <div className="row testset"> 
                                    <div className="col-sm-12">
                                        <p><b>{me.state.test}</b> : {me.state.result[t].description}</p>
                                        
                                        <table className="detail-table">
                                            <tr className="detail-header"><th className="detail-num">#</th><th className="detail-description">Test</th><th className="detail-result">Test Result</th></tr>
                                            {Object.keys(me.state.result[t].assertions).map((a)=> {
                                                return(
                                                     <tr className="detail-row">
                                                        <td className={(me.state.result[t].assertions[a].result=="success")? "detail-num test-success-dm" : "detail-num test-fail-dm"}>{a}</td>
                                                        <td className="detail-description">{me.state.result[t].assertions[a].test}</td>
                                                        <td className={(me.state.result[t].assertions[a].result=="success")? "detail-result test-success-dm" : "detail-result test-fail-dm"}>
                                                            {me.state.result[t].assertions[a].result}
                                                        </td>
                                                     </tr>
                                                );
                                            })}
                                        </table>
                                    </div>                                      
                                </div> 
                                );
                            })
                        }
                    </div>
                }


                <div className="col-md-3">   
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
                            <button type="button" className="btn btn-success"
                                onClick={()=>{me.print()}}>
                                <span className="cui-print"></span> Stampa
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default view;                        
