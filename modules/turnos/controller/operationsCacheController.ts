// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../schemas/agenda';
import * as turnoCtrl from './turnoCacheController';


// Sección de operaciones sobre MONGODB
/**
 * Obtiene las agendas con estado exportadaSips o Codificada
 *
 * @export
 * @returns
 */
export function getAgendasDeMongoExportadas() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            $or: [{
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }, {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.codificada
            }]
        }).exec(function (err, data) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}
/**
 * Obtiene las agendas de mongo que estan pendientes de procesar
 *
 * @export
 * @returns
 */
export async function getAgendasDeMongoPendientes() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente
        }).exec(async function (err, data: any) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}
/**
 * @description Verifica la existencia de un turno en SIPS, actualiza la codificación del turno y marca la agenda como procesada.
 * @returns Devuelve una Promesa
 * @param agenda
 */
export function checkCodificacion(agenda) {
    return new Promise(async function (resolve, reject) {
        let turno;
        let datosTurno = {};
        let idEspecialidad: any;
        for (let x = 0; x < agenda.bloques.length; x++) {
            turno = agenda.bloques[x].turnos;
            for (let z = 0; z < turno.length; z++) {
                let idTurno = await existeTurnoSips(turno[z]);
                let cloneTurno: any = [];
                if (idTurno) {
                    let idConsulta = await existeConsultaTurno(idTurno);
                    let turnoPaciente: any = await getPacienteAgenda(agenda, turno[z]._id);
                    idEspecialidad = await getEspecialidadSips(agenda.tipoPrestaciones[0].term);
                    turno[z] = turnoPaciente;
                    if (idConsulta) {
                        if (idEspecialidad === constantes.Especialidades.odontologia) {
                            turno[z] = await codificaOdontologia(idConsulta, turno[z]);
                        } else {
                            turno[z] = await codificacionCie10(idConsulta, turno[z]);
                        }
                    }
                    datosTurno = {
                        idAgenda: agenda.id,
                        idTurno: turno[z]._id,
                        idBloque: agenda.bloques[x]._id,
                        idUsuario: constantes.idUsuarioSips,
                        turno: turno[z]
                    };
                    await turnoCtrl.updateTurno(datosTurno);
                    await markAgendaAsProcessed(agenda);
                }
            }
        }
        resolve();
    });
}
async function codificaOdontologia(idConsulta: any, turno: any) {
    return new Promise(async function (resolve, reject) {
        let idNomenclador: any = [];
        let codificacionOdonto: any = {};
        idNomenclador = await getConsultaOdontologia(idConsulta);
        let m = 0;
        for (let i = 0; i < idNomenclador.length; i++) {
            codificacionOdonto = await getCodificacionOdonto(idNomenclador[i].idNomenclador);
            if (i === 0) {
                turno.asistencia = 'asistio';
                turno.diagnosticoPrincipal = {
                    ilegible: false,
                    codificacion: {
                        codigo: codificacionOdonto.codigo,
                        nombre: codificacionOdonto.descripcion,
                        sinonimo: codificacionOdonto.descripcion,
                    }
                };
            } else {
                turno.asistencia = 'asistio';
                turno.diagnosticoSecundario[m] = {
                    ilegible: false,
                    codificacion: {
                        codigo: codificacionOdonto.codigo,
                        nombre: codificacionOdonto.descripcion,
                        sinonimo: codificacionOdonto.descripcion,
                    }
                };
                m++;
            }
        }
        resolve(turno);
    });
}
async function codificacionCie10(idConsulta: any, turno: any) {
    return new Promise(async function (resolve, reject) {

        let codCie10: any = [];
        let codificaCie10: any = {};
        codCie10 = await getConsultaDiagnostico(idConsulta);
        let m = 0;
        for (let i = 0; i < codCie10.length; i++) {
            codificaCie10 = await getCodificacionCie10(codCie10[i].CODCIE10);
            if (i === 0) {
                turno.asistencia = 'asistio';
                turno.diagnosticoPrincipal = {
                    ilegible: false,
                    codificacion: {
                        causa: codificaCie10.CAUSA,
                        subcausa: codificaCie10.SUBCAUSA,
                        codigo: codificaCie10.CODIGO,
                        nombre: codificaCie10.Nombre,
                        sinonimo: codificaCie10.Sinonimo,
                        c2: codificaCie10.C2
                    }
                };
            } else {
                turno.asistencia = 'asistio';
                turno.diagnosticoSecundario[m] = {
                    ilegible: false,
                    codificacion: {
                        causa: codificaCie10.CAUSA,
                        subcausa: codificaCie10.SUBCAUSA,
                        codigo: codificaCie10.CODIGO,
                        nombre: codificaCie10.Nombre,
                        sinonimo: codificaCie10.Sinonimo,
                        c2: codificaCie10.C2
                    }
                };
                m++;
            }
        }
        resolve(turno);
    });
}


