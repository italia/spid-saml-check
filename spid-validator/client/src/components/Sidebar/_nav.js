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
          name: 'Check XSD',  
          url: '/metadata-sp-check-xsd',  
          sessionRequired: false     
        },
        {
          name: 'Check Strict',  
          url: '/metadata-sp-check-strict',  
          sessionRequired: false     
        },
        {
          name: 'Check Certificates',  
          url: '/metadata-sp-check-certs',     
          sessionRequired: false  
        },
        {
          name: 'Check Extra',  
          url: '/metadata-sp-check-extra',
          sessionRequired: false 
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
    {
      name: 'Logout',
      icon: 'icon-logout',
      sessionRequired: false,
      url: 'logout'
    }
  ]
};
