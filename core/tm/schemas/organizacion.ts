import * as camas from './camas';
import * as mongoose from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

let codigoSchema = new mongoose.Schema({
    sisa: {
        type: String,
        required: true
    },
    cuie: String,
    remediar: String
});

let _schema = new mongoose.Schema({
    codigo: { type: codigoSchema },
    nombre: String,
    tipoEstablecimiento: { type: tipoEstablecimientoSchema },
    contacto: [contactoSchema],
    direccion: { type: direccionSchema },
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    fechaAlta: Date,
    fechaBaja: Date,
    unidadesOrganizativas: [SnomedConcept]
});
const audit = require('../../../mongoose/audit');
_schema.plugin(audit);
export let schema = _schema;
export let model = mongoose.model('organizacion', _schema, 'organizacion');

// model.create({
//     codigo: {
//         sisa: 'sisa123'
//     },
//     nombre: 'Organización 1',
//     tipoEstablecimiento: {
//         nombre: 'Establecimiento 1'
//     },
//     contacto: [{
//         tipo: 'email',
//         valor: 'organizacion1@example.com',
//         ranking: 1,
//         activo: true
//     }],
//     direccion: {
//         valor: 'Dirección',
//         codigoPostal: '5527',
//         ubicacion: {
//             pais: {
//                 nombre: 'Argentina'
//             },
//             provincia: {
//                 nombre: 'Mendoza'
//             }
//         },
//         activo: true
//     },
//     edificio: [{
//         descripcion: 'Edificio 1',
//         contacto: {
//             tipo: 'email',
//             valor: 'edificio1@example.com',
//             activo: true
//         },
//         direccion: {
//             valor: 'Edificio Dirección',
//             codigoPostal: '5527',
//             ubicacion: {
//                 pais: {
//                     nombre: 'Argentina'
//                 },
//                 provincia: {
//                     nombre: 'Mendoza'
//                 }
//             },
//             activo: true
//         }
//     }],
//     activo: true
// }).then(org => console.log('nueva org', org));
