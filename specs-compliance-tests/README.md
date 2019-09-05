# SPID Compliance

[Tox](#) based environment to check the SPID specifications compliance of SP
and IDP.

SPID Compliance has been developed and is maintained by AgID - Agenzia per l'Italia Digitale

The environment is organised in test suites, which are labeled as
`strict` (*must be* specifications), `certs` (crypto specifications) and
`extra` (*would be* specifications). The list of test suites includes:

*   `cleanup`
*   `generate-global-json-report`
*   `idp-authn-response-certs`
*   `idp-authn-response-extra`
*   `idp-authn-response-strict`
*   `idp-logout-response-certs`
*   `idp-logout-response-extra`
*   `idp-logout-response-strict`
*   `idp-metadata-certs`
*   `idp-metadata-extra`
*   `idp-metadata-strict`
*   `lint`
*   `sp-authn-request-certs`
*   `sp-authn-request-extra`
*   `sp-authn-request-strict`
*   `sp-logout-request-certs`
*   `sp-logout-request-extra`
*   `sp-logout-request-strict`
*   `sp-metadata-certs`
*   `sp-metadata-extra`
*   `sp-metadata-strict`

Each test suite can be driven with environment variables, which are defined as
follows

*   common

    *   `DATA_DIR` (path where data is stored, default: `./data`)
    *   `DEBUG` (toggle debug mode, default: 0)
    *   `SSLLABS_FORCE_NEW` (Force new scan in SSL Labs tests, default: 0)
    *   `SSLLABS_SKIP` (skip SSL Labs tests, default: 0)

*   `sp-metadata-strict`, `sp-metadata-certs`, `sp-metadata-extra`,

    *   `SP_METADATA` (path to metadata file)

*   `sp-authn-request-strict`, `sp-authn-request-certs`,
    `sp-authn-request-extra`

    *   `SP_METADATA` (path to metadata file)
    *   `AUTHN_REQUEST` (path to authentication request dump)

*   `sp-logout-request-strict`, `sp-logout-request-certs`,
    `sp-logout-request-extra`

    *   `SP_METADATA` (path to metadata file)
    *   `LOGOUT_REQUEST` (path to logout request dump)

*   `idp-authn-response-strict`, `idp-authn-response-certs`,
    `idp-authn-response-extra`

    *   `IDP_METADATA` (path to metadata file)
    *   `AUTHN_RESPONSE` (path to autnn response dump)

*   `idp-logout-response-strict`, `idp-logout-response-certs`,
    `idp-logout-response-extra`

    *   `IDP_METADATA` (path to metadata file)
    *   `LOGOUT_RESPONSE` (path to logout response dump)

For instance, to check only the SP metadata compliance, you have to run

```.bash
$ DATA_DIR=./data SP_METADATA=./data/metadata.xml \
    tox -e cleanup,sp-metadata-strict,sp-metadata-certs,sp-metadata-extra,generate-global-json-report
```

## How to dump requests and responses

Requests and resposnes can occur via `HTTP-POST` or `HTTP-Redirect`. By using
a tool like [Burpsuite](#) you can easily intercept and save the
requests/responses.

A dump of `HTTP-POST` request should contain something like that

```
SAMLRequest=<URL-Encoded Base64 string>&RelayState=<URL-Encoded string>
```

while for `HTTP-Redirect`

```
SAMLRequest=<URL-Encoded Base64 string>&RelayState=<URL-Encoded string>&SigAlg=<URL-Encoded string>&Signature=<URL-Encoded Base64 string>
```

A dump of `HTTP-POST` response should contain something like that

```
SAMLResponse=<URL-Encoded Base64 string>&RelayState=<URL-Encoded string>
```

while for `HTTP-Redirect`

```
SAMLResponse=<URL-Encoded Base64 string>&RelayState=<URL-Encoded string>&SigAlg=<URL-Encoded string>&Signature=<URL-Encoded Base64 string>
```

## How to use

1.  Install dependencies (some of them could be already installed)

    ```.bash
    $ sudo apt-get update
    $ sudo apt-get install \
        curl \
        gcc \
        jq \
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

2.  Create a data directory (e.g. `/tmp/data`) and save on it all the files that
    will be analysed (e.g. SP matadata, AuthN request, logout response, etc.)

    ```.bash
    $ mkdir /tmp/data
    $ wget https://my.sp.it/metadata.xml -O /tmp/data/sp-metadata.xml
    $ wget https://my.idp.it/metadata.xml -O /tmp/data/idp-metadata.xml
    $ cp <something> /tmp/authn-request.txt
    ... and so on ...
    ```

    Then, create an RC file (e.g. `myenv.rc`) where all the environment variables will be defined

    ```.bash
    export AUTHN_REQUEST=/tmp/data/authn-request.txt
    export AUTHN_RESPONSE=/tmp/data/authn-response.txt
    export DATA_DIR=/tmp/data
    export IDP_METADATA=/tmp/data/idp-metadata.xml
    export LOGOUT_REQUEST=/tmp/data/logout-request.txt
    export LOGOUT_RESPONSE=/tmp/data/logout-response.txt
    export SP_METADATA=/tmp/data/sp-metadata.xml
    export SSLLABS_SKIP=0
    export DEBUG=0
    ```

3.  If you want to run all the test suites in one shot, run `tox` as follows

    ```.bash
    $ source myenv.rc && tox
    ```

    otherwise, if you want to run just some test suites (e.g. just for SP
    metadata), list them as follows

    ```.bash
    $ source myenv.rc && tox -e cleanup,sp-metadata-strict,sp-metadata-certs,sp-metadata-extra
    ```
