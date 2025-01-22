const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes');

const app = express();

//coneccion a la base de datos
connectDB();
//middlewares
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(cors());
app.use(express.json());

// ruta de prueba
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working' });
});

//rutas
app.use('/api', routes);

// manejo básico de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal!' });
});

module.exports = app;


