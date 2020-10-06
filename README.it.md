# *SPID SAML Check*

*SPID SAML Check* effettua test su un Service Provider SPID, verificando la validità delle richieste di autenticazioni SAML provenienti da un Identity Provider (IdP) e dellerisposte di autenticazioni restituite dall'IdP. 
È costituito da uno strumento a riga di comando basato su Tox (_`specs-compliance-tests`_), una web application Node.js (_`spid-validator`_) che fornisce una rapida interfaccia grafica e un'estensione per Google *Chrome* per intercettare le richieste SAML.
*SPID SAML Check* è sviluppato e mantenuto da [AgID - Agenzia per l'Italia Digitale](https://www.agid.gov.it).

## Come costruire il contenitore Docker

```
$ docker build -t spid-saml-check .
```

## Come eseguire il contenitore Docker

```
$ docker run -t -i -p 8080:8080 spid-saml-check
```

## Come usare lo *SPID Validator*

L'applicazione Node.js, se invocata *così com'è*, effettua un collaudo formale del solo metadata SAML del SP.
Per utilizzare l'intero set di controlli (il vero e proprio *SPID Validator*), va scaricato il metadata SAML disponibile all'indirizzo http://localhost:8080/metadata.xml installandolo come un nuovo IdP presso la propria implementazione di SP.
Usato in questo modo, lo *SPID Validator* può essere invocato come un IdP dal proprio SP, e invece dell'autenticazione fornisce un insieme di più di 300 controlli individuali, divisi in 7 famiglie:
 * 4 famiglie per la convalida formale del **metadata** SP (come sopra descritto);
 * 3 famiglie per la convalida formale delle **request** SAML;
 * 1 famiglia (111 controlli) per la convalida *interattiva* del comportamento del SP alle **response** dall'IdP.

Per usare lo *SPID Validator* le richieste di autenticazione sono dunque generate dal proprio SP, autentiandosi al *Validator* con le seguenti credenziali:

   Username: validator

   Password: validator