// Fin de sección de operaciones sobre mongoDB

// Sección de operaciones sobre SIPS

/**
 * @description obtiene ID de O.Social buscando coincidencias 'DNI/Cod O.S' en la tabla de PUCO
 * pudiendo devolver 0..n códigos de obra social. Según los códigos obtenidos, se retornará un único id
 * según siguiente criterio:
 *     - Si se obtiene +2 resultados, se optará por el de máxima prioridad, siendo que:
 *     - ISSN: Mínima prioridad
 *     - PAMI: Prioridad media
 *     - Cualquier otro financiador: Prioridad máxima
 *     - Si obtiene 1 resultado, es el elegido
 *     - Si se obtiene 0 resultados, se retorna el id de PLAN SUMAR por defecto, cuyo valor está en constante.
 * @param {any} documentoPaciente
 * @returns
 */
async function getIdObraSocialSips(documentoPaciente) {
    let transaction;
    const idSumar = 499;
    let query = 'SELECT TOP(1) sips_os.idObraSocial as idOS ' +
        'FROM [Padron].[dbo].[Pd_PUCO] puco ' +
        'JOIN [SIPS].[dbo].[Sys_ObraSocial] sips_os ON puco.CodigoOS = sips_os.cod_PUCO ' +
        'WHERE puco.DNI =  ' + documentoPaciente +
        'ORDER BY  ( ' +
        'SELECT p =  ' +
        'CASE prio.prioridad  ' +
        'WHEN NULL THEN 1 ' +
        'ELSE prio.prioridad ' +
        'END ' +
        'FROM [SIPS].[dbo].[Sys_ObraSocial_Prioridad] as prio ' +
        'WHERE prio.idObraSocial = sips_os.idObraSocial ' +
        ') ASC';

    try {
        let result = await new sql.Request(transaction).query(query);
        return (result.length > 0 ? result[0].idOS : idSumar);
    } catch (err) {
        return false;
    }
}

function crearConsultorioTipoSips(agenda, idEfector, transaccion) {
    let nombre = {
        nombre: 'Sin Espacio Físico',
        _id: 'andesCitas2017'
    };
    agenda.espacioFisico = nombre;

    return new Promise(async (resolve: any, reject: any) => {
        let query = 'INSERT INTO dbo.CON_ConsultorioTipo ' +
            ' ( idEfector, nombre, objectId ) VALUES  ( ' +
            idEfector + ',' +
            '\'' + agenda.espacioFisico.nombre + '\',' +
            '\'' + agenda.espacioFisico._id + '\' )';

        executeQuery(query, transaccion).then(function (data) {
            // return resolve(data);
            resolve(data);
        });
    });
}

function existeConsultorio(agenda, idEfector) {
    let idConsultorio;
    let espacioFisicoObjectId = null;
    if (agenda.espacioFisico) {
        espacioFisicoObjectId = agenda.espacioFisico._id;
    } else {
        /*La agenda viene sin espacio físico, así que se lo agrego para poder verlo en SIPS*/
        espacioFisicoObjectId = 'andesCitas2017';
    }
    return new Promise((resolve: any, reject: any) => {
        let transaction;
        (async function () {
            try {
                let query = 'SELECT top 1 idConsultorio FROM dbo.CON_Consultorio WHERE objectId = @objectId';
                let result = await new sql.Request(transaction)
                    .input('objectId', sql.VarChar(50), espacioFisicoObjectId)
                    .query(query);

                if (typeof result[0] !== 'undefined') {
                    idConsultorio = result[0].idConsultorio;
                    resolve(idConsultorio);
                } else {
                    idConsultorio = await creaConsultorioSips(agenda, idEfector, transaction);
                    resolve(idConsultorio);
                }

            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function creaConsultorioSips(agenda: any, idEfector: any, transaccion: any) {
    let nombre = {
        nombre: 'Sin Espacio Físico',
        _id: 'andesCitas2017'
    };
    agenda.espacioFisico = nombre;

    return new Promise(async (resolve: any, reject: any) => {
        let idConsultorioTipo = await crearConsultorioTipoSips(agenda, idEfector, transaccion);

        let query = ' INSERT INTO dbo.CON_Consultorio ' +
            ' ( idEfector , idTipoConsultorio ,  nombre , Activo, objectId ) VALUES ( ' +
            idEfector + ',' +
            idConsultorioTipo + ',' +
            '\'' + agenda.espacioFisico.nombre + '\', ' +
            ' 1 ,' +
            '\'' + agenda.espacioFisico._id + '\' )';

        executeQuery(query, transaccion).then(function (data) {
            return resolve(data);
        });
    });
}

function getCodificacionCie10(codcie10) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('codcie10', sql.Int, codcie10)
            .query('SELECT * FROM dbo.Sys_CIE10 WHERE id = @codcie10')
            .then(result => {
                resolve(result[0]);
            }).catch(err => {
                reject(err);
            });
    });
}
async function markAgendaAsProcessed(agenda) {
    let estadoIntegracion;
    switch (agenda.estadoIntegracion) {
        case 'pendiente':
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportadaSIPS;
            break;
        case 'exportada a Sips':
        default:
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
    }
    return agendasCache.update({
        _id: agenda._id
    }, {
            $set: {
                estadoIntegracion: estadoIntegracion
            }
        }).exec();
}

function getConsultaDiagnostico(idConsulta) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT CODCIE10 FROM dbo.CON_ConsultaDiagnostico WHERE idConsulta = @idConsulta')
            .then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
    });
}

