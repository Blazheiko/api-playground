import { createRouter, createWebHistory } from 'vue-router'
import ApiHomeView from '../views/ApiHomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ApiHomeView,
    },
    {
      path: '/route/:groupIndex/:routeIndex',
      name: 'route-detail',
      component: () => import('../views/RouteDetailView.vue'),
    },
  ],
})

export default router
