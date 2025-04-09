import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';

export const attendanceRouter = (() => {
    const router = Router();
    const controller = new AttendanceController();

    // Registrar asistencia para un curso completo
    router.post('/register', controller.registerAttendance.bind(controller));

    // Obtener asistencia por curso, materia y fecha
    router.get('/course/:courseId/subject/:subjectId/date/:date', controller.getAttendanceByCourseSubjectDate.bind(controller));

    // Obtener asistencia por curso y fecha
    router.get('/course/:courseId/date/:date', controller.getAttendanceByCourseDate.bind(controller));

    // Actualizar estado de asistencia de un estudiante
    router.put('/attendance/:attendanceId/student/:studentId', controller.updateAttendanceRecord.bind(controller));

    // Actualizar estado de asistencia de múltiples estudiantes a la vez
    router.put('/attendance/batch-update', controller.updateMultipleAttendanceRecords.bind(controller));

    // Obtener historial de asistencia de un estudiante
    router.get('/student/:studentId/course/:courseId/subject/:subjectId', controller.getStudentAttendanceHistory.bind(controller));

    return router;
})();
