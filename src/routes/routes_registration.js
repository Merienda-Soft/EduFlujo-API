const express = require('express');
const router = express.Router();
const inscripcionController = require('../controllers/registrationController');

// Rutas CRUD para Inscripciones
router.get('/', inscripcionController.getInscripciones);
router.get('/:id', inscripcionController.getInscripcionById);
router.post('/', inscripcionController.createInscripcion);
router.put('/:id', inscripcionController.updateInscripcion);
router.delete('/:id', inscripcionController.deleteInscripcion);

module.exports = router;
