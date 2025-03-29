import { z } from 'zod';

//DTO Degree
export const createDegreeSchema = z.object({
  degree: z.string().min(1, "El nombre del grado es requerido")
});

export type CreateDegreeDto = z.infer<typeof createDegreeSchema>;

//DTO de respuesta
export class DegreeResponseDto {
  constructor(
    public readonly _id: number,
    public readonly degree: string
  ) {}

  static fromEntity(entity: any): DegreeResponseDto {
    return new DegreeResponseDto(
      entity._id,
      entity.degree
    );
  }
}