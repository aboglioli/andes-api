import { defaultLimit, maxLimit } from './../../../config';
import * as express from 'express'
import { profesional } from '../schemas/profesional'
import * as utils from '../../../utils/utils'
import * as config from '../../../config';
import * as multer from 'multer';
import * as fs from 'fs';

let router = express.Router();

/**
 * Multer (File Upload)
 */
let storageFotos = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './modules/matriculaciones/uploads/fotos');
    },
    filename: function(req, file, cb) {
        cb(null, 'prof-' + req.params.profId + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
});

let uploadFoto = multer({
    storage: storageFotos
}).single('file');

let storageFirmas = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './modules/matriculaciones/uploads/firmas');
    },
    filename: function(req, file, cb) {
        cb(null, 'firma-' + req.params.profId + '-' + Date.now().toString() + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
});

let uploadFirma = multer({
    storage: storageFirmas
}).single('file');

/**
 * Upload Firmas
 */
router.post('/profesionales/firma/:profId', uploadFirma,  (req, resp, errHandler) => {

    let filename = req.file.filename;
    let timestamp = parseInt(filename.split('-')[2].substr(0, filename.split('-')[2].indexOf('.')), 0);

    let oFirma = {
        imgArchivo: filename,
        fecha: new Date(timestamp)
    };
    resp.json(oFirma);

});

/**
 * Upload Fotos
 */
router.post('/profesionales/foto/:profId', uploadFoto,  (req, resp) => {

    resp.json({ fileName: req.file.filename});

});

/**
 * Get Base64 imgs
 */
router.get('/profesionales/matricula/:profId', (req, resp, errHandler) => {

    let oCredencial = {
        foto: null,
        firmaProfesional: null,
        firmaSupervisor: null
    };


    profesional.findById(req.params.profId).exec((err, prof) => {
        if (err) {
            return errHandler(err);
        }
        console.log(prof)
        let pathFirmaSupervisor = './modules/matriculaciones/uploads/firmas/firma-supervisor.jpg';
        let pathFirmaProfesional = './modules/matriculaciones/uploads/firmas/' + prof.ultimaFirma.imgArchivo;
        let pathFoto = './modules/matriculaciones/uploads/fotos/prof-' + req.params.profId + '.jpg';

        fs.readFile(pathFoto, (errReadFoto, fotoB64) => {
            if (errReadFoto) {
                return errHandler(errReadFoto);
            }

            oCredencial.foto = 'data:image/jpeg;base64,' + new Buffer(fotoB64).toString('base64');

            fs.readFile(pathFirmaProfesional, (errReadFirma, firmaProfB64) => {
                if (errReadFirma) {
                    return errHandler(errReadFirma);
                }

                oCredencial.firmaProfesional = 'data:image/jpeg;base64,' + new Buffer(firmaProfB64).toString('base64');

                fs.readFile(pathFirmaSupervisor, (errReadFirmaSup, firmaSupB64) => {
                    if (errReadFirmaSup) {
                        return errHandler(errReadFirmaSup);
                    }

                    oCredencial.firmaSupervisor = 'data:image/jpeg;base64,' + new Buffer(firmaSupB64).toString('base64');
                    resp.json(oCredencial);
                });
            });
        });

    });



});







/**
 * @swagger
 * definition:
 *   profesional:
 *     properties:
 *       documento:
 *         type: string
 *       activo:
 *         type: boolean
 *       nombre:
 *         type: string
 *       apellido:
 *         type: string
 *       contacto:
 *         type: array
 *         items:
 *          type: object
 *          properties:
 *               tipo:
 *                  type: string
 *                  enum: [
 *                      telefonoFijo,
 *                      telefonoCelular,
 *                      email
 *                  ]
 *               valor:
 *                  type: string
 *               ranking:
 *                  type: number
 *               ultimaActualizacion:
 *                  type: string
 *                  format: date
 *               activo:
 *                  type: boolean
 *       sexo:
 *         type: string
 *         enum: [
 *              femenino,
 *              masculino,
 *              otro
 *         ]
 *       genero:
 *         type: string
 *         enum: [
 *           femenino,
 *           masculino,
 *           otro
 *         ]
 *       fechaNacimiento:
 *         type: string
 *         format: date
 *       fechaFallecimiento:
 *         type: string
 *         format: date
 *       direccion:
 *         type: array
 *         items:
 *             $ref: '#/definitions/direccion'
 *       estadoCivil:
 *         type: string
 *         enum: [
 *           casado,
 *           separado,
 *           divorciado,
 *           viudo,
 *           soltero,
 *           otro
 *           ]
 *       foto:
 *         type: string
 *       rol:
 *         type: string
 *       especialidad:
 *          type: object
 *          properties:
 *            id:
 *                type: string
 *            nombre:
 *                type: string
 *       matriculas:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  numero:
 *                      type: number
 *                  descripcion:
 *                      type: string
 *                  activo:
 *                      type: boolean
 *                  periodo:
 *                      type: object
 *                      properties:
 *                          inicio:
 *                              type: string
 *                              format: date
 *                          fin:
 *                              type: string
 *                              format: date
 */

/**
 * @swagger
 * /profesional:
 *   get:
 *     tags:
 *       - Profesional
 *     description: Retorna un arreglo de profesionales
 *     summary: Listar profesionales
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: un arreglo de objetos profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 * /profesional/{id}:
 *   get:
 *     tags:
 *       - Profesional
 *     summary: Lista el profesional por distintos filtros
 *     description: Retorna un objeto profesional
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de un profesional
 *         required: false
 *         type: string
 *       - name: nombre
 *         in: query
 *         description: nombre de un profesional
 *         required: false
 *         type: string
 *       - name: apellido
 *         in: query
 *         description: apellido de un profesional
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: documento del profesional
 *         required : false
 *         type: string
 *       - name: fechaNacimiento
 *         in: query
 *         description: fecha de nacimiento del profesional
 *         required : false
 *         type: Date
 *       - name: matriculas.numero
 *         in: query
 *         description: número de matrícula del profesional
 *         required : false
 *         type: Number
 *       - name: especialidad.nombre
 *         in: query
 *         description: especialidad del profesional
 *         required : false
 *         type: string
 *       - name: skip
 *         in: query
 *         description: El valor numerico del skip
 *         required: false
 *         type: number
 *       - name: limit
 *         in: query
 *         description: El valor del limit
 *         required: false
 *         type: number
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.get('/profesionales/:id*?', function (req, res, next) {

    profesional.findById( req.params.id, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
});

/**
 * @swagger
 * /profesional:
 *   post:
 *     tags:
 *       - Profesional
 *     description: Cargar una profesional
 *     summary: Cargar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: profesional
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.post('/profesionales', function (req, res, next) {

    if (req.body.id) {

        profesional.findByIdAndUpdate(req.body.id, req.body, { new: true }, (err, ret) => {
            if (err) {
                return next(err);
            }

            res.status(201)
                .json(ret);
        });
    } else {

        let newProfesional = new profesional(req.body);
        newProfesional.save((err) => {

            if (err) {
                console.log(err);
                next(err);
            }

            res.json(newProfesional);
        });
    }

});

/**
 * @swagger
 * /profesional/{id}:
 *   put:
 *     tags:
 *       - Profesional
 *     description: Actualizar una profesional
 *     summary: Actualizar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *       - name: profesional
 *         description: objeto profesional
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.put('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

/**
 * @swagger
 * /profesional/{id}:
 *   delete:
 *     tags:
 *       - Profesional
 *     description: Eliminar una profesional
 *     summary: Eliminar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.delete('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndRemove(req.params._id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
})

export = router;
