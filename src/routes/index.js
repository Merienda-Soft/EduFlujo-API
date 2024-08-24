const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('mensaje de prueba, la api funciona');
});

//exmple const professorsRoutes = require('./professorsRoutes')
//router.use('/professors', professorsRoutes);



module.exports = router

