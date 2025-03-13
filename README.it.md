# *SPID SAML Check*

*SPID SAML Check* è una suita applicativa che fornisce diversi strumenti ai Service Provider SPID, utili per ispezionare le request di autenticazione SAML inviate all'Identity Provider, verificare la correttezza del metadata e inviare response personalizzate al Service Provider. SPID SAML Check è costituito da:
 - [spid-sp-test](https://github.com/italia/spid-sp-test), per eseguire i test di conformità alle specifiche SPID
 - una web application (_`spid-validator`_) che fornisce una interfaccia grafica per l'esecuzione dei test e l'invio delle response
 - una web application (_`spid-demo`_) che implementa un IdP di test per eseguire demo di autenticazione
 - un'estensione per Google *Chrome* che permette di intercettare le richieste SAML (deprecata)

*SPID SAML Check* è sviluppato e mantenuto da [AgID - Agenzia per l'Italia Digitale](https://www.agid.gov.it).

## Quick start con Docker
L'intera suite applicativa è disponibile come immagine Docker pubblicata
su DockerHub [italia/spid-saml-check](https://hub.docker.com/r/italia/spid-saml-check).

Fin da subito è quindi possibile eseguire il container Docker utilizzando
il comando indicato a seguire.

```
# Esecuzione dell'ultima versione
docker run -t -i -p 8443:8443 italia/spid-saml-check

# Esecuzione di una specifica versione
docker run -t -i -p 8443:8443 italia/spid-saml-check:v.1.8.1
```

Così facendo l'applicazione spid-validator è immediatamente disponibile
all'indirizzo https://localhost:8443

In console vengono mostrate informazioni utili quali: 
 - la versione della suite spid-saml-check
 - la versione del tool spid-sp-test
 - il comando per ottenere la shell bash
 
A seguire un esempio di output che dovreste ottenere dall'esecuzione di uno dei comandi mostrati in precedenza.

```
> spid-validator@1.0.0 start-prod /spid-saml-check/spid-validator
> node server/spid-validator.js

>>> DATABASE : QUERY
...

Attach to container by this command: docker exec -it 41c81fba9a26 /bin/bash

spid-validator
version: 1.8.1-627d2e7-dirty


listening on port 8443


SPID SP Test Tool (spid-sp-test), version: 0.9.22
```

Le immagini pubblicate su Docker Hub sono tutte sono arricchite di tutti
questi metadati che consentono di risalire alla versione del software
di riferimento. Per fare un verifica di questi metadati è possibile eseguire
il comando `docker image inspect italia/spid-saml-check:1.8.1` per ottenere
un output simile a quello mostrato a seguire.

```
"Labels": {
  "org.opencontainers.image.authors": "Michele D'Amico, michele.damico@agid.gov.it",
  "org.opencontainers.image.base.name": "italia/spid-saml-check",
  "org.opencontainers.image.created": "2021-10-02T21:03:16Z",
  "org.opencontainers.image.description": "SPID SAML Check è una suita applicativa che fornisce diversi strumenti ai Service Provider SPID, utili per ispezionare le request di autenticazione SAML inviate all'Identity Provider, verificare la correttezza del metadata e inviare response personalizzate al Service Provider.",
  "org.opencontainers.image.licenses": "EUPL-1.2",
  "org.opencontainers.image.revision": "7117b67",
  "org.opencontainers.image.source": "https://github.com/amusarra/spid-saml-check.git",
  "org.opencontainers.image.title": "SPID SAML Check",
  "org.opencontainers.image.url": "https://github.com/italia/spid-saml-check",
  "org.opencontainers.image.vendor": "Developers Italia",
  "org.opencontainers.image.version": "1.8.1"
}

```


## Come costruire l'immagine Docker ed eseguire il container
Nel caso in cui abbiate per esempio apportato delle modifiche al progetto e
volete costruire la vostra immagine, è possibile procedere nel seguende modo.


```
# 1. Clone del repository
git clone https://github.com/italia/spid-saml-check.git

# 2. Aggiornamento certificati

crea chiave privata e certificato per il protocollo https
 - spid-validator/config/spid-saml-check.key
 - spid-validator/config/spid-saml-check.crt

configura chiave privata e certificato per la firma delle response nei seguenti file
 - spid-validator/config/idp.json
 - spid-validator/config/idp_demo.json

# 3. Esecuzione della build
cd spid-saml-check
docker build -t spid-saml-check .
```

Un volta terminato il processo di build dell'immagine (che potrebbe durare
diversi minuti), è possibile eseguire il container utilizzando il comando a
seguire.


```
docker run -t -i -p 8443:8443 spid-saml-check
```

## Come usare *SPID Validator*

L'applicazione spid-validator, se invocata *così com'è*, effettua un collaudo formale del solo metadata SAML del SP.
Per utilizzare l'intero set di controlli (il vero e proprio *SPID Validator*), va scaricato il metadata SAML disponibile all'indirizzo https://localhost:8443/metadata.xml installandolo come un nuovo IdP presso la propria implementazione di SP.
Usato in questo modo, lo *SPID Validator* può essere invocato come un IdP dal proprio SP, presentando un insieme di più di 300 controlli individuali, divisi in 7 famiglie:
 * 4 famiglie per la convalida formale del **metadata** SP (come sopra descritto);
 * 3 famiglie per la convalida formale delle **request** SAML;
 * 1 famiglia (111 controlli) per la convalida *interattiva* del comportamento del SP alle **response** dall'IdP.

Per usare lo *SPID Validator* pertanto occorre inviare una richiesta di autenticazione dal proprio SP e autenticarsi al *Validator* con le credenziali __validator__ / __validator__


### Passi per l'utilizzo

- Copia il metadata di spid-validator presso il metadata store del tuo SP.
  I metadata di spid-validator possono essere scaricati qui: [https://localhost:8443/metadata.xml](https://localhost:8443/metadata.xml)
  ````
  wget https://localhost:8443/metadata.xml -O /path/to/your/sp/metadata/folder/spid-saml-check-metadata.xml
  ````

- Connettendoti al tuo SP invia una richiesta di autenticazione, questa ti porterà alla schermata di autenticazione di spid-validator. 

  <img src="doc/img/login.png" width="500" alt="login page" />

- Inserisci come credenziali __validator__/ __validator__
- Al primo accesso potrai vedere la AuthnRequest appena inviata dal tuo SP

  <img src="doc/img/2.png" width="500" alt="authn request page" />

- Clicca su Metadata e scarica i metadata del tuo SP per la validazione.<br/>
  **Attenzione**: Se il tuo SP non è disponibile mediante un FQDN, usa l'ip dell'host Docker e non "localhost"!
  
  <img src="doc/img/3.png" width="500" alt="metadata download page" />

- Adesso potrai eseguire tutti i test in ordine di apparizione: Metadata, Request and Response.
- Per testare una Response, dalla sezione Response, seleziona dal menu a tendina il test che desideri eseguire, e marcalo come eseguito e con successo se lo ritieni tale.

  <img src="doc/img/4a.png" width="500" alt="response select page" />


## Come usare *SPID Demo*

L'applicazione spid-demo viene eseguita all'indirizzo: [https://localhost:8443/demo](https://localhost:8443/demo)

<img src="doc/img/demo_idp_index.png" width="500" alt="demo index page" />
   
   
Gli utenti di test di spid-demo che è possibile utilizzare sono elencati su: [https://localhost:8443/demo/users](https://localhost:8443/demo/users)

<img src="doc/img/demo_idp_users.png" width="500" alt="demo users page" />


### Passi per l'utilizzo

- Copia il metadata di spid-demo presso il metadata store del tuo SP.
  Il metadata di spid-demo può essere scaricato qui: [https://localhost:8443/demo/metadata.xml](https://localhost:8443/demo/metadata.xml)
  ````
  wget https://localhost:8443/demo/metadata.xml -O /path/to/your/sp/metadata/folder/spid-demo-metadata.xml
  ````

- Vai su https://localhost:8443 e registra il metadata del tuo SP tramite l'interfaccia di spid-validator.<br/>
  Dovresti poter accedere tramite una pagina di login come mostrato nella figura seguente
  
  <img src="doc/img/login.png" width="500" alt="login page" />
  
  
- Inserisci come credenziali __validator__/ __validator__

- Clicca su Metadata e scarica i metadata del tuo SP.<br/>
  **Attenzione**: Se il tuo SP non è disponibile mediante un FQDN, usa l'ip dell'host Docker e non "localhost"!
  
  <img src="doc/img/demo_download_metadata_sp.png" width="500" alt="download metadata page" />
  

- Invia una richiesta di autenticazione dal tuo SP all'IdP spid-demo per utilizzare l'ambiente demo

  <img src="doc/img/demo_idp.png" width="500" alt="demo idp" />
