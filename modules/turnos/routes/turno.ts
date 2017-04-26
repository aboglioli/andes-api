import * as express from 'express';
import * as agenda from '../schemas/agenda';
import { Logger } from '../../../utils/logService';
import { ValidateDarTurno } from '../../../utils/validateDarTurno';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import * as moment from 'moment';

let router = express.Router();

router.patch('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', function (req, res, next) {

  // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
  let continues = ValidateDarTurno.checkTurno(req.body);

  if (continues.valid) {

    // Se verifica la existencia del paciente 
    paciente.findById(req.body.paciente.id, function verificarPaciente(err, cant) {
      
      if (err) {
        console.log('PACIENTE INEXISTENTE', err);
        return next(err);
      } else {

        // Se verifica la existencia del tipoPrestacion
        tipoPrestacion.findById(req.body.tipoPrestacion._id, function verificarTipoPrestacion(err, data) {
          
          if (err) {
            console.log('TIPO PRESTACION INEXISTENTE', err);
            return next(err);
          } else {
            console.log(cant);

            // Se obtiene la agenda que se va a modificar
            agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
              if (err) {
                return next(err);
              }
              let posBloque: number;
              let posTurno: number;

              let countBloques = [];
              let esHoy = false;

              // Los siguientes 2 for ubican el indice del bloque y del turno
              for (let x = 0; x < (data as any).bloques.length; x++) {
                if ((data as any).bloques[x]._id.equals(req.params.idBloque)) {
                  posBloque = x;

                  // Ver si el día de la agenda coincide con el día de hoy
                  if ((data as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (data as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
                    let esHoy = true;
                  }

                  // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
                  countBloques.push({
                    delDia: esHoy ? (((data as any).bloques[x].accesoDirectoDelDia as number) + ((data as any).bloques[x].accesoDirectoProgramado as number)) : (data as any).bloques[x].accesoDirectoDelDia,
                    programado: esHoy ? 0 : (data as any).bloques[x].accesoDirectoProgramado,
                    gestion: (data as any).bloques[x].reservadoGestion,
                    profesional: (data as any).bloques[x].reservadoProfesional
                  });

                  for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
                    if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                      posTurno = y;
                      console.log('POSTURNO: ' + posTurno);
                    }

                    // Restamos los turnos asignados de a cuenta
                    if ((data as any).bloques[posBloque].turnos[y].estado === 'asignado') {
                      if ( esHoy ) {
                        switch ((data as any).bloques[posBloque].turnos[y].tipoTurno) {
                          case ('delDia'):
                            countBloques[x].delDia--;
                          break;
                          case ('programado'):
                            countBloques[x].delDia--;
                          break;
                          case ('profesional'):
                            countBloques[x].profesional--;
                          break;
                          case ('gestion'):
                            countBloques[x].gestion--;
                          break;
                        }
                      } else {
                          switch ((data as any).bloques[posBloque].turnos[y].tipoTurno) {
                            case ('programado'):
                              countBloques[x].programado--;
                            break;
                            case ('profesional'):
                              countBloques[x].profesional--;
                            break;
                            case ('gestion'):
                              countBloques[x].gestion--;
                            break;
                          }
                      }
                    }
                  }
                  console.log('POSBLOQUE: ' + posBloque);
                }
              }

              console.log('countBloques: ', countBloques);

              if ( (countBloques[req.body.tipoTurno] as number) === 0 ) {
                return next({
                  err: 'No quedan turnos del tipo ' + req.body.tipoTurno
                });
              }

              let etiquetaTipoTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoTurno';
              let etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
              let etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
              let etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
              let update: any = {};

              update[etiquetaEstado] = 'asignado';
              update[etiquetaPrestacion] = req.body.tipoPrestacion;
              update[etiquetaPaciente] = req.body.paciente;
              update[etiquetaTipoTurno] = req.body.tipoTurno;

              let query = {
                _id: req.params.idAgenda,
              };

              // Agrega un tag al JSON query
              query[etiquetaEstado] = 'disponible';
              console.log('QUERY ' + query);

              // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
              (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true },
                function actualizarAgenda(err2, doc2, writeOpResult) {
                  if (err2) {
                    console.log('ERR2: ' + err2);
                    return next(err2);
                  }
                  console.log('WRITE OP RESULT', writeOpResult.value);
                  if (writeOpResult.value === null) {
                    return next('El turno ya fue asignado');
                  } else {
                    let datosOp = {
                      estado: update[etiquetaEstado],
                      paciente: update[etiquetaPaciente],
                      prestacion: update[etiquetaPrestacion],
                      tipoTurno: update[etiquetaTipoTurno]
                    };

                    Logger.log(req, 'turnos', 'update', datosOp);
                  }
                  res.json(data);
                });
            });
          }
        });

      }
    });
  } else {
    console.log('NO VALIDO');
    return next('Los datos del paciente son inválidos');
  }
});

export = router;
