import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';

export const reportsRouter = (() => {
    const router = Router();
    const reportsController = new ReportsController();

    // Ruta para generar reporte de asistencia
    router.get('/attendance/course/:courseId/subject/:subjectId/professor/:professorId/management/:managementId', 
        reportsController.generateAttendanceReport.bind(reportsController));

    return router;
})();