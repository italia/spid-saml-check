import React from 'react';
import { UncontrolledTooltip } from 'reactstrap';
import BlockUi from 'react-block-ui';
import AceEditor from '../../components/AceEditor/';
import "./style.css";

function view(me) { 
    return (
        <div id="MetadataSpUploadZip" className="animated fadeIn">
            <p className="title h3">Metadata Service Provider ZIP</p>

            <div className="row upload-section">
                <div className="col-sm-12">
                    <b>Metadata ZIP File</b>
                </div>  
                <div className="col-sm-12 mt-3">  
                    {!me.state.loading &&
                        <div>
                            <input type="file" 
                                ref="inputMetadata"
                                id="input-metadata-upload" />
                            <button type="button"
                                className="btn btn-sm btn-primary" 
                                onClick={(e)=>{me.uploadMetadataZip(me.refs.inputMetadata.files[0])}}
                            >Upload ZIP</button>
                        </div>
                    }
                    {me.state.loading &&
                        <div>
                            {me.state.progress_message} {me.state.progress}
                        </div>
                    }
                </div>
            </div>

            {me.state.loaded &&
            <div className="row mt-5">
                {!me.state.detailview &&
                    <div className="col-md-8 main">
                        {me.state.report!=null && 
                            <div className="row testset"> 
                                <div className="col-sm-12">
                                    <p>File: <b><span class="first-upper">{me.state.fileName}</span></b></p>
                                    <p>Num. Metadata: <b><span class="first-upper">{me.state.report.metadata.length}</span></b></p>
                                    
                                    {me.state.report.metadata.map((m, i)=> {
                                        return(
                                            <a key={i} 
                                                href=""
                                                onClick={(e)=> {e.preventDefault(); me.openMetadata(m)}}
                                                className={m.validation? "test-success" : "test-fail" }
                                                title={m.name}> {i} 
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
                                    <p>File: <b><span class="first-upper">{me.state.fileName}</span></b></p>
                                    <p>Num. Metadata: <b><span class="first-upper">{me.state.report.metadata.length}</span></b></p>                                   
                                    
                                    <table className="detail-table">
                                        <tr className="detail-header">
                                            <th className="detail-num">#</th>
                                            <th className="detail-description">File</th>
                                            <th className="detail-result">Result</th>
                                        </tr>
                                        {me.state.report.metadata.map((m, i)=> {
                                            return(
                                                <tr key={i} className="detail-row">
                                                    <td className={m.validation? "detail-num test-success-dm" : "detail-num test-fail-dm"}>{i}</td>
                                                    <td className="detail-description">
                                                        <a href=""
                                                            onClick={(e)=> {e.preventDefault(); me.openMetadata(m)}}>
                                                            {m.name}
                                                        </a>
                                                    </td>
                                                    <td className={m.validation? "detail-result test-success-dm" : "detail-result test-fail-dm"}>
                                                        {m.validation? "OK" : "KO"}
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

                            <div className="check-selector mt-3">
                                <label>
                                    Seleziona modalità test:<br/>
                                    <select 
                                        name="check"
                                        className="form-control mt-3"
                                        value={ me.state.check }
                                        onChange={(e)=> {me.setCheck(e.target.value)}}>

                                        <option value="strict">Strict</option>
                                        <option value="extra">Extra</option>
                                    </select>
                                </label>
                            </div>

                            <div className="profile-selector mt-3">
                                <label>
                                    Seleziona un profilo:<br/>
                                    <select 
                                        name="profile"
                                        className="form-control mt-3"
                                        value={ me.state.profile }
                                        onChange={(e)=> {me.setProfile(e.target.value)}}>

                                        <option value="saml2-sp">SAML2</option>
                                        <option value="spid-sp-public">SPID Public</option>
                                        <option value="spid-sp-private">SPID Private</option>
                                        <option value="spid-sp-ag-public-full">SPID Public Full Aggregator</option>
                                        <option value="spid-sp-ag-public-lite">SPID Public Lite Aggregator</option>
                                        <option value="spid-sp-op-public-full">SPID Public Full Operator</option>
                                        <option value="spid-sp-op-public-lite">SPID Public Lite Operator</option>
                                        <option value="cie-sp-public">CIE Public</option>
                                        <option value="cie-sp-private">CIE Private</option>
                                        <option value="ficep-eidas-sp">eIDAS FICEP</option>
                                    </select>
                                </label>
                            </div>
                            
                            <div className="production-selector mt-3">
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
                                onClick={()=>{me.uploadMetadataZip(me.state.file)}}>
                                <span className="cui-print"></span> Nuova validazione
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            }




            {/*me.state.result!="" &&
                <div className="row">
                    <div className="col-sm-12 code">
                        <AceEditor code={me.state.report} mode="json" />
                    </div>
                </div>
            */}
        </div>
    );
}

export default view;                        
