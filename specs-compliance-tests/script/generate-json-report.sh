# Copyright 2018 AgID - Agenzia per l'Italia Digitale
#
# Licensed under the EUPL, Version 1.2 or - as soon they will be approved by
# the European Commission - subsequent versions of the EUPL (the "Licence").
#
# You may not use this work except in compliance with the Licence.
#
# You may obtain a copy of the Licence at:
#
#    https://joinup.ec.europa.eu/software/page/eupl
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the Licence is distributed on an "AS IS" basis, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# Licence for the specific language governing permissions and limitations
# under the Licence.

#!/bin/bash

files=`find ${DATA_DIR} -type f -name "*.json" | tr '\n' ' '`
IFS=' ' read -r -a array <<< ${files}

for idx in ${!array[@]}; do
    next=$(mktemp)
    if [ ${idx} -eq 0 ]; then
        jq -s .[0] ${array[idx]} > ${next}
    else
        jq -s '.[0] * .[1]' ${prev} ${array[idx]} > ${next}
    fi

    rm -f ${prev}
    prev=${next}
done

cat ${next} > ${DATA_DIR}/report.json
