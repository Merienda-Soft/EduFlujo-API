const express = require('express');
const router = express.Router();

// Ruta de prueba para comprobar si la API funciona
router.get('/', (req, res) => {
  res.send('mensaje de prueba, la api funciona');
});

// Importar todas las rutas
const activityRoutes = require('./routes_activity');
const subjectRoutes = require('./routes_subject');
const courseRoutes = require('./routes_course');
const tutorRoutes = require('./routes_tutor');
const profesorRoutes = require('./routes_teacher');
const inscripcionRoutes = require('./routes_registration');
const userRoutes = require('./routes_user');

// Usar las rutas con prefijos
router.use('/activities', activityRoutes);
router.use('/subjects', subjectRoutes);
router.use('/courses', courseRoutes);
router.use('/tutors', tutorRoutes);
router.use('/teachers', profesorRoutes);
router.use('/registration', inscripcionRoutes);
router.use('/users', userRoutes);

module.exports = router;
