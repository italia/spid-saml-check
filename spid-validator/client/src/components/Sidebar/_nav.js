export default {
  items: [
    {
      name: 'Metadata',
      icon: 'fa fa-tag',
      open: true,
      sessionRequired: false,
      children: [
        {
          name: 'Download from URL',  
          url: '/metadata/download',   
          sessionRequired: false, 
        },
        {
          name: 'Check XSD',  
          url: '/metadata/check-xsd',  
          sessionRequired: false,
          disabled: true
        },
        {
          name: 'Check Strict',  
          url: '/metadata/check-strict',  
          sessionRequired: false
        },
        {
          name: 'Check Certificates',  
          url: '/metadata/check-certs',     
          sessionRequired: false,
          disabled: true
        },
        {
          name: 'Check Extra',  
          url: '/metadata/check-extra',
          sessionRequired: false 
        }
      ]
    },
    {
      name: 'Pacchetto ZIP',
      icon: 'fa fa-folder',
      open: true,
      sessionRequired: false,
      children: [
        {
          name: 'Upload ZIP',  
          url: '/metadata/upload-zip',   
          sessionRequired: false, 
        }
      ]
    },
    {
      name: 'Request',
      icon: 'fa fa-cursor',
      sessionRequired: true,
      children: [
        {
          name: 'SAML',  
          url: '/request',      
        },
        {
          name: 'Check Strict',  
          url: '/request/check-strict',      
        },
        {
          name: 'Check Certificates',  
          url: '/request/check-certs',    
          disabled: true  
        },
        {
          name: 'Check Extra',  
          url: '/request/check-extra'
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
      icon: 'fa fa-check', 
      sessionRequired: true,
      children: [
        { name: 'Check Response', url: '/response' },
        { name: 'Report', url: '/response/report' },
      ]
    },
    {
      name: 'Logout',
      icon: 'fa fa-sign-out',
      sessionRequired: false,
      url: 'logout'
    }
  ]
};
