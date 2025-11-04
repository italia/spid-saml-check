import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import { BlockUI } from "ns-react-block-ui";
import Sticky from 'react-sticky-el';
import "./style.css";

function view(me) { 
    return (
        <div id="ResponseReport" className="animated fadeIn">
            <p className="title h3">Response Report</p>
            <div className="row">

                {!me.state.detailview &&
                    <div className="col-md-8">
                    {Object.keys(me.state.test_suites).map((s)=> {
                        return(
                            <div key={s} className="row">
                                <div className="col-md-12">
                                    <div className="main">
                                        {me.state.test_suites[s].cases!=null && 
                                            <div>
                                                <p className="subtitle h2">{me.state.test_suites[s].description}</p>
                                                <div className="row testset"> 
                                                    <div className="col-sm-12">
                                                        {Object.keys(me.state.test_suites[s].cases).map((t)=> {
                                                            return(
                                                                <a key={t} className={me.state.test_suites[s].cases[t].classColor}
                                                                    title={me.state.test_suites[s].cases[t].name +
                                                                            ": " + me.state.test_suites[s].cases[t].success}>{t}</a> 
                                                            );
                                                        })}

                                                    </div>                                      
                                                </div> 
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                }

                {me.state.detailview &&
                    <div className="col-md-8">
                    {Object.keys(me.state.test_suites).map((s)=> {
                        return(
                            <div key={s} className="row">
                                <div className="col-md-12">                        
                                    <div className="main">
                                        {me.state.test_suites[s].cases!=null && 
                                            <div>
                                                <p className="subtitle h2">{me.state.test_suites[s].description}</p>
                                                <div className="row testset"> 
                                                    <div className="col-sm-12 table-responsive">
                                                        <table className="table detail-table mt-3">
                                                            <tr className="detail-header"><th className="detail-num">#</th><th className="detail-description">Test</th><th className="detail-result">Test Result</th></tr>
                                                            {Object.keys(me.state.test_suites[s].cases).map((t)=> {
                                                                return(
                                                                    <tr key={t} className="detail-row">
                                                                        <td className={'detail-num ' + me.state.test_suites[s].cases[t].classColor + '-dm'}>{t}</td>
                                                                        <td className="detail-description">{me.state.test_suites[s].cases[t].name}</td>
                                                                        <td className={'detail-result ' + me.state.test_suites[s].cases[t].classColor + '-dm'}>{me.state.test_suites[s].cases[t].result}<br/>{me.state.test_suites[s].cases[t].note}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                }


                <div className="col-md-4">   
                    <Sticky stickyClassName="sticky-tools" topOffset={-50}>  
                        <div className="tools">
                            <div className="col-sm-12">
                                <div>
                                    <label className="switch switch-success me-3">
                                        <input type="checkbox" className="switch-input" 
                                            checked={me.state.detailview}
                                            onChange={(e)=>{me.setDetailView(e.target.checked)}}>
                                        </input>
                                        <span className="switch-slider"></span>
                                    </label>
                                    <span className="align-super">Visualizzazione dettaglio</span>
                                    <hr/>
                                </div>

                                <button type="button" className="btn btn-success"
                                    onClick={()=>{me.print()}}>
                                    <span className="fa fa-print"></span> Stampa
                                </button>
                            </div>
                        </div>
                    </Sticky>
                </div>
            </div>
        </div>
    );
}

export default view;                        
