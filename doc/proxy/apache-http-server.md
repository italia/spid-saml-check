## How to setup apache httpd as proxy

On the apache 2 server enable:
`ssl` module
`headers` module
`proxy` module
`proxy_http` module
`proxy_balancer` module

Create a new VirtualHost or edit the existing one to match those configurations:
```
<VirtualHost *:80>
    ###### Edit this line with your domain
    ServerName spid.proxy.local

    RewriteEngine on

    ###### Edit this line with your domain
    RewriteCond %{SERVER_NAME} =spid.proxy.local
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>

<VirtualHost *:443>
    ###### Edit this line with your domain
    ServerName spid.proxy.local

    Header always set Content-Security-Policy "upgrade-insecure-requests;"

    SSLProxyEngine on
    SSLProxyCheckPeerCN off
    SSLProxyCheckPeerName off
    SSLProxyCheckPeerExpire off

    ProxyPreserveHost On
    ProxyPass / https://127.0.0.1:8443/
    ProxyPassReverse / https://127.0.0.1:8443/

    ###### Edit those lines with SSL certificate of the domain
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.key

</VirtualHost>
```