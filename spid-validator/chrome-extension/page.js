chrome.runtime.sendMessage(
    {action: "spid-validator-start"}, 
    function(response) {
        if(response!=null && response.type === 'setForm') {
            document.getElementById("form").action = response.action;
            document.getElementById("form_RelayState").value = response.RelayState;
            document.getElementById("form_SAMLRequest").value = response.SAMLRequest;
            document.forms[0].submit();
        }
    }
);