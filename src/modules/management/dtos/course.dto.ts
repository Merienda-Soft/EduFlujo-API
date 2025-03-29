import { z } from 'zod';
import { DegreeResponseDto } from './degree.dto';

// DTO Course
export const createCourseSchema = z.object({
  parallel: z.string(),
  course: z.string().min(1, "El nombre del curso es requerido"),
  degree_id: z.number().int().positive("Se requiere un ID de grado válido").optional()
});

export type CreateCourseDto = z.infer<typeof createCourseSchema>;

// DTO de respuesta
export class CourseResponseDto {
  constructor(
    public readonly _id: number,
    public readonly parallel: string,
    public readonly course: string,
    public readonly last_update: Date,
    public readonly degree?: DegreeResponseDto
  ) {}

  static fromEntity(entity: any): CourseResponseDto {
    return new CourseResponseDto(
      entity._id,
      entity.parallel,
      entity.course,
      entity.last_update,
      entity.degree ? DegreeResponseDto.fromEntity(entity.degree) : undefined
    );
  }
}