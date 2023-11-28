// archivo para el set de el servidor server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT=3000;
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

// para conexion con posgrest
const {Pool}= require('pg');

const pool= new Pool({
    user: 'postgres',
    host: 'localhost',
    database:'Proyecto_Quibdo',
    password:'luisaaron27',
    port:5432,
});

// Continuación del archivo server.js

// ...

app.get('/consulta/:tabla', async (req, res) => {
    try {
        const { tabla } = req.params;

        // Define las consultas SQL para cada tabla
        const queries = {
            // Agrega más consultas para otras tablas si es necesario
            Proyecciones: 'SELECT SUM(pob_2015_2) AS suma_pob_2015, SUM(pob_2016_2) AS suma_pob_2016, SUM(pob_2017_2) AS suma_pob_2017, SUM(pob_2018_2) AS suma_pob_2018, SUM(pob_2019_2) AS suma_pob_2019, SUM(pob_2020_2) AS suma_pob_2020, SUM(pob_2021_2) AS suma_pob_2021, SUM(pob_2022_2) AS suma_pob_2022, SUM(pob_2023_2) AS suma_pob_2023, SUM(pob_2024_2) AS suma_pob_2024, SUM(pob_2025_2) AS suma_pob_2025 FROM "Proyecciones_De_Inundacion_2015_2025"',
            Invisibles: 'SELECT SUM(pob_2015) AS suma_pob_2015, SUM(pob_2016) AS suma_pob_2016, SUM(pob_2017) AS suma_pob_2017, SUM(pob_2018) AS suma_pob_2018, SUM(pob_2019) AS suma_pob_2019, SUM(pob_2020) AS suma_pob_2020, SUM(pob_2021) AS suma_pob_2021, SUM(pob_2022) AS suma_pob_2022, SUM(pob_2023) AS suma_pob_2023, SUM(pob_2024) AS suma_pob_2024, SUM(pob_2025) AS suma_pob_2025 FROM "Inundaciones_No_Visibles_Poblacion"',
            Recomendaciones: 'SELECT "Tipo de recomendación" AS Tipo, "Recomendaciones" FROM "Recomendaciones"'
        };

        // Verifica si la tabla solicitada tiene una consulta definida
        if (!(tabla in queries)) {
            return res.status(400).json({ error: "Tabla no válida" });
        }

        // Realiza la consulta SQL específica para la tabla
        const queryResult = await pool.query(queries[tabla]);

        // Verifica los resultados en la consola
        console.log(queryResult.rows);

        // Genera HTML a partir de los resultados
        const htmlResult = generateHTMLFromQueryResult(queryResult.rows, tabla);

        // Envía el HTML como respuesta
        res.send(htmlResult);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});


// Modifica la función para generar una tabla vertical HTML a partir del resultado de la consulta
const generateHTMLFromQueryResult = (rows, tableName) => {
    console.log(rows); // Verifica los datos en la consola

    // Texto personalizado según la tabla seleccionada
    let customMessage = '';
    switch (tableName) {
        case 'Proyecciones':
            customMessage = 'Proyección de las habitantes afectado por la inundación más grande resitrada según GEE';
            break;
        case 'Invisibles':
            customMessage = 'Proyección de las habitantes afectado por inundaciones no registrada en GEE';
            break;
        case 'Recomendaciones':
            customMessage = 'He aquí una serie de recomendaciones para los barrios que tienen riegos de inundaciones'
            break;
            // Agrega más casos según tus tablas
        default:
            customMessage = 'Resultados de la Consulta SQL';
    }

    // Agrega el nombre de la tabla seleccionada y el mensaje personalizado al título
    let html = `<h2>${customMessage}</h2>`;
    
    // Comienza la tabla
    html += '<table border="1"><tbody>';

    // Itera sobre cada fila y agrega las celdas a la tabla
    rows.forEach(row => {
        for (const key in row) {
            html += `<tr><td><strong>${key}:</strong></td><td>${row[key]}</td></tr>`;
        }
    });

    // Finaliza la tabla
    html += '</tbody></table>';

    return html;
};


app.get('/fields/:layerName', async (req, res) => {
    try {
        const layerName = req.params.layerName;
        // Aquí, obtén los campos para la capa solicitada
        // Esta es una consulta de ejemplo para obtener los nombres de columna de una tabla
        const queryResult = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${layerName}'`);
        const fields = queryResult.rows.map(row => row.column_name);
        res.json(fields);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/values/:layerName/:fieldName', async (req, res) => {
    try {
        const { layerName, fieldName } = req.params;
        // Esta es una consulta de ejemplo para obtener valores únicos para un campo específico
        const queryResult = await pool.query(`SELECT DISTINCT "${fieldName}" FROM public."${layerName}"`);
        const values = queryResult.rows.map(row => row[fieldName]);
        res.json(values);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/data/:layerName/filter', async (req, res) => {
    try {
        const { layerName } = req.params;
        const { field, value } = req.query;
        // Esta es una consulta de ejemplo para filtrar datos basándose en un campo y un valor
        const queryResult = await pool.query(`SELECT *, ST_AsGeoJSON(geom)::json AS geometry FROM public."${layerName}" WHERE "${field}" = '${value}'`);
        const geojson = transformToGeoJSON(queryResult.rows);
        res.json(geojson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
  });
  
  // ...
  
  // Aquí sigue el resto de tu código existente
  
  
  app.get('/data/:layerName', async(req, res) => {
    try {
        const layerName = req.params.layerName;
        // Verifica que el nombre de la capa sea válido
        const validLayers = ['Construcciones_mnz', 'Barrios_De_Riesgo','Proyecciones_De_Inundacion_2015_2025','Inundaciones_No_Visibles_Poblacion']; // Agrega todas las capas válidas aquí
        if (!validLayers.includes(layerName)) {
            return res.status(400).json({ error: "Capa no válida" });
        }
  
        const queryResult = await pool.query(`SELECT *, ST_AsGeoJSON(geom)::json AS geometry FROM public."${layerName}"`);
        const geojson = transformToGeoJSON(queryResult.rows);
        res.json(geojson);
    } catch(error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
  });
  
  const transformToGeoJSON = (rows) => {
      // Este es un esqueleto básico para un objeto GeoJSON.
      const geoJSON = {
        type: "FeatureCollection",
        features: [],
      };
    
      // Iterar sobre cada fila y construir tu característica GeoJSON.
      for (const row of rows) {
        const feature = {
          type: "Feature",
          properties: {
            // Aquí incluirías todas las propiedades que deseas incluir.
            // Por ejemplo, si tuvieras un campo 'name' en tu tabla:
            // name: row.name
            //nombre: row.nombre,
            //direccion: row.direccion,
            
          },
          geometry: row.geometry // Asumiendo que 'geometry' es un campo ya convertido en GeoJSON
        };
        // Agrega propiedades adicionales a cada característica según sea necesario.
        for (const property in row) {
          if (property !== 'geometry') {
            feature.properties[property] = row[property];
          }
        }
        // Agregar la característica al arreglo de características de GeoJSON.
        geoJSON.features.push(feature);
      }
    
      return geoJSON;
    };
  
  /////////////////////////
  
  app.get('/layers', async (req, res) => {
    try {
        // Esta consulta SQL lista todas las tablas espaciales
        // Asegúrate de ajustar la consulta a tu esquema y base de datos
        const queryResult = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const layers = queryResult.rows.map(row => row.table_name);
        res.json(layers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
  });

    // Configuración del middleware para analizar datos del formulario
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // Ruta para manejar la solicitud del formulario
    app.post('/enviar-correo', (req, res) => {
        const { nombre, correo, barrio, direccion } = req.body;

        // Configuración del servicio de correo
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'leoleon1930@gmail.com',  // Reemplaza con tu dirección de correo electrónico
                pass: 'vrdk kkqq aayy yjte'         // Reemplaza con tu contraseña
            }
        });

        // Contenido del correo
        const mailOptions = {
            from: 'leoleon1930@gmail.com',    // Reemplaza con tu dirección de correo electrónico
            to: 'luisaaron1930@gmail.com', // Reemplaza con la dirección de correo del destinatario
            subject: 'Comunicación de barrio no registrado en la base de datos',
            text: `Nombre:\n ${nombre}\n Correo:\n ${correo}\n Barrio:\n ${barrio}\n Dirección:\n ${direccion}`
        };

        // Envía el correo
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                res.status(500).send('Error al enviar el correo');
            } else {
                console.log('Correo enviado: ' + info.response);
                res.status(200).send('Correo enviado correctamente');
            }
        });
    });


    app.post('/enviar-formulario', async (req, res) => {
        try {
            const { nombre, correo, barrio, direccion } = req.body;

            // Realiza la inserción en la base de datos o cualquier otra acción que desees
            // Puedes usar tu pool de PostgreSQL aquí para interactuar con la base de datos

            // Por ejemplo, insertar datos en una tabla llamada 'formulario_contacto'
            const insertQuery = `INSERT INTO "Barrios y Zonas por registrar"("Nombre", "Correo", "Barrio/Zona", "Direccion") VALUES ('${nombre}', '${correo}', '${barrio}', '${direccion}')`;
            await pool.query(insertQuery);

            // Responde con un mensaje de éxito
            res.json({ success: true, message: 'Formulario enviado correctamente' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/verificar-credenciales', async (req, res) => {
        try {
            const { usuario, contrasena } = req.body;

            // Realiza la consulta en la base de datos para verificar las credenciales
            const queryResult = await pool.query(
                `SELECT "Usuario", "Constraseña" FROM "Administracion" WHERE "Usuario" = '${usuario}' AND "Constraseña" = '${contrasena}' AND "Estado" = True`
            );

            // Verifica si se encontraron resultados
            if (queryResult.rows.length > 0) {
                res.json({ mensaje: 'Credenciales válidas', autenticado: true });
            } else {
                res.status(401).json({ mensaje: 'Credenciales inválidas', autenticado: false });
            }
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/datos-administrador', async (req, res) => {
        try {
            // Realiza la consulta SQL aquí y obtén el resultado en formato HTML
            const queryResult = await pool.query('SELECT "ID", "Nombre", "Correo", "Barrio/Zona", "Direccion" FROM "Barrios y Zonas por registrar" WHERE "Estado" = True');
            const htmlResult = generateTableHTMLFromQueryResult(queryResult.rows);
    
            // Envía el HTML como respuesta
            res.send(htmlResult);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });
    

    // Modifica la función para generar una tabla HTML a partir del resultado de la consulta
    const generateTableHTMLFromQueryResult = (rows) => {
    let html = '<h2>Resultados de la Consulta SQL</h2>';
    
    // Comienza la tabla
    html += '<table class="table table-bordered"><thead><tr>';

    // Itera sobre las claves de la primera fila para obtener los encabezados de la tabla
    const headers = Object.keys(rows[0]);
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });

    // Agrega una columna adicional para el botón "Revisado"
    html += '<th>Acciones</th></tr></thead><tbody>';

    // Itera sobre cada fila y agrega las celdas a la tabla
    rows.forEach(row => {
        // Genera un identificador único basado en el contenido de la fila
        const uniqueId = row.ID; // Cambia 'ID' a la columna que sirva como identificador único

        html += `<tr id="${uniqueId}">`;

        // Itera sobre cada campo de la fila
        headers.forEach(header => {
            html += `<td>${row[header]}</td>`;
        });

        // Agrega el botón "Revisado" con el identificador único como parámetro
        html += `<td><button onclick="marcarComoRevisado('${uniqueId}')">Revisado</button></td>`;

        html += '</tr>';
    });

    // Finaliza la tabla
    html += '</tbody></table>';

    return html;
};


    // Agrega esta ruta al servidor para manejar las actualizaciones
    app.put('/marcar-revisado/:id', async (req, res) => {
        try {
            const id = req.params.id;

            // Realiza la actualización en la base de datos
            await pool.query('UPDATE "Barrios y Zonas por registrar" SET "Estado" = \'False\' WHERE "ID" = $1 AND "Estado" = \'True\'', [id]);

            // Envía una respuesta exitosa al cliente
            res.status(200).send('Actualización exitosa');
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });




  /////////////////////////
  
  //aplicacion de archivos estaticos
  app.use(express.static('public'));
  
  //Ruta principal que sirve el archivo index.html
  app.get('/', (req,res)=>{
      res.sendFile(path.join(__dirname,'public','index.html'));
  });
  
  
  //Iniciar el servidor
  app.listen(PORT,()=>{
      console.log(`Servidor Corriendo en http://localhost:${PORT}`);
  });