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
import ConfigPage from '../views/configpage/ConfigPage.vue';

// Le tipizzazioni sulle props passate via router sono opzionali e possono essere affinate man mano che si tipizza la codebase

const routes: RouteRecordRaw[] = [
    {
        path: '/threatlogs',
        name: 'ThreatLogs',
        component: ThreatLogs,
        props: (route: RouteLocationNormalized) => ({
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialUrl: typeof route.query.url === 'string' ? route.query.url : '',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
        }),
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        props: (route: RouteLocationNormalized) => ({
            initialIp: typeof route.query.ip === 'string' ? route.query.ip : '',
            initialUrl: typeof route.query.url === 'string' ? route.query.url : '',
            initialPage: route.query.page ? parseInt(route.query.page as string) : 1,
            initialSortFields: route.query.sortFields ? JSON.parse(route.query.sortFields as string) : undefined,
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
        path: '/attack-detail',
        name: 'AttackDetail',
        component: AttackDetail,
        props: (route: RouteLocationNormalized) => ({
            attack: route.query.attack
                ? JSON.parse(decodeURIComponent(route.query.attack as string))
                : null,
        }),
    },
    { path: '/ip/:ip', name: 'IpDetails', component: IpDetails, props: true },
    { path: '/threatlog/:id', name: 'ThreatLog', component: ThreatLog, props: true },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: Register },
    { path: '/config', name: 'Config', component: ConfigPage },
    { path: '/settings', name: 'Settings', component: Settings },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
