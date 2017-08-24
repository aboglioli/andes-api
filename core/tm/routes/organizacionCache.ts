import * as express from 'express';
import * as organizacionCache from '../schemas/organizacionCache';
import * as servicioSisa from '../../../utils/servicioSisa';
import * as configPrivate from '../../../config.private';

let router = express.Router();

router.post('/organizacionesCache', function (req, res, next) {
    let sis: any = {};
    servicioSisa.getOrganizacionesSisa(configPrivate.sisa.username, configPrivate.sisa.password);

});

export = router;
