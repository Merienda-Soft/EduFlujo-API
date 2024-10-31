const express = require('express');
const router = express.Router();
const report = require('../controllers/reportController');

// Rutas CRUD para Actividades
router.get('/', report.generateExcelReport);
module.exports = router;