function getConsultaOdontologia(idConsulta) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT idNomenclador FROM dbo.CON_ConsultaOdontologia WHERE idConsulta = @idConsulta')
            .then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
    });
}

function getCodificacionOdonto(idNomenclador) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idNomenclador', sql.Int, idNomenclador)
            .query('SELECT codigo, descripcion FROM dbo.ODO_Nomenclador WHERE idNomenclador = @idNomenclador')
            .then(result => {
                resolve(result[0]);
            }).catch(err => {
                reject(err);
            });
    });
}
/**
 * Guarda la agenda en SIPS
 * @param agendasMongo
 * @param index
 * @param pool
 */
export async function guardarCacheASips(agendasMongo, index, pool) {
    let agenda = agendasMongo[index];
    let transaccion = await new sql.Transaction(pool);
    console.log("Entra a Guardar Cache SIPS")
    await transaccion.begin(async err => {
        console.log("Entra a Transaction")
        let rolledBack = false;
        transaccion.on('rollback', aborted => {
            rolledBack = true;
        });
        try {

            await trans(agenda, transaccion, pool)
        } catch (ee) {
            console.log("Entra al catch de Guardar Cache SIps: ", ee)
            logger.LoggerAgendaCache.logAgenda(agenda._id, ee);
            transaccion.rollback();
            pool.close();
            //next(pool);
        }
    });

    function next(unPool) {
        ++index;
        if (index < agendasMongo.length) {
            guardarCacheASips(agendasMongo, index, unPool);
        }
    }
}

function trans(agenda: any, transaccion: any, pool: any) {
    return new Promise(async (resolve: any, reject: any) => {

        console.log("Entra al try de transaccion")
        // CON_Agenda de SIPS soporta solo un profesional NOT NULL.
        // En caso de ser nulo el paciente en agenda de ANDES, por defector
        // graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
        let dniProfesional = agenda.profesionales[0] ? agenda.profesionales[0].documento : '0';
        let codigoSisa = agenda.organizacion.codigo.sisa;
        let datosSips = {
            idEfector: '',
            idProfesional: ''
        };
        console.log("ANtes de Guardar Datos SIPS ")
        let datosArr = await getDatosSips(codigoSisa, dniProfesional, transaccion);
        console.log("Despues de Get Datos Sips ")
        datosSips.idEfector = datosArr[0][0].idEfector;
        datosSips.idProfesional = datosArr[1][0].idProfesional;
        let idAgenda = await processAgenda(agenda, datosSips, pool, transaccion);
        console.log("Antes de Process Turnos")
        await processTurnos(agenda, idAgenda, datosSips.idEfector, transaccion);
        console.log("Antes de Estado Agenda")
        await checkEstadoAgenda(agenda, idAgenda, transaccion);
        console.log("Antes de Estado Turno")
        await checkEstadoTurno(agenda, idAgenda, transaccion);
        console.log("Antes de Check Asistencia")
        await checkAsistenciaTurno(agenda, transaccion);

        transaccion.commit(async err2 => {
            await markAgendaAsProcessed(agenda);
            pool.close();
            // next(pool);
        });
    });
}

async function checkEstadoAgenda(agendaMongo: any, idAgendaSips: any, transaccion: any) {
    console.log("Id Agenda: ", idAgendaSips)

    let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id, transaccion);
    console.log("Estado Agenda SIps: ", estadoAgendaSips);
    let estadoAgendaMongo = await getEstadoAgendaSips(agendaMongo.estado);
    console.log("Estado Agenda Mongo: ", estadoAgendaMongo)

    return new Promise(async (resolve: any, reject: any) => {
        if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {
            let query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
            await executeQuery(query, transaccion);
            resolve();
        } else {
            resolve();
        }
    });
}

