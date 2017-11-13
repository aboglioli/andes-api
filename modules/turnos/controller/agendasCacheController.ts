// Se definen las operaciones de agendas y SIPS
import * as operationsCache from './operationsCacheController';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

export async function integracionSips() {
    pool = await sql.connect(connection);
    try {

        let t = 0;
        let promesaAgendaExportada: any[] = [];
        let promesaAgendaPendiente: any[] = [];

        console.log("Despues de conexion ", promesaAgendaExportada)
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        console.log("Agendas Exportadas: ", agendasMongoExportadas.length)

        agendasMongoExportadas.forEach(async (agenda) => {
            promesaAgendaExportada.push(await operationsCache.checkCodificacion(agenda));

        });

        Promise.all(promesaAgendaExportada).then(async function () {
            console.log("Despues de Agenda Exportadas")
            let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();

            // if (agendasMongoPendientes.length > 0) {
            agendasMongoPendientes.forEach(async (agenda) => {
                promesaAgendaPendiente.push(await operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool));

            });

            Promise.all(promesaAgendaPendiente).then(function () {
                console.log("Despues de Agenda Pendientes: ")

                if (promesaAgendaPendiente.length === agendasMongoPendientes.length)
                    pool.close();
            });
            // await operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool);
            // } else {
            //     pool.close();
            // }
        }).catch(function () {
            console.log("Entral primer CATCH")
            pool.close();

        });


    } catch (ex) {
        console.log("EntrO AL catch")
        pool.close();
    }
}
