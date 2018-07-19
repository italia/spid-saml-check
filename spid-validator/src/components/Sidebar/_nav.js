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
          name: 'Check',  
          url: '/metadata-sp-check',      
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
