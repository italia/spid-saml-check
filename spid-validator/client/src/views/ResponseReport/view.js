import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div className="animated fadeIn">
            <p className="title h3">Response Report</p>
            <div className="row">

                {!me.state.detailview &&
                    <div className="col-md-9 main">
                        {me.state.test_cases!=null && 
                            <div className="row testset"> 
                                <div className="col-sm-12">
                                    {Object.keys(me.state.test_cases).map((t)=> {
                                        return(
                                            <a className={me.state.test_cases[t].classColor}
                                                title={me.state.test_cases[t].name +
                                                         ": " + me.state.test_cases[t].success}> &#9724; </a> 
                                        );
                                    })}

                                </div>                                      
                            </div> 
                        }
                    </div>
                }

                {me.state.detailview &&
                    <div className="col-md-9 main">
                        {me.state.test_cases!=null && 
                            <table className="detail-table">
                                <tr className="detail-header"><th className="detail-num">#</th><th className="detail-description">Test</th><th className="detail-result">Test Result</th></tr>
                                {Object.keys(me.state.test_cases).map((t)=> {
                                    return(
                                         <tr className="detail-row">
                                            <td className={'detail-num ' + me.state.test_cases[t].classColor + '-dm'}>{t}</td>
                                            <td className="detail-description">{me.state.test_cases[t].name}</td>
                                            <td className={'detail-result ' + me.state.test_cases[t].classColor + '-dm'}>{me.state.test_cases[t].result}<br/>{me.state.test_cases[t].note}</td>
                                         </tr>
                                    );
                                })}
                            </table>
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
