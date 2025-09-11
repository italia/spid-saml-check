import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import 'font-awesome/css/font-awesome.min.css';

import '../scss/style.scss'
import '../scss/core/_dropdown-menu-right.scss'

// Containers
import Base from './containers/Base'
import Empty from './containers/Empty'
import Main from './containers/Main'

import Login from './views/Login/';
import Redirect from './views/Redirect/';
import Worksave from './views/Worksave/';
import MetadataSpCheck from './views/MetadataSpCheck/';
import MetadataSpDownload from './views/MetadataSpDownload/';
import MetadataSpUploadZip from './views/MetadataSpUploadZip/';
import Request from './views/Request/';
import RequestCheck from './views/RequestCheck/';
import Response from './views/Response/';
import ResponseReport from './views/ResponseReport/';
import config from "./config.json";

const root = createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter basename={config.basepath}> 
    <Routes>
      <Route path="/" element={<Base/>}>
        <Route path="/" element={<Login/>}/>
      </Route>
      <Route path="/worksave" element={<Empty/>}>
        <Route path="/worksave" element={<Worksave/>}/>
      </Route>
      <Route path="/metadata" element={<Main/>}>
        <Route path="/metadata/download" element={<MetadataSpDownload/>}/>
        <Route path="/metadata/upload-zip" element={<MetadataSpUploadZip/>}/>
        <Route path="/metadata/check/xsd" element={<MetadataSpCheck test="xsd"/>}/>
        <Route path="/metadata/check/strict" element={<MetadataSpCheck test="strict"/>}/>
        <Route path="/metadata/check/certs" element={<MetadataSpCheck test="certs"/>}/>
        <Route path="/metadata/check/extra" element={<MetadataSpCheck test="extra"/>}/>
      </Route>
      <Route path="/request" element={<Main/>}>
        <Route path="/request" element={<Request/>}/>
        <Route path="/request/check/strict" element={<RequestCheck test="strict"/>}/>
        <Route path="/request/check/certs" element={<RequestCheck test="certs"/>}/>
        <Route path="/request/check/extra" element={<RequestCheck test="extra"/>}/>
      </Route>
      <Route path="/response" element={<Main/>}>
        <Route path="/response/:suiteid/:caseid" element={<Response/>}/>
        <Route path="/response" element={<Response/>}/>
        <Route path="/response/report" element={<ResponseReport/>}/>
      </Route>      
      <Route path='/logout' element={<Redirect redirect={config.basepath + '/logout'}/>} />
    </Routes>
  </BrowserRouter>
); 
