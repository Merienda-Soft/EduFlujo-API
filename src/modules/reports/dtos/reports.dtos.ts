import { z } from "zod";

export const attendanceReportSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  subjectId: z
    .number()
    .int()
    .positive("El ID de la materia debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const customDateReportSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  subjectId: z
    .number()
    .int()
    .positive("El ID de la materia debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
  startDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "La fecha de inicio debe tener formato YYYY-MM-DD"
    ),
  endDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "La fecha de fin debe tener formato YYYY-MM-DD"
    ),
});

export const monthlyReportSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  subjectId: z
    .number()
    .int()
    .positive("El ID de la materia debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
  year: z
    .number()
    .int()
    .min(2020)
    .max(2030, "El año debe estar entre 2020 y 2030"),
  month: z.number().int().min(1).max(12, "El mes debe estar entre 1 y 12"),
});

export const yearlyReportSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  subjectId: z
    .number()
    .int()
    .positive("El ID de la materia debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
  year: z
    .number()
    .int()
    .min(2020)
    .max(2030, "El año debe estar entre 2020 y 2030"),
});

export const managementReportSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  subjectId: z
    .number()
    .int()
    .positive("El ID de la materia debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
});

export const centralizadorAnualSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
});

export const libroPedagogicoSchema = z.object({
  courseId: z
    .number()
    .int()
    .positive("El ID del curso debe ser un número positivo"),
  professorId: z
    .number()
    .int()
    .positive("El ID del profesor debe ser un número positivo"),
  managementId: z
    .number()
    .int()
    .positive("El ID de la gestión debe ser un número positivo"),
  month: z
    .number()
    .int()
    .min(1)
    .max(12, "El mes debe estar entre 1 y 12"),
});

export type AttendanceReportRequest = z.infer<typeof attendanceReportSchema>;
export type CustomDateReportRequest = z.infer<typeof customDateReportSchema>;
export type MonthlyReportRequest = z.infer<typeof monthlyReportSchema>;
export type YearlyReportRequest = z.infer<typeof yearlyReportSchema>;
export type ManagementReportRequest = z.infer<typeof managementReportSchema>;
export type CentralizadorAnualRequest = z.infer<
  typeof centralizadorAnualSchema
>;
export type LibroPedagogicoRequest = z.infer<typeof libroPedagogicoSchema>;
