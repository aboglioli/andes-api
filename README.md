![ANDES](https://github.com/andes/andes.github.io/raw/master/images/logo.png)

## API

APIs para ANDES

## Notas

Como Angular2 y Angular-CLI son proyectos que están en constante actualización, recomendamos utilizar las versiones específicas detalladas en este documento

## Configuración

Se debe crear un nuevo archivo llamado `config.private.ts` a partir de
`config.private.sample.ts` (ejemplo de configuración) que contendrá toda la
configuración sensible.

## Instalación

### Instalar dependencias

```bash
cd api
npm install
```

### Iniciar servicios con Docker

El sistema utiliza dos instancias de MongoDB y una de ElasticSearch. Se utiliza
docker-compose para facilitar la creación y ejecución de dichos servicios.

La configuración de los servicios se encuentra en `docker-compose.yml`.

Para correr los servicios:

```
# En la raíz del proyecto (donde se encuentra docker-compose.yml)
docker-compose up mongodb1 mongodb2 elasticsearch
```

### Configuracón de los servicios

Por defecto:

- La instancia de MongoDB para la base de datos principal y la de snomed corre en el puerto 27017.
- La base de datos para el MPI corre en el puerto 27028.
- ElasticSearch corre en el puerto 9200.

### Iniciar el servidor web

```bash
npm start
```

### 
