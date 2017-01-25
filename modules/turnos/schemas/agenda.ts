import * as mongoose from 'mongoose';

var agendaSchema = new mongoose.Schema({
    prestaciones: [{
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }],

    profesionales: [{
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        apellido: String
    }],

    espacioFisico: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    },
    horaInicio: Date,
    horaFin: Date,
    intercalar: Boolean,
    bloques: [{
        horaInicio: Date,
        horaFin: Date,
        cantidadTurnos: Number,
        duracionTurno: Number,
        descripcion: String,
        prestaciones: [{
            id: mongoose.Schema.Types.ObjectId,
            nombre: String
        }],

        accesoDirectoDelDia: Number,
        accesoDirectoProgramado: Number,
        reservadoGestion: Number,
        reservadoProfesional: Number,

        pacienteSimultaneos: Boolean,
        cantidadSimultaneos: Number,
        citarPorBloque: Boolean,
        cantidadBloque: Number,
        turnos: [{
            horaInicio: Date,
            estado:
            {
                type: String,
                enum: ["disponible", "asignado"]
            },
            paciente: {//pensar que otros datos del paciente conviene tener
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
                documento: String
            },
            pacientes: [{//este array se va a usar solo en el caso de pacientes simultaneos
                id: mongoose.Schema.Types.ObjectId,
                nombre: String,
                apellido: String,
                documento: String
            }],
            prestacion: {
                id: mongoose.Schema.Types.ObjectId,
                nombre: String
            }
        }],
    }],

    estado: {
        type: String,
        enum: ["", "Planificada", "Publicada"]
    }
});

//Defino Virtuals
agendaSchema.virtual('turnosDisponibles').get(function () {
    let turnosDisponibles = 0;
    let cantidad = 0;
    this.bloques.forEach(function (bloque) {
        bloque.turnos.forEach(function (turno) {
            if (turno.estado == "disponible") {
                if (bloque.pacienteSimultaneos){
                     cantidad = bloque.cantidadSimultaneos - turno.pacientes.length;
                     turnosDisponibles = turnosDisponibles+cantidad;
                }
                else
                    turnosDisponibles++;
            }
        });
    });
    return turnosDisponibles;
});

var agenda = mongoose.model('agenda', agendaSchema, 'agenda');

export = agenda;