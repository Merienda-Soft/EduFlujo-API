import { z } from 'zod';
import { ManagementResponseDto } from './management.dto';
import { CourseResponseDto } from './course.dto';

// DTO Environment
export const createEnvironmentSchema = z.object({
  management_id: z.number().int().positive("ID de gestión debe ser positivo"),
  course_id: z.number().int().positive("ID de curso debe ser positivo"),
  status: z.number().int().min(0).max(1).default(1)
});

export type CreateEnvironmentDto = z.infer<typeof createEnvironmentSchema>;


// DTO de respuesta
export class EnvironmentResponseDto {
  constructor(
    public readonly _id: number,
    public readonly status: number,
    public readonly management_id?: number,
    public readonly course_id?: number
  ) {}

  static fromEntity(entity: any): EnvironmentResponseDto {
    return new EnvironmentResponseDto(
      entity._id,
      entity.status,
      entity.management_id,
      entity.course_id
    );
  }
}

// DTO de respuesta completa
export class EnvironmentWithRelationsDto {
  constructor(
    public readonly _id: number,
    public readonly status: number,
    public readonly management?: ManagementResponseDto,
    public readonly course?: CourseResponseDto
  ) {}

  static fromEntity(entity: any): EnvironmentWithRelationsDto {
    return new EnvironmentWithRelationsDto(
      entity._id,
      entity.status,
      entity.management ? ManagementResponseDto.fromEntity(entity.management) : undefined,
      entity.course ? CourseResponseDto.fromEntity(entity.course) : undefined
    );
  }
}

// DTO para listados
export class EnvironmentListDto {
  constructor(
    public readonly _id: number,
    public readonly status: string,
    public readonly management_year?: number,
    public readonly course_name?: string
  ) {}

  static fromEntity(entity: any): EnvironmentListDto {
    return new EnvironmentListDto(
      entity._id,
      entity.status === 1 ? 'Active' : 'Inactive',
      entity.management?.management,
      entity.course?.course
    );
  }
}