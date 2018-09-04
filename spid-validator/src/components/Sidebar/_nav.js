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
        { name: '1. Corretta', url: '/response/test-suite-1/1' },
        { name: '2. Non firmata', url: '/response/test-suite-1/2' },
        { name: '3. Non firmata', url: '/response/test-suite-1/3' },
        { name: '4. Firma diversa', url: '/response/test-suite-1/4' },
        { name: '6a. ID non specificato', url: '/response/test-suite-1/6a' },
        { name: '6b. ID mancante', url: '/response/test-suite-1/6b' },
        { name: '7. Version <> 2.0', url: '/response/test-suite-1/7' },
      ]
    },
  ]
};
