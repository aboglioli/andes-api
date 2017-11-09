
const constantes = {
    SEXO: {
        type: String,
        enum: ['femenino', 'masculino', 'otro']
    },
    ESTADOCIVIL: {
        type: Array,
        enum: ['casado', 'separado', 'divorciado', 'viudo', 'soltero', 'otro']
    },
    CONTACTO: {
        type: Array,
        enum: ['fijo', 'celular', 'email']
    }
};
export = constantes;
