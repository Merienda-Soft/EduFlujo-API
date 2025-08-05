import { Request, Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { attendanceReportSchema } from '../dtos/reports.dtos';
import { ZodError } from 'zod';

export class ReportsController {
    private service = new ReportsService();

    async generateAttendanceReport(req: Request, res: Response) {
        try {
            const { courseId, subjectId, professorId, managementId } = req.params;
            const { startDate, endDate } = req.query;

            // Validar parámetros
            const validatedData = attendanceReportSchema.parse({
                courseId: Number(courseId),
                subjectId: Number(subjectId),
                professorId: Number(professorId),
                managementId: Number(managementId),
                startDate: startDate as string,
                endDate: endDate as string
            });

            const result = await this.service.generateAttendanceReport(
                validatedData.courseId,
                validatedData.subjectId,
                validatedData.professorId,
                validatedData.managementId,
                validatedData.startDate,
                validatedData.endDate
            );

            res.status(200).json(result);

        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    ok: false,
                    error: 'Datos de entrada inválidos',
                    details: error.errors
                });
            }

            console.error('Error in generateAttendanceReport:', error);
            res.status(500).json({
                ok: false,
                error: error.message || 'Error interno del servidor'
            });
        }
    }

    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ 
            ok: false, 
            error: 'Error interno del servidor' 
        });
    }
}