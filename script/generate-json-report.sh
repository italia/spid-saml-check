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
