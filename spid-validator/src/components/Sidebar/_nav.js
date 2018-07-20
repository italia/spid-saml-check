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
      url: '/request',
      icon: 'icon-cursor',
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
        {
          name: 'Test 1',  
          url: '/response/0',      
        }
      ]
    },
  ]
};
