const fs = require("fs-extra");
const path = require('path');
const sha256 = require("sha256");
const moment = require("moment"); 
const Utility = require("../lib/utils");
const config_idp = require("../../config/idp.json");


module.exports = function(app, checkAuthorisation, authenticator) {

    // local authentication
    app.get("/login", (req, res)=> {
        
        if(config_idp.agidloginAuthentication) {
            res.redirect(authenticator.getAuthURL());
    
        } else {
            let user		= req.query.user;
            let password	= req.query.password;
            
            if((user==config_idp.localloginUser && password==config_idp.localloginPasswordHash)) {
                let apikey = recLocalLoginSession(req);
                res.status(200).send({ apikey: apikey });
        
            } else {
                error = {code: 401, msg: "Unauthorized"}
                console.log("ERROR /auth/local : " + error.msg + " (" + user + " : " + password + ")");
                res.status(error.code).send(error.msg);
                return null;				
            }
        }
    });

    // assert if local authentication apikey or AgID Login authentication
    app.get("/login/assert", (req, res)=> {

        // if autoLogin autologin with localloginUser
        if(config_idp.autoLogin) recLocalLoginSession(req);

        if(req.session!=null && req.session.apikey!=null && req.session.apikey!='') {
            res.status(200).send({
                remote: config_idp.agidloginAuthentication,
                apikey: req.session.apikey
            });
        } else {
            error = {code: 401, data: {msg: "Unauthorized", remote: config_idp.agidloginAuthentication}};
            res.status(error.code).send(error.data);
            return null;
        }
    });

    // AgID Login authentication
    app.post("/", function(req, res, next) {
        let state = req.body.state;
        authenticator.getUserInfo(req.body, state, (userinfo)=> {
    
            let userpolicy = userinfo.user_policy[0];
            let entity = userpolicy.entity_id;
            let policy = userpolicy.policy;
    
            let now = moment();
            let validfrom = (userpolicy.valid_from)? moment(userpolicy.valid_from) : moment();
            let validto = (userpolicy.valid_to)? moment(userpolicy.valid_to) : moment();
            let fromnow = now.diff(validfrom, 'days');
            let nowto = validto.diff(now, 'days');
    
            Utility.log("AgID Login USER", userinfo);
    
    
            if(policy.validator && fromnow>-1 && nowto>-1) {
                req.session.apikey = req.session.apikey? req.session.apikey : Utility.getUUID();
                req.session.entity = entity;
                req.session.policy = policy;
                req.session.user = userinfo.sub;
    
                if(userinfo.entity!=null && state!=null && state!="") {
                    Utility.log("SOB API " + state, {user: userinfo.sub, code: userinfo.entity.code});
                }
    
                // STATE custom selection
                /*
                if(userinfo.entity!=null && state!=null && state=="state1") {
                    //...
                    
                } else if(userinfo.entity!=null && state!=null && state=="state2") {
                    //...
    
                } else {
    
                    res.sendFile(path.resolve(__dirname, "../..", "client/build", "index.html"));
                }
                */


                res.sendFile(path.resolve(__dirname, "../..", "client/build", "index.html"));
    
            } else {
                let msg = "Accesso non autorizzato. Contattare l'amministratore di sistema.";
    
                //if(fromnow<0) msg+= "Your accounts is valid from " + userpolicy.valid_from;
                //if(nowto<0) msg+= "Your accounts has expired on " + userpolicy.valid_to;
    
                if(fromnow<0 || nowto<0) msg+= "Your accounts has expired.";
    
                req.session.destroy();
                error = {code: 401, msg: msg}
                res.status(error.code).send(error.msg);
                return null;
            }
    
        }, (error)=> {
            Utility.log("Error", error);
            //res.status(500).send(error);
            res.sendFile(path.resolve(__dirname, "../..", "client/view", "error.html"));
            //res.redirect("/");
        });
    });

    // session logout and AgID Login global logout
    app.get("/logout", (req, res)=> {
        req.session.destroy();
        if(config_idp.agidloginAuthentication) {
            res.redirect(authenticator.getLogoutURL());
        } else {
            res.redirect("/");
        }
    });
    

    function recLocalLoginSession(req) {
        let user = config_idp.localloginUser;
        let passwordHash = config_idp.localloginPasswordHash;
        let apikey = sha256(user + passwordHash).toString();	
        console.log("SUCCESS /auth/local : APIKEY " + apikey);
        req.session.user = user;
        req.session.apikey = apikey;
        return apikey;
    }
}