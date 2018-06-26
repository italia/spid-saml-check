#!/bin/bash

_DATA_DIR=${DATA_DIR:-"./data"}
_DEBUG=${DEBUG:-0}

SAMLRequest=`cat ${_DATA_DIR}/SAMLRequest.logout-request.b64.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[SAMLRequest]\n\n${SAMLRequest}"
fi

RelayState=`cat ${_DATA_DIR}/RelayState.logout-request.b64.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[RelayState]\n\n${RelayState}"
fi

Signature=`cat ${_DATA_DIR}/Signature.logout-request.b64.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[Signature]\n\n${Signature}"
fi

SigAlg=`cat ${_DATA_DIR}/SigAlg.logout-request.b64.txt`
if [ ${_DEBUG} -eq 1 ]; then
    echo -e "\n[SigAlg]\n\n${SigAlg}\n"
fi

if [ "X${Signature}" == "X" -a "X${SigAlg}" == "X" ]; then
    # decode SAMLRequest
    req=`mktemp`
    echo -n ${SAMLRequest} | base64 -d > ${req}

    # verify against XSD
    xmllint --noout --schema ./xsd/saml-schema-protocol-2.0.xsd ${req}
    if [ $? -ne 0 ]; then
        rm ${req}
        exit 1
    fi

    # verify XML signature
    xmlsec1 \
        --verify \
        --insecure \
        --id-attr:ID urn:oasis:names:tc:SAML:2.0:protocol:LogoutRequest \
        ${req}
    if [ $? -ne 0 ]; then
        rm ${req}
        exit 1
    fi

    rm ${req}
else
    echo 'HTTP-Redirect... TODO!'
fi

exit 0