function getEstadoAgenda(idAgenda: any, transaction: any) {
    return new Promise((resolve: any, reject: any) => {
        // let transaction;
        (async function () {
            try {
                let query = 'SELECT idAgendaEstado as idEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';

                let result = await new sql.Request(transaction)
                    .input('idAgenda', sql.VarChar(50), idAgenda)
                    .query(query);

                resolve(result[0].idEstado);
            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function checkAsistenciaTurno(agenda: any, transaccion: any) {
    let turnos;

    return new Promise(async function (resolve: any, reject: any) {
        for (let x = 0; x < agenda.bloques.length; x++) {
            turnos = agenda.bloques[x].turnos;

            for (let i = 0; i < turnos.length; i++) {
                if (turnos[i].asistencia === 'asistio') {

                    let idTurno: any = await getEstadoTurnoSips(turnos[i]._id);
                    let fechaAsistencia = moment(turnos[i].updatedAt).format('YYYYMMDD');
                    let query = 'INSERT INTO dbo.CON_TurnoAsistencia ( idTurno , idUsuario , fechaAsistencia ) VALUES  ( ' +
                        idTurno.idTurno + ' , ' + constantes.idUsuarioSips + ' , \'' + fechaAsistencia + '\' )';

                    await executeQuery(query, transaccion);
                    resolve();
                } else {
                    resolve();
                }
            }
        }
    })

}

async function checkEstadoTurno(agenda: any, idAgendaSips, transaccion) {
    let turnos;

    return new Promise(async function (resolve: any, reject: any) {
        for (let x = 0; x < agenda.bloques.length; x++) {
            turnos = agenda.bloques[x].turnos;

            for (let i = 0; i < turnos.length; i++) {
                if ((turnos[i].estado !== 'disponible') || (turnos[i].updatedAt)) {
                    await actualizarEstadoTurnoSips(idAgendaSips, turnos[i], transaccion);
                    resolve();
                } else {
                    resolve();
                }
            }
        }
    });
}

async function processTurnos(agendas: any, idAgendaCreada: any, idEfector: any, transaccion: any) {
    let turnos;

    for (let x = 0; x < agendas.bloques.length; x++) {
        turnos = agendas.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {

            if (turnos[i].estado === 'asignado') {
                let idTurno = await existeTurnoSips(turnos[i]);

                if (!idTurno) {
                    await grabaTurnoSips(turnos[i], idAgendaCreada, idEfector, transaccion);
                }
            }
        }
    }
}
async function grabaTurnoSips(turno, idAgendaSips, idEfector, transaccion) {
    // TODO: El paciente pudiera no estar validado, en ese caso no se encontrara en la
    // colección de paciente de MPI, en ese caso buscar en la coleccion de pacientes de Andes
    let pacienteEncontrado = await pacientes.buscarPaciente(turno.paciente.id);
    let paciente = pacienteEncontrado.paciente;
    // if(!pacienteEncontrado) {
    //  pacienteEncontrado = buscar en andes.......
    // }

    let idObraSocial = await getIdObraSocialSips(paciente.documento);
    let pacienteId = await getPacienteMPI(paciente, idEfector, transaccion);

    let fechaTurno = moment(turno.horaInicio).format('YYYYMMDD');
    let horaTurno = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

    let query = 'INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( ' +
        idAgendaSips + ' , 1 , ' + constantes.idUsuarioSips + ' ,' + pacienteId + ', \'' + fechaTurno + '\' ,\'' + horaTurno + '\' , 0 , 0 ,' + idObraSocial + ' , 0, \'' + turno._id + '\')';

    let turnoGrabado = await executeQuery(query, transaccion);
}

export function existeTurnoSips(turno: any) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idTurnoMongo', sql.VarChar(50), turno._id)
            .query('SELECT idTurno FROM dbo.CON_Turno WHERE objectId = @idTurnoMongo GROUP BY idTurno')
            .then(result => {
                if (result.length > 0) {
                    resolve(result[0].idTurno);
                } else {
                    resolve(false);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

function existeConsultaTurno(idTurno) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idTurno', sql.Int, idTurno)
            .query('SELECT idConsulta FROM dbo.CON_Consulta WHERE idTurno = @idTurno')
            .then(result => {
                if (result.length > 0) {
                    resolve(result[0].idConsulta);
                } else {
                    resolve(false);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

// Set de funciones locales no publicas

function getDatosSips(codigoSisa?, dniProfesional?, transaction?) {
    return new Promise((resolve: any, reject: any) => {
        console.log("Entra a Get Datos: ");
        // let transaction;
        (async function () {
            try {
                let result: any[] = [];

                result[0] = await new sql.Request(transaction)
                    .input('codigoSisa', sql.VarChar(50), codigoSisa)
                    .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

                result[1] = await new sql.Request(transaction)
                    .input('dniProfesional', sql.Int, dniProfesional)
                    .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');
                console.log("Resultttt: ", result[0])
                resolve(result);
            } catch (err) {
                console.log("Rejectedddddd: ", err)
                reject(err);
            }
        })();
    });
}

async function processAgenda(agenda: any, datosSips, pool, transaccion) {
    let idAgenda = await existeAgendaSips(agenda);

    if (!idAgenda) {
        idAgenda = await grabaAgendaSips(agenda, datosSips, pool, transaccion);
    }

    return idAgenda;
}


/**
 * Verifica si existe la agenda pasada por parámetro en SIPS
 *
 * @param {*} agendaMongo
 * @returns una promesa con el idAgenda o falso en caso contrario
 */
function existeAgendaSips(agendaMongo: any) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idAgendaMongo', sql.VarChar(50), agendaMongo.id)
            .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda')
            .then(result => {
                if (result.length > 0) {
                    resolve(result[0].idAgenda);
                } else {
                    resolve(false);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

async function grabaAgendaSips(agendaSips: any, datosSips: any, pool, transaccion) {
    let objectId = agendaSips.id;

    let estado = await getEstadoAgendaSips(agendaSips.estado);
    console.log("Estaddoooooo En graba Agenda: ", estado)
    let fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    let horaInicio = moment(agendaSips.horaInicio).utcOffset('-03:00').format('HH:mm');
    let horaFin = moment(agendaSips.horaFin).utcOffset('-03:00').format('HH:mm');
    let duracionTurno = agendaSips.bloques[0].duracionTurno;

    let maximoSobreTurnos = 0;
    let porcentajeTurnosDia = 0;
    let porcentajeTurnosAnticipados = 0;
    let citarPorBloques = 0;
    let cantidadInterconsulta = 0;
    let turnosDisponibles = 1;
    let idMotivoInactivacion = 0;


    let multiprofesional = 0;
    let dniProfesional = agendaSips.profesionales[0].documento;

    let listaIdProfesionales = [];
    listaIdProfesionales = await getProfesional(agendaSips.profesionales, pool);

    if (agendaSips.profesionales.length > 1) {
        multiprofesional = 1;
    } else {
        multiprofesional = 0;
    }

    return new Promise(async (resolve: any, reject: any) => {
        let idEfector = datosSips.idEfector;
        let idProfesional = datosSips.idProfesional;
        let idEspecialidad = await getEspecialidadSips(agendaSips.tipoPrestaciones[0].term);
        let idServicio = 177;
        let idTipoPrestacion = 0;
        let idConsultorio = await existeConsultorio(agendaSips, idEfector);

        let query = 'insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) ' +
            'values (' + estado + ', ' + idEfector + ', ' + idServicio + ', ' + idProfesional + ', ' + idTipoPrestacion + ', ' + idEspecialidad + ', ' + idConsultorio + ', \'' + fecha + '\', ' + duracionTurno + ', \'' + horaInicio + '\', \'' + horaFin + '\', ' + maximoSobreTurnos + ', ' + porcentajeTurnosDia + ', ' + porcentajeTurnosAnticipados + ', ' + citarPorBloques + ' , ' + cantidadInterconsulta + ', ' + turnosDisponibles + ', ' + idMotivoInactivacion + ', ' + multiprofesional + ', \'' + objectId + '\')';

        executeQuery(query, transaccion).then(function (idAgendaCreada) {
            let query2;

            if (listaIdProfesionales.length > 0) {
                listaIdProfesionales.forEach(async function (listaIdProf) {

                    query2 = 'INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
                        ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' +
                        idAgendaCreada + ',' +
                        listaIdProf[0].idProfesional + ',' +
                        0 + ',' +
                        constantes.idUsuarioSips + ',' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        idEspecialidad + ' ) ';

                    await executeQuery(query2, transaccion);
                });
            }

            resolve(idAgendaCreada);
        });
    });
}

function getEstadoAgendaSips(estadoCitas) {

    return new Promise((resolve, reject) => {
        let estadoAgenda: any;

        console.log("Estado Citas: ", estadoCitas)
        if (estadoCitas === 'disponible' || estadoCitas === 'publicada') {
            estadoAgenda = constantes.EstadoAgendaSips.activa
            resolve(estadoAgenda); // 1
        } else if (estadoCitas === 'suspendida') {
            estadoAgenda = constantes.EstadoAgendaSips.inactiva;
            resolve(estadoAgenda);
        } else if (estadoCitas === 'codificada') {
            estadoAgenda = constantes.EstadoAgendaSips.cerrada;
            resolve(estadoAgenda);
        }
    });
}


function getProfesional(profesionalMongo, pool) {
    profesionalMongo = profesionalMongo.map(profMongo => arrayIdProfesionales(profMongo, pool));

    return Promise
        .all(profesionalMongo)
        .then(arrayIdProf => {
            return arrayIdProf;
        });
}

function arrayIdProfesionales(profMongo, pool) {
    return new Promise((resolve, reject) => {
        const array = [];
        (async function () {
            try {
                let query = 'SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional AND activo = 1';
                let result = await pool.request()
                    .input('dniProfesional', sql.Int, profMongo.documento)
                    .query(query);

                array.push(result[0]);
                resolve(array);
            } catch (err) {
                reject(err);
            }
        })();
    });

}

function getEspecialidadSips(tipoPrestacion) {
    let idEspecialidad = 0;

    return new Promise((resolve, reject) => {
        if (tipoPrestacion.includes('odonto')) {
            /*IdEspecialidad 34 = odontologia en SIPS*/
            idEspecialidad = 34;
            resolve(idEspecialidad);
        } else {
            idEspecialidad = 14;
            resolve(idEspecialidad);
        }
    });
}

/**
 * @param agenda @description Busca el paciente correspondiente a un turno y agenda pasados por parámetro
 * @param idTurno
 * @returns Promise
 */
function getPacienteAgenda(agenda, idTurno) {
    return new Promise(function (resolve, reject) {
        let turno;
        agendaSchema.findById(agenda.id, function getAgenda(err, data) {
            if (err) {
                reject(err);
            }
            for (let x = 0; x < (data as any).bloques.length; x++) {
                // Si existe este bloque...
                if ((data as any).bloques[x] != null) {
                    // Buscamos y asignamos el turno con id que coincida (si no coincide "asigna" null)
                    turno = (data as any).bloques[x].turnos.id(idTurno);
                    // Si encontró el turno dentro de alguno de los bloques, lo devuelve
                    if (turno !== null) {
                        resolve(turno);
                    }
                }
            }
            resolve();
        });
    });
}
async function actualizarEstadoTurnoSips(idAgendaSips, turno, transaccion) {
    let estadoTurnoSips: any = await getEstadoTurnoSips(turno._id);
    let estadoTurnoMongo = getEstadoTurnosCitasSips(turno.estado, turno.updatedAt);

    if (estadoTurnoSips.idTurnoEstado !== estadoTurnoMongo) {
        let objectIdTurno;

        if (turno._id) {
            objectIdTurno = ' and objectId = \'' + turno._id + '\'';
        }

        /*TODO: hacer enum con los estados */
        var horaInicio = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

        if ((estadoTurnoMongo === constantes.EstadoTurnosSips.suspendido || turno.estado === 'turnoDoble') && !await existeTurnoBloqueoSips(idAgendaSips, horaInicio)) {
            await grabarTurnoBloqueo(idAgendaSips, turno, transaccion);
        }

        let query = 'UPDATE dbo.CON_Turno SET idTurnoEstado = ' + estadoTurnoMongo + ' WHERE idAgenda = ' + idAgendaSips + objectIdTurno;
        await executeQuery(query, transaccion);
    }
}

async function existeTurnoBloqueoSips(idAgendaSips, horaInicio) {
    let transaction;
    let query = 'SELECT COUNT(b.idTurnoBloqueo) as count FROM CON_TurnoBloqueo b ' +
        'JOIN CON_TURNO t on t.idAgenda = b.idAgenda ' +
        'WHERE b.idAgenda = ' + idAgendaSips +
        ' AND b.horaTurno = \'' + horaInicio + '\'';

    try {
        let result = await new sql.Request(transaction).query(query);
        return result[0].count > 0;
    } catch (err) {
        return false;
    }
}

async function grabarTurnoBloqueo(idAgendaSips, turno, transaccion) {
    const motivoBloqueo = getMotivoTurnoBloqueoSips(turno);
    var fechaBloqueo = moment(turno.horaInicio).format('YYYYMMDD');
    var horaBloqueo = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

    let queryTurnoBloqueo = 'INSERT dbo.CON_TurnoBloqueo (idAgenda ' +
        ', fechaTurno ' +
        ', horaTurno ' +
        ', idUsuarioBloqueo ' +
        ', fechaBloqueo ' +
        ', idMotivoBloqueo) ';
    queryTurnoBloqueo += 'VALUES (' +
        idAgendaSips + ', ' +
        '\'' + fechaBloqueo + '\', ' +
        '\'' + horaBloqueo + '\', ' +
        constantes.idUsuarioSips + ', ' +
        '\'' + moment(turno.updatedAt).format('YYYYMMDD') + '\', ' +
        motivoBloqueo + ')';

    await executeQuery(queryTurnoBloqueo, transaccion);
}


function getMotivoTurnoBloqueoSips(turno) {
    let motivoBloqueo;

    if (turno.estado === 'suspendido') {
        motivoBloqueo = getMotivoTurnoSuspendido(turno.motivoSuspension);
    } else if (turno.estado === 'turnoDoble') {
        motivoBloqueo = constantes.MotivoTurnoBloqueo.turnoDoble;
    }

    return motivoBloqueo;
}


function getMotivoTurnoSuspendido(motivoSuspension) {
    let devuelveMotivoSuspension;

    switch (motivoSuspension) {
        case 'profesional':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.retiroDelProfesional;
            break;
        case 'edilicia':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.otros;
            break;
        case 'organizacion':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.reserva;
            break;
    }

    return devuelveMotivoSuspension;
}


/* TODO: ver si hay mas estados de turnos entre CITAS y SIPS*/
function getEstadoTurnosCitasSips(estadoTurnoCitas, updated) {
    let estado: any;

    if (estadoTurnoCitas === 'asignado') {
        estado = constantes.EstadoTurnosSips.activo;
    } else if ((estadoTurnoCitas === 'disponible') && (updated)) {
        estado = constantes.EstadoTurnosSips.liberado;
    } else if (estadoTurnoCitas === 'suspendido') {
        estado = constantes.EstadoTurnosSips.suspendido;
    }

    return estado;
}

/* Devuelve el estado del turno en Con_Turno de SIPS */
function getEstadoTurnoSips(objectId: any) {
    return new Promise((resolve: any, reject: any) => {
        let transaction;
        (async function () {
            try {
                let query = 'SELECT idAgenda, idTurno, idTurnoEstado FROM dbo.CON_Turno WHERE objectId = @objectId';
                let result = await new sql.Request(transaction)
                    .input('objectId', sql.VarChar(50), objectId)
                    .query(query);

                if (typeof result[0] !== 'undefined') {
                    resolve(result[0]);
                } else {
                    let idTurnoEstado = 0;
                    resolve(idTurnoEstado);
                }
            } catch (err) {
                reject(err);
            }
        })();
    });
}

function executeQuery(query: any, transaction) {
    query += ' select SCOPE_IDENTITY() as id';
    return new Promise((resolve: any, reject: any) => {

        return new sql.Request(transaction)
            .query(query)
            .then(result => {
                resolve(result[0].id);
                console.log("Query Resolve: ", query)
                console.log("Execute queryyyy: ", result[0].id)
            }).catch(err => {
                reject(err);
                console.log("Query Reject: ", query)
                console.log("Execute queryyyy Rehject: ", err)
            });
    });
}

function existePacienteSips(pacienteSips) {
    let idPacienteSips;
    return new Promise((resolve: any, reject: any) => {
        let transaction;
        (async function () {
            try {
                let query = 'SELECT idPaciente FROM dbo.Sys_Paciente WHERE objectId = @objectId';
                let result = await new sql.Request(transaction)
                    .input('objectId', sql.VarChar(50), pacienteSips.objectId)
                    .query(query);

                if (typeof result[0] !== 'undefined') {
                    idPacienteSips = result[0].idPaciente;
                    resolve(idPacienteSips);
                } else {
                    idPacienteSips = 0;
                    resolve(idPacienteSips);
                }

            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function insertaPacienteSips(pacienteSips: any, transaccion: any) {
    let idPacienteGrabadoSips;
    let idPaciente = await existePacienteSips(pacienteSips);

    if (idPaciente === 0) {

        let query = 'INSERT INTO dbo.Sys_Paciente ' +
            ' ( idEfector ,' +
            ' apellido , ' +
            ' nombre, ' +
            ' numeroDocumento, ' +
            ' idSexo, ' +
            ' fechaNacimiento, ' +
            ' idEstado, ' +
            ' idMotivoNI, ' +
            ' idPais, ' +
            ' idProvincia, ' +
            ' idNivelInstruccion, ' +
            ' idSituacionLaboral, ' +
            ' idProfesion, ' +
            ' idOcupacion, ' +
            ' calle, ' +
            ' numero, ' +
            ' piso, ' +
            ' departamento, ' +
            ' manzana, ' +
            ' idBarrio, ' +
            ' idLocalidad, ' +
            ' idDepartamento, ' +
            ' idProvinciaDomicilio, ' +
            ' referencia, ' +
            ' informacionContacto, ' +
            ' cronico, ' +
            ' idObraSocial, ' +
            ' idUsuario, ' +
            ' fechaAlta, ' +
            ' fechaDefuncion, ' +
            ' fechaUltimaActualizacion, ' +
            ' idEstadoCivil, ' +
            ' idEtnia, ' +
            ' idPoblacion, ' +
            ' idIdioma, ' +
            ' otroBarrio, ' +
            ' camino, ' +
            ' campo, ' +
            ' esUrbano, ' +
            ' lote, ' +
            ' parcela, ' +
            ' edificio, ' +
            ' activo, ' +
            ' fechaAltaObraSocial, ' +
            ' numeroAfiliado, ' +
            ' numeroExtranjero, ' +
            ' telefonoFijo, ' +
            ' telefonoCelular, ' +
            ' email, ' +
            ' latitud, ' +
            ' longitud, ' +
            ' objectId ) ' +
            ' VALUES( ' +
            pacienteSips.idEfector + ', ' +
            '\'' + pacienteSips.apellido + '\',' +
            '\'' + pacienteSips.nombre + '\', ' +
            pacienteSips.numeroDocumento + ', ' +
            pacienteSips.idSexo + ', ' +
            '\'' + pacienteSips.fechaNacimiento + '\',' +
            pacienteSips.idEstado + ', ' +
            pacienteSips.idMotivoNI + ', ' +
            pacienteSips.idPais + ', ' +
            pacienteSips.idProvincia + ', ' +
            pacienteSips.idNivelInstruccion + ', ' +
            pacienteSips.idSituacionLaboral + ', ' +
            pacienteSips.idProfesion + ', ' +
            pacienteSips.idOcupacion + ', ' +
            '\'' + pacienteSips.calle + '\', ' +
            pacienteSips.numero + ', ' +
            '\'' + pacienteSips.piso + '\', ' +
            '\'' + pacienteSips.departamento + '\', ' +
            '\'' + pacienteSips.manzana + '\', ' +
            pacienteSips.idBarrio + ', ' +
            pacienteSips.idLocalidad + ', ' +
            pacienteSips.idDepartamento + ', ' +
            pacienteSips.idProvinciaDomicilio + ', ' +
            '\'' + pacienteSips.referencia + '\', ' +
            '\'' + pacienteSips.informacionContacto + '\', ' +
            pacienteSips.cronico + ', ' +
            pacienteSips.idObraSocial + ', ' +
            pacienteSips.idUsuario + ', ' +
            '\'' + pacienteSips.fechaAlta + '\', ' +
            '\'' + pacienteSips.fechaDefuncion + '\', ' +
            '\'' + pacienteSips.fechaUltimaActualizacion + '\', ' +
            pacienteSips.idEstadoCivil + ', ' +
            pacienteSips.idEtnia + ', ' +
            pacienteSips.idPoblacion + ', ' +
            pacienteSips.idIdioma + ', ' +
            '\'' + pacienteSips.otroBarrio + '\', ' +
            '\'' + pacienteSips.camino + '\', ' +
            '\'' + pacienteSips.campo + '\', ' +
            pacienteSips.esUrbano + ', ' +
            '\'' + pacienteSips.lote + '\', ' +
            '\'' + pacienteSips.parcela + '\', ' +
            '\'' + pacienteSips.edificio + '\', ' +
            pacienteSips.activo + ', ' +
            '\'' + pacienteSips.fechaAltaObraSocial + '\', ' +
            '\'' + pacienteSips.numeroAfiliado + '\', ' +
            '\'' + pacienteSips.numeroExtranjero + '\', ' +
            '\'' + pacienteSips.telefonoFijo + '\', ' +
            '\'' + pacienteSips.telefonoCelular + '\', ' +
            '\'' + pacienteSips.email + '\', ' +
            '\'' + pacienteSips.latitud + '\', ' +
            '\'' + pacienteSips.longitud + '\', ' +
            '\'' + pacienteSips.objectId + '\' ' +
            ') ';

        idPacienteGrabadoSips = await executeQuery(query, transaccion);
    } else {
        idPacienteGrabadoSips = idPaciente;
    }

    return idPacienteGrabadoSips;
}
// #region GetPacienteMPI
/** Este método se llama desde grabaTurnoSips */
async function getPacienteMPI(paciente: any, idEfectorSips: any, transaccion: any) {

    let pacienteSips = {
        idEfector: idEfectorSips,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        numeroDocumento: paciente.documento,
        idSexo: (paciente.sexo === 'masculino' ? 3 : paciente.sexo === 'femenino' ? 2 : 1),
        fechaNacimiento: moment(paciente.fechaNacimiento).format('YYYYMMDD'),
        idEstado: 3,
        /* Estado Validado en SIPS*/
        idMotivoNI: 0,
        idPais: 54,
        idProvincia: 139,
        idNivelInstruccion: 0,
        idSituacionLaboral: 0,
        idProfesion: 0,
        idOcupacion: 0,
        calle: '',
        numero: 0,
        piso: '',
        departamento: '',
        manzana: '',
        idBarrio: -1,
        idLocalidad: 52,
        idDepartamento: 557,
        idProvinciaDomicilio: 139,
        referencia: '',
        informacionContacto: '',
        cronico: 0,
        idObraSocial: 499,
        idUsuario: constantes.idUsuarioSips,
        fechaAlta: moment().format('YYYYMMDD HH:mm:ss'),
        fechaDefuncion: '19000101',
        fechaUltimaActualizacion: moment().format('YYYYMMDD HH:mm:ss'),
        idEstadoCivil: 0,
        idEtnia: 0,
        idPoblacion: 0,
        idIdioma: 0,
        otroBarrio: '',
        camino: '',
        campo: '',
        esUrbano: 1,
        lote: '',
        parcela: '',
        edificio: '',
        activo: 1,
        fechaAltaObraSocial: '19000101',
        numeroAfiliado: null,
        numeroExtranjero: '',
        telefonoFijo: 0,
        telefonoCelular: 0,
        email: '',
        latitud: 0,
        longitud: 0,
        objectId: paciente._id
    };

    let idPacienteGrabadoSips = await insertaPacienteSips(pacienteSips, transaccion);

    return idPacienteGrabadoSips;
}
