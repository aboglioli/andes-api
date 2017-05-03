import * as mongoose from 'mongoose';

var agendaMatriculacionesSchema = new mongoose.Schema({
    diasHabilitados: { type: [String], required: true },
    horarioInicioTurnos: { type: Number, required: true },
    horarioFinTurnos: { type: Number, required: true },
    fechasExcluidas: [Date],
    duracionTurno: { type: Number, required: true }
});

//Virtuals


var agendaMatriculaciones = mongoose.model('agendaMatriculaciones', agendaMatriculacionesSchema, 'agendaMatriculaciones');

export = agendaMatriculaciones;
