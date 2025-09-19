import { Router } from 'express';
import { MarksController } from '../controllers/marks.controller';

const router = Router();
const marksController = new MarksController();

// ================= ENDPOINTS PRINCIPALES =================

/**
 * POST /professors/marks/calculate-final-marks
 * Calcular y guardar las notas finales anuales de todos los estudiantes de un curso
 * Body: { courseId: number, managementId: number, userId?: number }
 */
router.post('/calculate-final-marks', (req, res) => {
  marksController.calculateFinalMarks(req, res);
});

/**
 * POST /professors/marks/calculate-subject-marks  
 * Calcular y guardar las notas finales por materia específica
 * Body: { courseId: number, subjectId: number, managementId: number, userId?: number }
 */
router.post('/calculate-subject-marks', (req, res) => {
  marksController.calculateSubjectMarks(req, res);
});

// ================= ENDPOINTS DE CONSULTA =================

/**
 * GET /professors/marks/final-marks/:courseId/:managementId
 * Obtener todas las notas finales de un curso
 */
router.get('/final-marks/:courseId/:managementId', (req, res) => {
  marksController.getFinalMarks(req, res);
});

/**
 * GET /professors/marks/subject-marks/:courseId/:subjectId/:managementId
 * Obtener todas las notas finales por materia de un curso
 */
router.get('/subject-marks/:courseId/:subjectId/:managementId', (req, res) => {
  marksController.getSubjectMarks(req, res);
});

// ================= ENDPOINT DE SALUD =================

/**
 * GET /professors/marks/health
 * Verificar que el servicio de marks funciona correctamente
 */
router.get('/health', (req, res) => {
  marksController.healthCheck(req, res);
});

export default router;