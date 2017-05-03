import * as mongoose from 'mongoose';

let paisSchema = new mongoose.Schema({
    nombre: String,
    codigoSISA: String,

});

export = paisSchema;
