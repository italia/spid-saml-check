export default {
  items: [
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
