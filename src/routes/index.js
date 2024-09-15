const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('mensaje de prueba, la api funciona');
});

//exportacion de rutas
const teachersRoutes = require('./routes_teachers');
const activityRoutes = require('./routes_activities');

//usar las rutas
router.use('/teachers', teachersRoutes);
router.use('/activities', activityRoutes);


module.exports = router

