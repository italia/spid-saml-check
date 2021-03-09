var host = "https://validator.spid.gov.it/samlsso";
var SAMLRequest = "";
var RelayState = "";
var action = host;

const SETTINGS_ENABLE = "spid-assertion-consumer-validator-enable";


chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log(details.method + ": " + details.url);
    let enable = localStorage.getItem(SETTINGS_ENABLE);
    if(enable=="ON") {
      if(details.url.startsWith("https://loginspid.aruba.it/ServiceLoginWelcome") ||
          details.url.startsWith("https://spid.intesa.it/Time4UserServices/services/idp/AuthnRequest/") ||
          details.url.startsWith("https://identity.infocert.it/spid/samlsso") ||
          details.url.startsWith("https://idp.namirialtsp.com/idp/profile/SAML2/POST/SSO") ||
          details.url.startsWith("https://idp.namirialtsp.com/idp/profile/SAML2/Redirect/SSO") ||
          details.url.startsWith("https://posteid.poste.it/jod-fs/ssoservicepost") ||
          details.url.startsWith("https://posteid.poste.it/jod-fs/ssoserviceredirect") ||
          details.url.startsWith("https://spid.register.it/login/sso") ||
          details.url.startsWith("https://identity.sieltecloud.it/simplesaml/saml2/idp/SSO.php") ||
          details.url.startsWith("https://identity.sieltecloud.it/simplesaml/saml2/idp/SSOService.php") ||
          details.url.startsWith("https://login.id.tim.it/affwebservices/public/saml2sso")
        ) {

        if(details.method=="POST") {  
          // HTTP-POST BINDING
          let formData = details.requestBody.formData;

          if(formData!=null) {
            SAMLRequest = formData.SAMLRequest;
            RelayState = formData.RelayState;

          } else {
            let rawBody = details.requestBody.raw.map(function(data) { 
              let decoder = new TextDecoder();
              return decoder.decode(data.bytes);
              //return String.fromCharCode.apply(null, new Uint8Array(data.bytes));
            }).join('');
  
            let raw = rawBody.split("&");         
            for(let i in raw) {
                if(raw[i].substring(0,11)=="SAMLRequest") SAMLRequest = urldecode(raw[i].substring(12));
                if(raw[i].substring(0,10)=="RelayState") RelayState = urldecode(raw[i].substring(11));
            }
          }  

          chrome.tabs.create({"url" : chrome.extension.getURL("page.html")});                       

        } else if(details.method=="GET") {  
          //HTTP-REDIRECT BINDING
          let query = details.url.split("?")[1];
          chrome.tabs.create({"url" : host + "?" + query}); 

        } else {
          // none
        }
      }
    }
  },
  {
    urls: ["<all_urls>"]
  },
  ['requestBody']
);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.action=="spid-validator-start") {
    sendResponse({
      type: 'setForm',
      action: action,
      SAMLRequest: SAMLRequest,
      RelayState: RelayState
    });    
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
  let enable = localStorage.getItem(SETTINGS_ENABLE);
  localStorage.setItem(SETTINGS_ENABLE, (enable==null || enable=="OFF")? "ON":"OFF");
  chrome.browserAction.setIcon((enable==null || enable=="OFF")? {path:"icon_on.png"}:{path:"icon_off.png"});
});



function urldecode(string) {
  return decodeURIComponent(string.replace(/\+/g, ' '));
}
