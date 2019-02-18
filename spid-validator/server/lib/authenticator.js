const { Issuer } = require('openid-client');


class AgIDLoginAuthenticator {

    constructor(state) {
        this.name = "AgIDLogin";
        this.client_id = "675ca60a-a746-49f8-b262-d32786cdca2c";
        this.client_secret = "4dd05569-99c9-4dde-8f9f-5440bb33684a";
        this.response_type = "code";
        this.redirect_uri = "http://localhost:8080/";
        this.scope = "openid profile";
        this.prompt = ""; //login|consent
        this.response_mode = "form_post";
        this.state = state;
        this.nonce = state;

        this.tokenSet = null;

        let issuer = new Issuer({ 
            issuer: 'https://login.agid.gov.it',
            authorization_endpoint: 'https://login.agid.gov.it/auth',
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
    }

    getAuthURL() {
        let authURL = this.client.authorizationUrl({
            response_type: this.response_type,
            redirect_uri: this.redirect_uri,
            scope: this.scope,
            prompt: this.prompt,
            response_mode: this.response_mode,
            state: this.state,
            nonce: this.nonce
        });

        return authURL;
    }

    getUserInfo(authorizationPostData, nonce, result, error) {
        this.client.authorizationCallback(
            this.redirect_uri, 
            authorizationPostData,
            { 
                state: this.state, 
                response_type: this.response_type,
                nonce: nonce
            }

        ).then((tokenSet)=> {
            this.tokenSet = tokenSet;
            this.client.userinfo(tokenSet)
            .then((userinfo)=> {
                result(userinfo);
            });
            
        }).catch((e)=> {
            error(e);
        });
    }

    getLogoutURL() {
        let logoutURL = this.client.endSessionUrl({
            post_logout_redirect_uri: 'http://localhost:8080/logout',
            state: this.state,
            id_token_hint: this.tokenSet
        });

        return logoutURL;
    }
}


module.exports = AgIDLoginAuthenticator;
