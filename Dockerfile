FROM debian:buster

ENV \
    METADATA=/data/metadata.xml \
    DATA_DIR=/data

RUN apt-get update \
    && apt-get install -y \
        curl \
        gcc \
        libxml2-utils \
        openssl \
        python3 \
        python3-pip \
        xmlsec1 \
    && pip3 install \
        tox

RUN mkdir /data
WORKDIR /usr/src/app
COPY . .

ENTRYPOINT ["tox"]
