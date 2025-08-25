import { Router } from "express";
import { ReportsController } from "../controllers/reports.controller";

export const reportsRouter = (() => {
  const router = Router();
  const reportsController = new ReportsController();

  // Reporte de asistencia por rango de fechas personalizado
  router.get(
    "/attendance/custom/course/:courseId/subject/:subjectId/professor/:professorId/management/:managementId",
    reportsController.generateCustomDateReport.bind(reportsController)
  );

  // Reporte de asistencia mensual
  router.get(
    "/attendance/monthly/:year/:month/course/:courseId/subject/:subjectId/professor/:professorId/management/:managementId",
    reportsController.generateMonthlyReport.bind(reportsController)
  );

  // Reporte de asistencia anual
  router.get(
    "/attendance/yearly/:year/course/:courseId/subject/:subjectId/professor/:professorId/management/:managementId",
    reportsController.generateYearlyReport.bind(reportsController)
  );

  // Reporte de asistencia por gestión (año académico completo)
  router.get(
    "/attendance/management/course/:courseId/subject/:subjectId/professor/:professorId/management/:managementId",
    reportsController.generateManagementReport.bind(reportsController)
  );

  // Reporte centralizador anual de notas (todas las materias del curso)
  router.get(
    "/centralizador/course/:courseId/management/:managementId",
    reportsController.generateCentralizadorAnual.bind(reportsController)
  );

  // Boletines - Para todos los estudiantes de un curso
  router.get(
    "/boletines/course/:courseId/management/:managementId",
    reportsController.generateBoletin.bind(reportsController)
  );

  // Boletín individual - Para un estudiante específico
  router.get(
    "/boletin/course/:courseId/management/:managementId/student/:studentId",
    reportsController.generateBoletin.bind(reportsController)
  );

  return router;
})();
