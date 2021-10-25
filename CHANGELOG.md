# Changelog
Tutte le modifiche importanti a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e questo progetto aderisce a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.2] - 2021-10-05
### Changed
- Ottimizzazione del Dockerfile
- Modifica del footer affinchè sia visualizzata la versione dello
spid-validator e spid-sp-test
- Aggiornamento del file README.it.md

### Added
- Makefile per il build dell'immagine docker che facilita l'aggiunta dei metadati
dell'immagine via OCI Metadata label
- API /api/server-info che restituisce informazioni essenziali sul server come
la versione del software dello spid-validator e del tool spid-sp-test
- Aggiunta di utilità per ricavare la versione di spid-sp-test