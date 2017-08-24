import * as express from 'express';
import * as organizacionCache from '../schemas/organizacionCache';
import * as servicioSisa from '../../../utils/servicioSisa';
import * as configPrivate from '../../../config.private';

let router = express.Router();

router.get('/organizacionesCache', function (req, res, next) {

    let query;

    query = organizacionCache.organizacionCache.find();
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.post('/organizacionesCache', function (req, res, next) {

    servicioSisa.getOrganizacionesSisa(configPrivate.sisa.username, configPrivate.sisa.password);

});

export = router;
