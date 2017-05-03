import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';
import * as constantes from './constantes';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as especialidadSchema from './especialidad';
import * as paisSchema from './pais';
import * as profesionSchema from './profesion';
import { ObjSIISASchema } from './siisa';

let matriculacionSchema = new mongoose.Schema({
    matriculaNumero: { type: Number, required: true },
    libro: { type: String, required: false },
    folio: { type: String, required: false },
    inicio: Date,
    fin: Date,
    revalidacionNumero: Number
});


export let profesionalSchema = new mongoose.Schema({
	// Persona
    habilitado: { type: Boolean, default: true },
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    documentoNumero: { type: String, required: true },
    documentoVencimiento: { type: Date, required: false },
    cuit: { type: String, required: true },
    fechaNacimiento: { type: Date, required: true },
    lugarNacimiento: { type: String, required: true },
    fechaFallecimiento: { type: Date, required: false },
    nacionalidad: { type: ObjSIISASchema, required: true },
    sexo: { type: ObjSIISASchema, required: true },
    // #estadoCivil: constantes.estadoCivil,
    contactos: [contactoSchema],
    domicilios: [direccionSchema],
    fotoArchivo: String,
    firmas: [{
        imgArchivo: String,
        fecha: Date
    }],
	// ??
    incluidoSuperintendencia: { type: Boolean, default: true },
	// Formacion
    formacionGrado: [{
        profesion: { type: ObjSIISASchema, required: true },
        entidadFormadora: { type: ObjSIISASchema, required: true },
        titulo: { type: String, required: true },
        fechaTitulo: { type: Date, required: true },
        revalida: { type: Boolean, default: false },
        matriculacion: [matriculacionSchema]
    }],
    formacionPosgrado: [{
        profesion: { type: ObjSIISASchema, required: true },
        institucionFormadora: { type: ObjSIISASchema, required: true },
        especialidad: { type: ObjSIISASchema, required: true },
        fechaIngreso: { type: Date, required: true },
        fechaEgreso: { type: Date, required: true },
        observacion: String,
        certificacion: {
            fecha: { type: Date, required: true },
            modalidad: { type: ObjSIISASchema, required: true },
            establecimiento: { type: ObjSIISASchema, required: true },
        },
        matriculacion: [matriculacionSchema]
    }],
    origen: {
        type: String,
        enum: ['matriculación', 'rrhh', 'colegio de psicólogos']
    },
    sanciones: [{
        numero: {type: Number, required: true},
        sancion: {type: String, required: true},
        motivo: {type: String, required: true},
        normaLegal: {type: String, required: true},
        fecha: {type: Date, required: true},
        vencimiento: {type: Date, required: true}
    }],
    notas: { type: String, required: false },
});


// Virtuals
profesionalSchema.virtual('nombreCompleto').get(function() {
    return this.apellido + ', ' + this.nombre;

});

profesionalSchema.virtual('edad').get(function() {
    let ageDifMs = Date.now() - this.fechaNacimiento.getTime();
    let ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});

profesionalSchema.virtual('fallecido').get(function() {
    return this.fechaFallecimiento;
});

profesionalSchema.virtual('ultimaFirma').get(function() {
    return this.firmas.sort((a, b) => {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    })[0];
});

export let profesional = mongoose.model('profesional', profesionalSchema, 'profesional');
