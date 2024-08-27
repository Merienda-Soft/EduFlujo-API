const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('mensaje de prueba, la api funciona');
});

//exportacion de rutas
const teachersRoutes = require('./routes_teachers');


//usar las rutas
router.use('/teachers', teachersRoutes);


module.exports = router

