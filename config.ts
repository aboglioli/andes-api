// !!!!!!!! ATENCIÓN !!!!!!!!
// Todas los datos privados (credenciales, IPs, ...) deben quedar en el archivo config.private.ts
// !!!!!!!!!!!!!!!!!!!!!!!!!!

import { Auth } from './auth/auth.class';

const appMiddleware = [
    Auth.authenticate(),
    // Auth.deniedPatients()
];

const mobileMiddleware = [
    Auth.authenticate()
];

// Habilita/deshabilita módulos de la API
export const modules = {
    auth: {
        active: true,
        path: './auth/routes',
        route: '/auth'
    },
    tm: {
        active: true,
        path: './core/tm/routes',
        route: '/core/tm',
        middleware: null,
    },
    term: {
        active: true,
        path: './core/term/routes',
        route: '/core/term',
        middleware: null,
    },
    log: {
        active: true,
        path: './core/log/routes',
        route: '/core/log',
        middleware: appMiddleware
    },
    status: {
        active: true,
        path: './core/status/routes',
        route: '/core/status',
        middleware: null, // Son APIs públicas
    },
    mpi: {
        active: true,
        path: './core/mpi/routes',
        route: '/core/mpi',
        middleware: appMiddleware
    },
    auditoria: {
        active: true,
        path: './core/mpi/routes/auditoria',
        route: '/core/mpi/auditoria',
        middleware: appMiddleware
    },
    turnos: {
        active: true,
        path: './modules/turnos/routes',
        route: '/modules/turnos',
        middleware: appMiddleware
    },
    llaves: {
        active: true,
        path: './modules/llaves/routes',
        route: '/modules/llaves',
        middleware: appMiddleware
    },
    rup: {
        active: true,
        path: './modules/rup/routes',
        route: '/modules/rup',
        middleware: appMiddleware
    },
    auditorias: { // Auditorías RUP (prestacionPaciente)
        active: true,
        path: './modules/auditorias/routes',
        route: '/modules/auditorias',
        middleware: appMiddleware
    },
    turnos_mobile_auth: {
        active: true,
        path: './modules/mobileApp/auth_routes',
        route: '/modules/mobileApp'
    },
    turnos_mobile: {
        active: true,
        path: './modules/mobileApp/routes',
        route: '/modules/mobileApp',
        middleware: mobileMiddleware
    },
    fuentesAutenticas: {
        active: true,
        path: './modules/fuentesAutenticas/routes',
        route: '/modules/fuentesAutenticas',
        middleware: appMiddleware
    },
    usuarios: {
        active: true,
        path: './modules/usuarios/routes',
        route: '/modules/usuarios',
        middleware: appMiddleware
    }
};

// Cotas de consumo de APIs
export const defaultLimit = 50;
export const maxLimit = 1000;

// Configuracion MPI
export const mpi = {
    cotaMatchMin: 0.80,
    cotaMatchMax: 0.94,
    weightsDefault: {
        identity: 0.55,
        name: 0.10,
        gender: 0.3,
        birthDate: 0.05
    },
    weightsMin: {
        identity: 0.4,
        name: 0.6,
        gender: 0,
        birthDate: 0
    },
    weightsScan: {
        identity: 0.55,
        name: 0.10,
        gender: 0.3,
        birthDate: 0.05
    }
};
