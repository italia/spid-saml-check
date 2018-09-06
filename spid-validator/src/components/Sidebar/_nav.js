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
        { name: 'Check Response', url: '/response/test-suite-1/1' },
      ]
    },
  ]
};
