// Configuración de Passport
export const auth = {
    useLdap: false, // En nuestro caso está en true porque interoperamos con un ldap provincial
    jwtKey: 'xxx',
    ldapOU: 'ou=xxx,o=xxxx,o=neuquen',
};

// Hosts
export const ports = {
    ldapPort: ':389'
};

// Hosts
export const hosts = {
    ldap: 'ldap.neuquen.gov.ar',
    elastic_main: 'localhost:9200',
    mongoDB_main: {
        host: '127.0.0.1:27017/andes', // Instancia gral de la base
        auth: undefined,
        server: undefined
    },
    mongoDB_mpi: {
        host: '127.0.0.1:27028/andes', // Instancia del CORE de pacientes validados - Repositorio Central -
        auth: undefined,
        server: undefined
    },
    mongoDB_snomed: {
        host: '127.0.0.1:27017/snomed',  //Instancia local de snomed
        auth: undefined,
        server: undefined
    }
};

// Constante de snomed para conexión
export const snomed = {
    dbName: 'snomed',
    dbVersion: 'v20160131tx'  // Esta es la colección que estamos usando
};

// Mongoose config
export let mongooseDebugMode = false;

// Swagger config
export let enableSwagger = false;

// email App Mobile
export const enviarMail = {
   host: 'xxx.hospitalneuquen.org.ar',
   port: 25,
   options: {
       from: '"Salud :hospital:" <xxx@dominiohospital.org.ar>',
   }
};

// Configuración de la app Mobile
export const pushNotificationsSettings = {
    gcm: {
        id: 'unstring',
        phonegap: true
    },
    apn: {
        token: {
            key: './certs/key.p8', // optionally: fs.readFileSync('./certs/key.p8')
            keyId: 'ABCD',
            teamId: 'EFGH',
        },
    }
};


// Auth App Mobile
export const authApp = {
    secret: 'xxxx'
};

// Configuración de Google Geocoding
export const geoKey = 'unaClaveGeoKey';


// Usuarios y claves fuentes auténticas

export const anses = {
    username: 'usuarioAnses',
    password: 'unaClaveAnses'
};


// Configuración SISA
export const sisa = {
    username: 'usuarioSisa',
    password: 'passwordSisa'
};

