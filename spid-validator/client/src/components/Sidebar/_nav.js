export default {
  items: [
    {
      name: 'Metadata SP',
      icon: 'icon-tag',
      open: true,
      sessionRequired: false,
      children: [
        {
          name: 'Download',  
          url: '/metadata-sp-download',   
          sessionRequired: false   
        },
        {
          name: 'Check Strict',  
          url: '/metadata-sp-check-strict',  
          sessionRequired: true     
        },
        {
          name: 'Check Certificates',  
          url: '/metadata-sp-check-certs',     
          sessionRequired: true  
        },
        {
          name: 'Check Extra',  
          url: '/metadata-sp-check-extra',
          sessionRequired: true 
        }
      ]
    },
    {
      name: 'Request',
      icon: 'icon-cursor',
      sessionRequired: true,
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
      sessionRequired: true,
      children: [
        { name: 'Check Response', url: '/response' },
        { name: 'Report', url: '/response-report' },
      ]
    },
  ]
};
