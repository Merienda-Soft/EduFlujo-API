import { z } from 'zod';

// Schema para crear la tarea base
export const createTaskSchema = z.object({
  // Campos para Task
  name: z.string().min(1, "El nombre de la tarea es requerido"),
  description: z.string().optional(),
  weight: z.number().int().min(1).max(100).optional()
    .describe("Peso de la tarea (1-100)"),
  is_autoevaluation: z.number().int().min(0).max(1).optional()
    .describe("Indica si es autoevaluación (0: No, 1: Sí)"),
  dimension_id: z.number().int().positive("El ID de la dimensión es requerido"),
  management_id: z.number().int().positive("El ID del período lectivo es requerido"),
  professor_id: z.number().int().positive("El ID del profesor es requerido"),
  subject_id: z.number().int().positive("El ID de la materia es requerido"),
  course_id: z.number().int().positive("El ID del curso es requerido"),
  quarter: z.string().max(10).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: z.number().int().min(0).max(1).optional()
    .describe("Indica si la tarea está activa (0: Eliminado, 1: Activo)").default(1),
});

// Schema para la asignación de tarea a estudiantes
export const taskAssignmentSchema = z.object({
  student_id: z.number().int().positive("El ID del estudiante es requerido"),
  qualification: z.string().max(10).optional(),
  assigned_date: z.coerce.date().optional().default(new Date()),
  completed_date: z.coerce.date().optional()
});

// Schema combinado para crear tarea y asignarla
export const createTaskWithAssignmentsSchema = z.object({
  task: createTaskSchema,
  assignments: z.array(taskAssignmentSchema).optional()
}).refine(data => {
  if (data.task.start_date && data.task.end_date) {
    return data.task.end_date > data.task.start_date;
  }
  return true;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["task.end_date"]
});

// Schema para las calificaciones múltiples
export const gradeTaskSchema = z.object({
    students: z.array(z.object({
        student_id: z.number().int().positive("El ID del estudiante es requerido"),
        qualification: z.string().max(10, "La calificación no puede exceder 10 caracteres")
    }))
});

// Types exportados
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type TaskAssignmentDto = z.infer<typeof taskAssignmentSchema>;
export type CreateTaskWithAssignmentsDto = z.infer<typeof createTaskWithAssignmentsSchema>;
export type GradeTaskDto = z.infer<typeof gradeTaskSchema>;

// DTO de respuesta
export class TaskResponseDto {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly description: string,
    public readonly weight: number,
    public readonly is_autoevaluation: number,
    public readonly dimension_id: number,
    public readonly management_id: number,
    public readonly professor_id: number,
    public readonly subject_id: number,
    public readonly course_id: number,
    public readonly quarter: string,
    public readonly create_date: Date,
    public readonly last_update: Date,
    public readonly start_date: Date,
    public readonly end_date: Date,
    public readonly status: number,
    public readonly delete_at: Date | null,
    public readonly assignments: TaskAssignmentResponseDto[]
  ) { }

  static fromEntity(entity: any): TaskResponseDto {
    return new TaskResponseDto(
      entity.id,
      entity.name,
      entity.description,
      entity.weight,
      entity.is_autoevaluation,
      entity.dimension_id,
      entity.management_id,
      entity.professor_id,
      entity.subject_id,
      entity.course_id,
      entity.quarter,
      entity.create_date,
      entity.last_update,
      entity.start_date,
      entity.end_date,
      entity.status,
      entity.delete_at,
      entity.assignments?.map(assignment =>
        TaskAssignmentResponseDto.fromEntity(assignment)
      ) || []
    );
  }
}

export class TaskAssignmentResponseDto {
  constructor(
    public readonly id: number,
    public readonly student_id: number,
    public readonly qualification: string,
    public readonly assigned_date: Date,
    public readonly completed_date: Date,
    public readonly task_id: number
  ) { }

  static fromEntity(entity: any): TaskAssignmentResponseDto {
    return new TaskAssignmentResponseDto(
      entity.id,
      entity.student_id,
      entity.qualification,
      entity.assigned_date,
      entity.completed_date,
      entity.task_id
    );
  }
}

