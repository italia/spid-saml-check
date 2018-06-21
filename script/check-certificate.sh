#!/bin/bash

pem=${1}

sigalg=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Signature Algorithm" \
    | uniq \
    | cut -d ':' -f 2 \
    | sed -e "s/^\s\s*//g"`

klen=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Public-Key" \
    | cut -d '(' -f 2 | cut -d ' ' -f 1`

alg=`openssl x509 -in ${pem} -noout -text \
    | sed -e "s/^\s\s*//g" \
    | grep "Public Key Algorithm" \
    | cut -d ':' -f 2 | cut -d ' ' -f 2`

subject=`openssl x509 -in ${pem} -noout -subject \
    | sed -e "s/subject=//g" -e "s/^\s\s*//g"`

echo -ne "\tChecking \"${subject}\""

if [ `echo ${sigalg} | grep -c "^sha1"` -eq 1 ]; then
    echo -e "\n\t\tCertificate signed with weak algorithm (${sigalg})"
    exit 1
fi

if [ "${alg}" == "rsaEncryption" ]; then
    MINLEN=2048
    if [ ${klen} -lt ${MINLEN} ]; then
        echo -e "\n\t\tCertificate key (${alg}) is ${klen} bit"
        exit 1
    fi
elif [ "${alg}" == "id-ecPublicKey" ]; then
    MINLEN=256
    if [ ${klen} -lt ${MINLEN} ]; then
        echo -e "\n\t\tCertificate key (${alg}) is ${klen} bit"
        exit 1
    fi
else
    echo -e "\n\tCertificate ${alg} is not allowed\n"
    exit 1
fi

echo ""
