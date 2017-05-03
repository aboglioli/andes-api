import * as mongoose from 'mongoose';
import * as paisSchema from './pais';

let provinciaSchema = new mongoose.Schema({
    nombre: String,
    codigoSISA: String,
    pais: paisSchema
});

export = provinciaSchema;
