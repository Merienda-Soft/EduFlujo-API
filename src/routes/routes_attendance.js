const express = require('express');
const router = express.Router();
const { createAttendance, getAttendanceByCourseAndDate, getAttendances, updateAttendance } = require('../controllers/attendanceController');

// Crear una nueva asistencia
router.post('/attendances', createAttendance);
router.get('/attendances/search', getAttendanceByCourseAndDate);

// Obtener asistencias por curso, materia y fecha
router.get('/attendances', getAttendances);

// Actualizar asistencias
router.put('/attendances/:id', updateAttendance);

module.exports = router;
