# SPID Compliance

Set of Python tools to check the compliance of the SPID specifications.

## How to use

1.  Install dependencies (some of them could be already installed)

    ```.bash
    $ sudo apt-get update
    $ sudo apt-get install \
        curl \
        gcc \
        libffi-devel \
        libiconv-devel \
        libxml2-devel \
        libxml2-utils \
        libxslt-devel \
        openssl \
        openssl-devel \
        python3 \
        python3-devel \
        python3-libxml2 \
        python3-virtualenv \
        xmlsec1
    ```

    Create a Python 3 virtual environment and install `tox`

    ```.bash
    $ virtualenv -p python3 .venv
    $ . .venv/bin/activate
    $ pip install tox
    ```

2.  Create a `data` directory and download the metadata

    ```.bash
    $ mkdir data
    $ wget https://www.example.com/metadata.xml -O ./data/metadata.xml
    ```

3.  Run `tox` as follows

    ```.bash
    $ METADATA=./data/metadata.xml DATA_DIR=./data tox
    ```
