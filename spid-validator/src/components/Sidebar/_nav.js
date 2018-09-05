export default {
  items: [
    {
      name: 'Metadata SP',
      icon: 'icon-tag',
      children: [
        {
          name: 'Download',  
          url: '/metadata-sp-download',      
        },
        {
          name: 'Check Strict',  
          url: '/metadata-sp-check-strict',      
        },
        {
          name: 'Check Certificates',  
          url: '/metadata-sp-check-certs',      
        },
        {
          name: 'Check Extra',  
          url: '/metadata-sp-check-extra'     
        }
      ]
    },
    {
      name: 'Request',
      icon: 'icon-cursor',
      children: [
        {
          name: 'SAML',  
          url: '/request',      
        },
        {
          name: 'Check Strict',  
          url: '/request-check-strict',      
        },
        {
          name: 'Check Certificates',  
          url: '/request-check-certs',      
        },
        {
          name: 'Check Extra',  
          url: '/request-check-extra'     
        }
      ]
      /*
      badge: {
        variant: 'info',
        text: 'NEW'
      }
      */
    },
    {
      name: 'Response',
      icon: 'icon-check', 
      children: [
        { name: '1.   Corretta', url: '/response/test-suite-1/1' },
        { name: '2.   Response non firmata', url: '/response/test-suite-1/2' },
        { name: '3.   Assertion non firmata', url: '/response/test-suite-1/3' },
        { name: '4.   Firma diversa', url: '/response/test-suite-1/4' },
        { name: '6a.  ID non specificato', url: '/response/test-suite-1/6a' },
        { name: '6b.  ID mancante', url: '/response/test-suite-1/6b' },
        { name: '7.   Version diverso da 2.0', url: '/response/test-suite-1/7' },
        { name: '8a.  IssueInstant non specificato', url: '/response/test-suite-1/8a' },
        { name: '8b.  IssueInstant mancante', url: '/response/test-suite-1/8b' },
        { name: '9.   Formato IssueInstant non corretto', url: '/response/test-suite-1/9' },
        { name: '10.  IssueInstant precedente Request', url: '/response/test-suite-1/10' },
        { name: '11.  IssueInstant successivo Request', url: '/response/test-suite-1/11' },
        { name: '12a. InResponseTo non specificato', url: '/response/test-suite-1/12a' },
        { name: '12b. InResponseTo mancante', url: '/response/test-suite-1/12b' },
        { name: '13.  InResponseTo diverso da Request', url: '/response/test-suite-1/13' },
        { name: '14a. Destination non specificato', url: '/response/test-suite-1/14a' },
        { name: '14b. Destination mancante', url: '/response/test-suite-1/14b' },
        { name: '15.  Destination diverso', url: '/response/test-suite-1/15' },
        { name: '16a. Elemento Status non specificato', url: '/response/test-suite-1/16a' },
        { name: '16b. Elemento Status mancante', url: '/response/test-suite-1/16b' },
        { name: '17a. Elemento StatusCode non specificato', url: '/response/test-suite-1/17a' },
        { name: '17b. Elemento StatusCode mancante', url: '/response/test-suite-1/17b' },
        { name: '18.  Elemento StatusCode diverso da success', url: '/response/test-suite-1/18' },
        { name: '19a. Elemento Issuer non specificato', url: '/response/test-suite-1/19a' },
        { name: '19b. Elemento Issuer mancante', url: '/response/test-suite-1/19b' },
      ]
    },
  ]
};
