// router/index.ts

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, RouteLocationNormalized } from 'vue-router';
import Home from '../views/home/Home.vue';
import ThreatLogs from '../views/threatlogs/ThreatLogs.vue';
import IpDetails from '../views/ipdetails/IpDetails.vue';
import Login from '../views/auth/Login.vue';
import Register from '../views/auth/Register.vue';
import ThreatLog from '../views/threatlog/ThreatLog.vue';
import Attacks from '../views/attacks/Attacks.vue';
import AttackDetail from '../views/attackdetail/AttackDetail.vue';
import Settings from '../views/settings/Settings.vue';
import SettingsHub from '../views/settings/SettingsHub.vue';
import ConfigPage from '../views/configpage/ConfigPage.vue';
import CowrieSessions from '../views/cowriesessions/CowrieSessions.vue';
import CowrieAttackDetail from '../views/cowriesessiondetail/CowrieAttackDetail.vue';
import { useRoute } from 'vue-router';

// Le tipizzazioni sulle props passate via router sono opzionali e possono essere affinate man mano che si tipizza la codebase

const routes: RouteRecordRaw[] = [
    {
        path: '/threatlogs',
        name: 'ThreatLogs',
        component: ThreatLogs,
        props: (route: RouteLocationNormalized) => ({
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialUrl: typeof route.query.url === 'string' ? route.query.url : '',
            initialProtocol: typeof route.query.protocol === 'string' ? route.query.protocol : 'http',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        props: (route: RouteLocationNormalized) => ({
            initialAttackProtocol:  typeof route.query.attackProtocol  === 'string' ? route.query.attackProtocol  : 'http',
            initialLogProtocol:     typeof route.query.logProtocol     === 'string' ? route.query.logProtocol     : 'http',
            initialSessionCategory: typeof route.query.sessionCategory === 'string' ? route.query.sessionCategory : 'interaction',
        })
    },/*,    
    {
        path: '/',
        name: 'ThreatLogs',
        component: ThreatLogs,
        props: (route: RouteLocationNormalized) => ({
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialUrl: typeof route.query.url === 'string' ? route.query.url : '',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },*/
    {
        path: '/attacks',
        name: 'Attacks',
        component: Attacks,
        props: (route: RouteLocationNormalized) => ({
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialProtocol: typeof route.query.protocol === 'string' ? route.query.protocol : 'http',
            //initialUrl: typeof route.query.url === 'string' ? route.query.url : '',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialMinLogsForAttack: route.query.minLogsForAttack ? parseInt(route.query.minLogsForAttack as string) : 10,
            initTimeMode: typeof route.query.timeMode === 'string' ? route.query.timeMode : 'ago',
            initAgoValue: route.query.agoValue ? parseInt(route.query.agoValue as string) : 10,
            initAgoUnit: typeof route.query.agoUnit === 'string' ? route.query.agoUnit : 'days',
            initDateRange: (route.query.dateRange as [string | null, string | null]) || [null, null],
            initFromValue: route.query.fromValue ? parseInt(route.query.fromValue as string) : 60,
            initFromUnit: typeof route.query.fromUnit === 'string' ? route.query.fromUnit : 'days',
            initToValue: route.query.toValue ? parseInt(route.query.toValue as string) : 0,
            initToUnit: typeof route.query.toUnit === 'string' ? route.query.toUnit : 'days',
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },
    {
        path: '/attack-detail/:ip',
        name: 'AttackDetail',
        component: AttackDetail,
        props: (route: RouteLocationNormalized) => ({
            ip: route.params.ip,
            minLogsForAttack: route.query.minLogsForAttack ? parseInt(route.query.minLogsForAttack as string) : 10,
            timeMode: route.query.timeMode || 'ago',
            agoValue: route.query.agoValue ? parseInt(route.query.agoValue as string) : 1,
            agoUnit: route.query.agoUnit || 'days',
            dateRange: route.query.dateRange || [null, null],
            initialPageLogs: route.query.pLogs ? parseInt(route.query.pLogs as string) : 1,
            initialPageEvents: route.query.pEvents ? parseInt(route.query.pEvents as string) : 1,
            initialSearchUrl: typeof route.query.qUrl === 'string' ? route.query.qUrl : '',
        }),
    },
    { 
        path: '/ip/:ip', 
        name: 'IpDetails', 
        component: IpDetails, 
        props: (route: RouteLocationNormalized) => ({ 
            ip: route.params.ip,
            initialPageReports: route.query.pReports ? parseInt(route.query.pReports as string) : 1,
            initialPageRateLimit: route.query.pRateLimit ? parseInt(route.query.pRateLimit as string) : 1,
        }) 
    },
    { 
        path: '/threatlog/:id', 
        name: 'ThreatLog', 
        component: ThreatLog, 
        props: (route: RouteLocationNormalized) => ({ 
            id: route.params.id,
            initialTab: typeof route.query.tab === 'string' ? route.query.tab : 'request'
        }) 
    },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: Register },
    { path: '/settings', name: 'SettingsHub', component: SettingsHub, meta: { requiresAdmin: true } },
    { path: '/settings/profiles', name: 'Settings', component: Settings, meta: { requiresAdmin: true } },
    { path: '/settings/algorithms', name: 'Config', component: ConfigPage, meta: { requiresAdmin: true } },
    { path: '/config', redirect: '/settings/algorithms' },
    {
        path: '/telnet-sessions',
        name: 'CowrieSessions',
        component: CowrieSessions,
        props: (route: RouteLocationNormalized) => ({
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialPageSize: route.query.pageSize ? parseInt(route.query.pageSize as string) : 20,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : {},
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialCategory: typeof route.query.category === 'string' ? route.query.category : 'interaction',
        }),
    },
    { 
        path: '/telnet-attack-detail/:id', 
        name: 'CowrieAttackDetail', 
        component: CowrieAttackDetail,
        props: (route: RouteLocationNormalized) => ({ id: route.params.id })
    },
    { 
        path: '/dossiers', 
        name: 'Dossiers', 
        component: () => import('../views/dossiers/Dossiers.vue'),
        meta: { requiresAuth: true },
        props: (route: RouteLocationNormalized) => ({
            initialSearch: typeof route.query.search === 'string' ? route.query.search : '',
            initialStatus: typeof route.query.status === 'string' ? route.query.status : '',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },
    { 
        path: '/dossiers/:id', 
        name: 'DossierDetail', 
        component: () => import('../views/dossiers/DossierDetail.vue'), 
        meta: { requiresAuth: true },
        props: true 
    },
];

const router = createRouter({
    history: createWebHistory('/honeypot/'),
    routes,
});

// Guard di navigazione per RBAC e Autenticazione
import { useAuthStore } from '../stores/auth';

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    
    // Protezione per ADMIN
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
        console.warn(`[Router] Accesso negato a ${to.path}: richiesto ruolo admin.`);
        return next({ name: 'Home' });
    }

    // Protezione per UTENTI AUTENTICATI (No Anonimi)
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        console.warn(`[Router] Accesso negato a ${to.path}: richiesta autenticazione reale.`);
        return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    next();
});

export default router;
