
export default [
  {
    path: '/dashboard',
    name: 'dashboard',
    props: (route) => ({ host: route.query.host, port: route.query.port }),
    component: () => import('pages/dashboard')
  },

  {
    path: '/setup',
    name: 'setup',
    component: () => import('pages/setupConnection')
  },

  {
    path: '/',
    redirect: '/setup'
  },

  {
    path: '*',
    component: () => import('pages/404')
  }
]
