const { Issuer } = require('openid-client');
const Utility = require("./utils");
const Config = require("../../config/idp");

Issuer.defaultHttpOptions = { 
    //followRedirect: true,
    //headers: { 'User-Agent': '' },
    //retries: 0,
    timeout: 30000,
};



class AgIDLoginAuthenticator {
    constructor() {
        this.name = "AgIDLogin";
        this.client_id = Config.agidloginClientID;
        this.client_secret = Config.agidloginClientSecret;
        this.response_type = "code";
        this.redirect_uri = Config.agidloginRedirectURI;
        this.scope = "openid profile";
        this.prompt = ""; //login|consent
        this.response_mode = "form_post";

        this.tokenSet = null;

        let issuer = new Issuer({ 
            issuer: 'https://login.agid.gov.it',
            authorization_endpoint: 'https://login.agid.gov.it/auth?show=agid',
            token_endpoint: 'https://login.agid.gov.it/token',
            userinfo_endpoint: 'https://login.agid.gov.it/userinfo',
            jwks_uri: 'https://login.agid.gov.it/certs',
            end_session_endpoint: 'https://login.agid.gov.it/session/end'
        });

        

        this.client = new issuer.Client({
            client_id: this.client_id,
            client_secret: this.client_secret,
            token_endpoint_auth_method: 'client_secret_post'
        });

        this.client.CLOCK_TOLERANCE = 5 * 60; // to allow a 5 min skew
    }

    getAuthURL() { return getAuthURL(null); }
    getAuthURL(state) {
        this.nonce = Utility.getUUID();
        let authURL = this.client.authorizationUrl({
            response_type: this.response_type,
            redirect_uri: this.redirect_uri,
            scope: this.scope,
            prompt: this.prompt,
            response_mode: this.response_mode,
            state: (state!=null && state!='')? state : this.state,
            nonce: this.nonce
        });

        return authURL;
    }

    getUserInfo(authorizationPostData, state, result, error) {
        this.client.authorizationCallback(
            this.redirect_uri, 
            {
                state: state,
                ...authorizationPostData
            },
            {
                state: state,
                nonce: this.nonce,
                response_type: this.response_type
            }

        ).then((tokenSet)=> {
            this.tokenSet = tokenSet;
            this.client.userinfo(tokenSet)
            .then((userinfo)=> {
                result(userinfo);
            });
            
        }).catch((e)=> {
            error({
                function: "getUserInfo",
                error: e,
                state: state,
                nonce: this.nonce
            });
        });
    }

    getLogoutURL() {
        let logoutURL = this.client.endSessionUrl({
            post_logout_redirect_uri: Config.agidloginPostLogoutRedirectURI,
            state: this.state,
            id_token_hint: this.tokenSet
        });

        return logoutURL;
    }
}


module.exports = AgIDLoginAuthenticator;
