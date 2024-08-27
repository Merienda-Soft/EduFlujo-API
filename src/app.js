const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes');

const app = express();

//coneccion a la base de datos
connectDB();

//middlewares
app.use(cors());
app.use(express.json());

//rutas
app.use('/api', routes);

module.exports = app;


