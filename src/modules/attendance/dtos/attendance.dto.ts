import { z } from 'zod';

// Schema para crear registro de asistencia
export const createAttendanceSchema = z.object({
    attendance_date: z.coerce.date().default(() => new Date()),
    quarter: z.string().optional(),
    management_id: z.number().int().positive("El ID del período lectivo es requerido"),
    subject_id: z.number().int().positive("El ID de la materia es requerido"),
    professor_id: z.number().int().positive("El ID del profesor es requerido"),
    course_id: z.number().int().positive("El ID del curso es requerido")
});

export type CreateAttendanceDto = z.infer<typeof createAttendanceSchema>;

// Schema para crear registros individuales de asistencia de estudiantes
export const createAttendanceRecordSchema = z.object({
    attendance_id: z.number().int().positive("El ID del registro de asistencia es requerido"),
    student_id: z.number().int().positive("El ID del estudiante es requerido"),
    status_attendance: z.string().max(10, "El estado no puede tener más de 10 caracteres").default("P")
        .describe("P: Presente, A: Ausente, T: Tardanza, J: Justificado")
});

export type CreateAttendanceRecordDto = z.infer<typeof createAttendanceRecordSchema>;

// Schema para registrar múltiples asistencias de estudiantes a la vez
export const registerAttendanceSchema = z.object({
    attendance: createAttendanceSchema,
    records: z.array(
        z.object({
            student_id: z.number().int().positive("El ID del estudiante es requerido"),
            status_attendance: z.string().max(10).default("P")
        })
    )
});

export type RegisterAttendanceDto = z.infer<typeof registerAttendanceSchema>;

// Schema para actualizar un registro de asistencia
export const updateAttendanceRecordSchema = z.object({
    status_attendance: z.string().max(10, "El estado no puede tener más de 10 caracteres")
        .describe("P: Presente, A: Ausente, T: Tardanza, J: Justificado")
});

export type UpdateAttendanceRecordDto = z.infer<typeof updateAttendanceRecordSchema>;

// Schema para actualizar varios registros de asistencia a la vez
export const updateMultipleAttendanceRecordsSchema = z.object({
    attendance_id: z.number().int().positive("El ID del registro de asistencia es requerido"),
    students: z.array(
        z.object({
            student_id: z.number().int().positive("El ID del estudiante es requerido"),
            status_attendance: z.string().max(10).describe("P: Presente, A: Ausente, T: Tardanza, J: Justificado")
        })
    )
});

export type UpdateMultipleAttendanceRecordsDto = z.infer<typeof updateMultipleAttendanceRecordsSchema>;
