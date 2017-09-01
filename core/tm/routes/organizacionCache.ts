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

    let options = {
        ...(req.body.provincia) && {'provincia': req.body.provincia},
        ...(req.body.dependencia) && {'dependencia': req.body.dependencia},
        ...(req.body.origenDeFinanciamiento) && {'origenDeFinanciamiento': req.body.origenDeFinanciamiento}
    };

    servicioSisa.getOrganizacionesSisa(configPrivate.sisa.username, configPrivate.sisa.password, options);

});

export = router;
