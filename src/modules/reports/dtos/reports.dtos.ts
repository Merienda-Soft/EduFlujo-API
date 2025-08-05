import { z } from 'zod';

export const attendanceReportSchema = z.object({
    courseId: z.number().int().positive('El ID del curso debe ser un número positivo'),
    subjectId: z.number().int().positive('El ID de la materia debe ser un número positivo'),
    professorId: z.number().int().positive('El ID del profesor debe ser un número positivo'),
    managementId: z.number().int().positive('El ID de la gestión debe ser un número positivo'),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

export type AttendanceReportRequest = z.infer<typeof attendanceReportSchema>;