import { Router } from 'express';
import { MarksController } from '../controllers/marks.controller';

const router = Router();
const marksController = new MarksController();

/**
 * Calcular y guardar las notas finales anuales de todos los estudiantes de un curso
 */
router.post('/calculate-final-marks', (req, res) => {
  marksController.calculateFinalMarks(req, res);
});

/**
 * Calcular y guardar las notas finales por materia específica
 */
router.post('/calculate-subject-marks', (req, res) => {
  marksController.calculateSubjectMarks(req, res);
});

/**
 * Obtener todas las notas finales de un curso
 */
router.get('/final-marks/:courseId/:managementId', (req, res) => {
  marksController.getFinalMarks(req, res);
});

/**
 * Obtener todas las notas finales por materia de un curso
 */
router.get('/subject-marks/:courseId/:subjectId/:managementId', (req, res) => {
  marksController.getSubjectMarks(req, res);
});

/**
 * Verificar si los cursos tienen registros en MarkSubject para todas sus materias
 */
router.post('/check-courses-marks', (req, res) => {
  marksController.checkCoursesHaveMarks(req, res);
});

/**
 * Verificar que el servicio de marks funciona correctamente
 */
router.get('/health', (req, res) => {
  marksController.healthCheck(req, res);
});

export default router;