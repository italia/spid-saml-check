# *SPID SAML Check*

*SPID SAML Check* effettua test su un Service Provider SPID, verificando la validità delle richieste di autenticazioni SAML provenienti da un Identity Provider (IdP) e delle risposte di autenticazioni restituite dall'IdP. 
È costituito da uno strumento a riga di comando basato su Tox (_`specs-compliance-tests`_), una web application Node.js (_`spid-validator`_) che fornisce una rapida interfaccia grafica e un'estensione per Google *Chrome* per intercettare le richieste SAML.
*SPID SAML Check* è sviluppato e mantenuto da [AgID - Agenzia per l'Italia Digitale](https://www.agid.gov.it).

## Come costruire il contenitore Docker

```
git clone https://github.com/italia/spid-saml-check.git
cd spid-saml-check
$ docker build -t spid-saml-check .
```

## Come eseguire il contenitore Docker

```
$ docker run -t -i -p 8080:8080 spid-saml-check
```

## Usage

- Copia i metadata di spid-saml-check presso il metadata store del tuo SP.
  I metadata di spid-saml-check possono essere scaricati qui: [http://localhost:8080/metadata.xml](http://localhost:8080/metadata.xml)
  ````
  wget http://localhost:8080/metadata.xml -O /path/to/your/sp/metadata/folder/spid-saml-check-metadata.xml
  ````

- Connettendoti al tuo SP avvia la richiesta di autenticazione, questa ti porterà alla schermata di autenticazione
  di spid-saml-check. 
  ![login page](gallery/1.png)

- inserisci come credenziali __validator__/ __validator__
- Al primo accesso potrai vedere la AuthnRequest appena inviata dal tuo SP
  ![authn request](gallery/2.png)

- Clicca su Metadata e scarica i metadata del tuo SP per la validazione.
  **Warning**: Se il tuo SP non è disponibile mediante un FQDN, usa l'ip dell'host Docker e non "localhost"!
  ![metadata](gallery/3.png)

- Adesso potrai eseguire tutti i test in ordine di apparizione: Metadata, Request and Response.
- Seleziona dal menu a tentina il test che desideri eseguire, e marcalo come eseguito e con successo se lo ritieni tale.
  ![Response](gallery/4a.png)


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

