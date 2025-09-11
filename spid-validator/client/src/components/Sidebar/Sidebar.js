import React, {Component} from 'react';
import {NavLink} from 'react-router-dom';
import {Badge, Nav, NavItem, NavLink as RsNavLink} from 'reactstrap';
import classNames from 'classnames';
import nav from './_nav';
import SidebarFooter from './../SidebarFooter';
import SidebarForm from './../SidebarForm';
import SidebarHeader from './../SidebarHeader';
//import SidebarMinimizer from './../SidebarMinimizer';
import Utility from '../../utility';
import Services from '../../services';
import ReduxStore from "../../redux/store";
import UtilActions from "../../redux/util/actions";
import Sticky from 'react-sticky-el';


class Sidebar extends Component {

  constructor(props) {
    super(props);
    this.props = props;

    this.handleClick = this.handleClick.bind(this);
    this.activeRoute = this.activeRoute.bind(this);
    this.hideMobile = this.hideMobile.bind(this);

    this.utilStore = ReduxStore.getUtil();
    this.unsubscribeUtil = this.utilStore.subscribe(()=>this.onUtilStoreUpdate());

    this.state = {
      sessionActive: false
    }

    this.checkSession();
  }

  checkSession() {
    let service = Services.getMainService();
    service.getInfo(
      (info) => {
        this.setState({ sessionActive: true });
        Utility.log("Session info", info);
      }, 
      ()=> {
        this.setState({ sessionActive: false });
        Utility.log("Session not found");
      },
      (error)   => {
        this.setState({ sessionActive: false });;
        Utility.showModal({
            title: "Errore",
            body: error,
            isOpen: true
        });        
      }
    );
  }

	onUtilStoreUpdate() {
		let utilState = this.utilStore.getState(); 
		if(utilState.updateSidebar) {
      this.checkSession();
      this.utilStore.dispatch(UtilActions.updateSidebar(false));
    }
  }
  
  handleClick(e) {
    e.preventDefault();
    e.target.parentElement.classList.toggle('open');
  }

  activeRoute(routeName, props) {
    return window.location.pathname.indexOf(routeName) > -1 ? 'nav-item nav-dropdown open' : 'nav-item nav-dropdown';

  }

  hideMobile() {
    if (document.body.classList.contains('sidebar-mobile-show')) {
      document.body.classList.toggle('sidebar-mobile-show')
    }
  }

  // todo Sidebar nav secondLevel
  // secondLevelActive(routeName) {
  //   return window.location.pathname.indexOf(routeName) > -1 ? "nav nav-second-level collapse in" : "nav nav-second-level collapse";
  // }


  render() {

    const props = this.props;

    // badge addon to NavItem
    const badge = (badge) => {
      if (badge) {
        const classes = classNames( badge.class );
        return (<Badge className={ classes } color={ badge.variant }>{ badge.text }</Badge>)
      }
    };

    // simple wrapper for nav-title item
    const wrapper = item => { return (item.wrapper && item.wrapper.element ? (React.createElement(item.wrapper.element, item.wrapper.attributes, item.name)): item.name ) };

    // nav list section title
    const title =  (title, key) => {
      const classes = classNames( 'nav-title', title.class);
      return (<li key={key} className={ classes }>{wrapper(title)} </li>);
    };

    // nav list divider
    const divider = (divider, key) => {
      const classes = classNames( 'divider', divider.class);
      return (<li key={key} className={ classes }></li>);
    };

    // nav item with nav link
    const navItem = (item, key) => {
      const classes = {
        item: classNames( item.class) ,
        link: classNames( 'nav-link', item.variant ? `nav-link-${item.variant}` : ''),
        icon: classNames( item.icon )
      };
      return (
        navLink(item, key, classes)
      )
    };

    // nav link
    const navLink = (item, key, classes) => {
      const url = item.url ? item.url : '';
      return (
        <NavItem key={key} className={classes.item}>
          {
            url=='logout' ?
              <a href="logout" className={classes.link}><i className={classes.icon}></i>{item.name}{badge(item.badge)}</a>
            :isExternal(url) ?
              <RsNavLink href={url} className={classes.link} active>
                <i className={classes.icon}></i>{item.name}{badge(item.badge)}
              </RsNavLink>
            :
              <NavLink to={url} className={classes.link} onClick={this.hideMobile}>
                <i className={classes.icon}></i>{item.name}{badge(item.badge)}
              </NavLink>
          }
        </NavItem>
      )
    };

    // nav dropdown
    const navDropdown = (item, key) => {
      let open = item.open && !this.state.sessionActive? "open" : "";
      return (
        <li key={key} className={open + ' ' + this.activeRoute(item.url, props)}>
          <a className="nav-link nav-dropdown-toggle" href="#" onClick={this.handleClick}><i className={item.icon}></i>{item.name}</a>
          <ul className="nav-dropdown-items">
            {navList(item.children)}
          </ul>
        </li>)
    };

    // nav type
    const navType = (item, idx) =>
      item.title ? title(item, idx) :
      item.divider ? divider(item, idx) :
      item.children ? navDropdown(item, idx)
                    : navItem(item, idx) ;
  
    

    // nav list
    const navList = (items) => {
      return items.map((item, index)=> {
        // if is not requested session or it's requested and session is active
        if(!(!this.state.sessionActive && item.sessionRequired)) {
          if(item.disabled==undefined || item.disabled===false) {
            return navType(item, index);
          }
        } 
      });
    };

    const isExternal = (url) => {
      const link = url ? url.substring(0, 4) : '';
      return link === 'http';
    };

    // sidebar-nav root
    return (
      <div className="sidebar">
        <SidebarHeader/>
        <SidebarForm/>
        <nav className="sidebar-nav">
          <Sticky stickyClassName="sticky-menu" topOffset={-100}>
          <Nav>
            {navList(nav.items)}
          </Nav>
          </Sticky>
        </nav>
        <SidebarFooter/>
        {/*<SidebarMinimizer/>*/}
      </div>
    )
  }
}

export default Sidebar;
