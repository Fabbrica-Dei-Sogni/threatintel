// router/index.ts

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, RouteLocationNormalized } from 'vue-router';
import Home from '../views/home/Home.vue';
import ThreatLogs from '../views/threatlogs/ThreatLogs.vue';
import IpDetails from '../views/ipdetails/IpDetails.vue';
import Login from '../views/auth/login/Login.vue';
import Register from '../views/auth/register/Register.vue';
import ThreatLog from '../views/threatlog/ThreatLog.vue';
import Attacks from '../views/attacks/Attacks.vue';
import AttackDetail from '../views/attackdetail/AttackDetail.vue';
import Settings from '../views/settings/Settings.vue';
import SettingsHub from '../views/settings/SettingsHub.vue';
import ConfigPage from '../views/configpage/ConfigPage.vue';
import CowrieSessions from '../views/cowriesessions/CowrieSessions.vue';
import CowrieAttackDetail from '../views/cowriesessiondetail/CowrieAttackDetail.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/threatlogs',
        name: 'ThreatLogs',
        component: ThreatLogs,
        props: (route: RouteLocationNormalized) => ({
            initialIp: route.query.ip,
            initialUrl: route.query.url,
            initialProtocol: route.query.protocol,
            initialPage: route.query.page ? parseInt(route.query.page as string) : undefined,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        props: (route: RouteLocationNormalized) => ({
            initialAttackProtocol:  route.query.attackProtocol,
            initialLogProtocol:     route.query.logProtocol,
            initialSessionCategory: route.query.sessionCategory,
            initAttackMinLogs:      route.query.attackMinLogs ? parseInt(route.query.attackMinLogs as string) : undefined,
            initAttackTimeVal:      route.query.attackTimeVal ? (route.query.attackTimeVal === 'null' ? null : parseInt(route.query.attackTimeVal as string)) : undefined,
            initAttackTimeUnit:     route.query.attackTimeUnit,
            initAttackPage:         route.query.attackPage ? parseInt(route.query.attackPage as string) : undefined,
            initLogPage:            route.query.logPage ? parseInt(route.query.logPage as string) : undefined,
            initSessionPage:        route.query.sessionPage ? parseInt(route.query.sessionPage as string) : undefined,
        })
    },
    {
        path: '/attacks',
        name: 'Attacks',
        component: Attacks,
        props: (route: RouteLocationNormalized) => ({
            initialIp: route.query.ip,
            initialProtocol: route.query.protocol,
            initialPage: route.query.page ? parseInt(route.query.page as string) : undefined,
            initialMinLogsForAttack: route.query.minLogsForAttack ? parseInt(route.query.minLogsForAttack as string) : undefined,
            initTimeMode: route.query.timeMode,
            initAgoValue: route.query.agoValue ? parseInt(route.query.agoValue as string) : undefined,
            initAgoUnit: route.query.agoUnit,
            initDateRange: route.query.dateRange ? JSON.parse(route.query.dateRange as string) : undefined,
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
    { 
        path: '/dossiers', 
        name: 'Dossiers', 
        component: () => import('../views/dossiers/Dossiers.vue'),
        meta: { requiresAuth: true },
        props: (route: RouteLocationNormalized) => ({
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSearch: route.query.q || '',
            initialStatus: route.query.status || ''
        })
    },
    { 
        path: '/dossiers/:id', 
        name: 'DossierDetail', 
        component: () => import('../views/dossierdetail/DossierDetail.vue'),
        meta: { requiresAuth: true },
        props: true
    },
    {
        path: '/welcome',
        name: 'Welcome',
        component: () => import('../views/auth/welcome/Welcome.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/register',
        name: 'Register',
        component: Register
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsHub
    },
    {
        path: '/settings/profiles',
        name: 'SettingsProfiles',
        component: Settings
    },
    {
        path: '/settings/algorithms',
        name: 'ConfigPage',
        component: ConfigPage
    },
    {
        path: '/telnet-sessions',
        name: 'CowrieSessions',
        component: CowrieSessions,
        props: (route: RouteLocationNormalized) => ({
            initialPage: route.query.page ? parseInt(route.query.page as string) : undefined,
            initialIp: route.query.ip,
            initialCategory: route.query.category
        })
    },
    {
        path: '/telnet-sessions/:id',
        name: 'CowrieAttackDetail',
        component: CowrieAttackDetail,
        props: true
    },
    {
        path: '/campaigns',
        name: 'Campaigns',
        component: () => import('../views/campaigns/campaigns-list/CampaignsList.vue'),
        props: (route: RouteLocationNormalized) => ({
            initialPage: route.query.page ? parseInt(route.query.page as string) : undefined,
            initialMinIps: route.query.minIps ? parseInt(route.query.minIps as string) : undefined,
            initTimeMode: route.query.timeMode,
            initAgoValue: route.query.agoValue ? parseInt(route.query.agoValue as string) : undefined,
            initAgoUnit: route.query.agoUnit,
        })
    },
    {
        path: '/campaign-detail/:hash',
        name: 'CampaignDetail',
        component: () => import('../views/campaigns/campaign-detail/CampaignDetail.vue'),
        props: (route: RouteLocationNormalized) => ({
            hash: route.params.hash,
            minLogsForAttack: route.query.minLogs ? parseInt(route.query.minLogs as string) : 1,
            timeMode: route.query.timeMode || 'ago',
            agoValue: route.query.agoValue ? parseInt(route.query.agoValue as string) : 30,
            agoUnit: route.query.agoUnit || 'days',
            minScore: route.query.minScore ? parseInt(route.query.minScore as string) : 0
        })
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// Guard di navigazione per RBAC e Autenticazione
import { useAuthStore } from '../stores/auth';
import { useSearchStore } from '../stores/searchPersistence';

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    const searchStore = useSearchStore();

    // 1. Persistenza filtri (Search Memory): escludiamo le rotte gestite dai nuovi store dedicati
    const searchRoutes = ['Home'];
    if (to.name && searchRoutes.includes(to.name as string)) {
        const hasQueryParams = Object.keys(to.query).length > 0;
        const savedQuery = searchStore.getQuery(to.name as string);

        // Procediamo al ripristino solo se:
        // - L'URL attuale non ha parametri
        // - Abbiamo dei dati salvati
        // - I dati salvati non sono un oggetto vuoto (per evitare loop infiniti)
        if (!hasQueryParams && savedQuery && Object.keys(savedQuery).length > 0) {
            console.log(`[Router] Ripristino filtri salvati per ${String(to.name)}:`, savedQuery);
            return next({ ...to, query: savedQuery });
        }
    }
    
    // Protezione per ADMIN
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
        console.warn(`[Router] Accesso negato a ${to.path}: richiesto ruolo admin.`);
        return next({ name: 'Home' });
    }

    // Protezione generale autenticazione
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        console.warn(`[Router] Accesso negato a ${to.path}: richiesta autenticazione reale.`);
        return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    next();
});

export default router;
