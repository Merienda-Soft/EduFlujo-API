import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { 
    createAttendanceSchema, 
    createAttendanceRecordSchema, 
    registerAttendanceSchema, 
    updateAttendanceRecordSchema,
    updateMultipleAttendanceRecordsSchema
} from '../dtos/attendance.dto';
import { ZodError } from 'zod';

export class AttendanceController {
    private service = new AttendanceService();

    // Registrar asistencia para un curso completo
    async registerAttendance(req: Request, res: Response) {
        try {
            const data = registerAttendanceSchema.parse(req.body);
            const result = await this.service.registerAttendance(data);
            
            return res.status(201).json({
                ok: true,
                data: result
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    ok: false,
                    error: error.errors
                });
            }
            
            console.error('Error en registerAttendance:', error);
            return res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener asistencia por curso, materia y fecha
    async getAttendanceByCourseSubjectDate(req: Request, res: Response) {
        try {
            const { courseId, subjectId, date } = req.params;
            
            if (!courseId || !subjectId || !date) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren courseId, subjectId y date'
                });
            }

            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    ok: false,
                    error: 'Formato de fecha inválido. Use YYYY-MM-DD'
                });
            }

            const result = await this.service.getAttendanceByCourseSubjectDate(
                Number(courseId),
                Number(subjectId),
                parsedDate
            );
            
            if (!result) {
                return res.status(404).json({
                    ok: false,
                    error: 'No se encontró registro de asistencia para esta fecha'
                });
            }

            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            console.error('Error en getAttendanceByCourseSubjectDate:', error);
            return res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener asistencia por curso y fecha
    async getAttendanceByCourseDate(req: Request, res: Response) {
        try {
            const { courseId, date } = req.params;
            
            if (!courseId || !date) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren courseId y date'
                });
            }

            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    ok: false,
                    error: 'Formato de fecha inválido. Use YYYY-MM-DD'
                });
            }

            const result = await this.service.getAttendanceByCourseDate(
                Number(courseId),
                parsedDate
            );

            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            console.error('Error en getAttendanceByCourseDate:', error);
            return res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // Actualizar estado de asistencia de un estudiante
    async updateAttendanceRecord(req: Request, res: Response) {
        try {
            const { attendanceId, studentId } = req.params;
            const data = updateAttendanceRecordSchema.parse(req.body);
            
            if (!attendanceId || !studentId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren los IDs de asistencia y estudiante'
                });
            }

            const result = await this.service.updateAttendanceRecord(
                Number(attendanceId), 
                Number(studentId), 
                data
            );
            
            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    ok: false,
                    error: error.errors
                });
            }
            
            console.error('Error en updateAttendanceRecord:', error);
            return res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener historial de asistencia de un estudiante
    async getStudentAttendanceHistory(req: Request, res: Response) {
        try {
            const { studentId, courseId, subjectId } = req.params;
            
            if (!studentId || !courseId || !subjectId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requieren studentId, courseId y subjectId'
                });
            }

            const result = await this.service.getStudentAttendanceHistory(
                Number(studentId),
                Number(courseId),
                Number(subjectId)
            );

            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            console.error('Error en getStudentAttendanceHistory:', error);
            return res.status(500).json({
                ok: false,
                error: 'Error interno del servidor'
            });
        }
    }

    // Actualizar estado de asistencia de múltiples estudiantes a la vez
    async updateMultipleAttendanceRecords(req: Request, res: Response) {
        try {
            const data = updateMultipleAttendanceRecordsSchema.parse(req.body);
            
            const result = await this.service.updateMultipleAttendanceRecords(data);
            
            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    ok: false,
                    error: error.errors
                });
            }
            
            console.error('Error en updateMultipleAttendanceRecords:', error);
            return res.status(500).json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error interno del servidor'
            });
        }
    }
}
