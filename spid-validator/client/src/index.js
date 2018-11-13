import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter, Route, Switch} from 'react-router-dom';

import BlockUi from 'react-block-ui';
import 'react-block-ui/style.css';

// Styles
// Import Flag Icons Set
import 'flag-icon-css/css/flag-icon.min.css';
// Import Font Awesome Icons Set
import 'font-awesome/css/font-awesome.min.css';
// Import Simple Line Icons Set
import 'simple-line-icons/css/simple-line-icons.css';
// Import Main styles for this application
import '../scss/style.scss'
// Temp fix for reactstrap
import '../scss/core/_dropdown-menu-right.scss'

// Containers
import Main from './containers/Main'
import Empty from './containers/Empty'

ReactDOM.render((
  <HashRouter>
    <Switch>
      <Route path="/metadata-sp-download" component={Main}/>
      <Route path="/metadata-sp-check-strict" component={Main}/>
      <Route path="/metadata-sp-check-certs" component={Main}/>
      <Route path="/metadata-sp-check-extra" component={Main}/>
      <Route path="/request" component={Main}/>
      <Route path="/request-check-strict" component={Main}/>
      <Route path="/request-check-certs" component={Main}/>
      <Route path="/request-check-extra" component={Main}/>
      <Route path="/response/:suiteid/:caseid" component={Main}/>
      <Route path="/response" component={Main}/>
      <Route path="/response-report" component={Main}/>
      <Route path="/worksave" component={Empty}/>
      <Route path="/login" component={Empty}/>
	  <Route path="/" name="Home" component={Empty}/>
    </Switch>
  </HashRouter>
), document.getElementById('root'));
