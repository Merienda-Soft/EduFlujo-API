const express = require('express');
const router = express.Router();
const asignacionController = require('../controllers/asignacionController');

// Rutas CRUD para Asignaciones
router.get('/', asignacionController.getAsignaciones); 
router.get('/:id', asignacionController.getAsignacionById); 
router.post('/', asignacionController.createAsignacion); 
router.put('/:id', asignacionController.updateAsignacion); 
router.delete('/:id', asignacionController.deleteAsignacion); 

module.exports = router;
