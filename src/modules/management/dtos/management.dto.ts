import { z } from 'zod';

//DTO Management
export const createManagementSchema = z.object({
  management: z.number().int().positive("El número de gestión debe ser positivo").optional(),
  status: z.number().int().min(0).max(3).default(1),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  first_quarter_start: z.coerce.date().optional(),
  first_quarter_end: z.coerce.date().optional(),
  second_quarter_start: z.coerce.date().optional(),
  second_quarter_end: z.string().length(10, "Debe tener 10 caracteres").optional(),
  third_quarter_start: z.string().length(10, "Debe tener 10 caracteres").optional(),
  third_quarter_end: z.string().length(10, "Debe tener 10 caracteres").optional()
}).refine(data => {
  if (data.start_date && data.end_date) {
    return data.end_date > data.start_date;
  }
  return true;
}, {
  message: "La fecha final debe ser posterior a la inicial",
  path: ["end_date"]
});

export type CreateManagementDto = z.infer<typeof createManagementSchema>;

// DTO de respuesta
export class ManagementResponseDto {
  constructor(
    public readonly _id: number,
    public readonly management?: number,
    public readonly status?: number,
    public readonly start_date?: Date,
    public readonly end_date?: Date,
    public readonly first_quarter_start?: Date,
    public readonly first_quarter_end?: Date,
    public readonly second_quarter_start?: Date,
    public readonly second_quarter_end?: string,
    public readonly third_quarter_start?: string,
    public readonly third_quarter_end?: string
  ) {}

  static fromEntity(entity: any): ManagementResponseDto {
    return new ManagementResponseDto(
      entity._id,
      entity.management,
      entity.status,
      entity.start_date,
      entity.end_date,
      entity.first_quarter_start,
      entity.first_quarter_end,
      entity.second_quarter_start,
      entity.second_quarter_end,
      entity.third_quarter_start,
      entity.third_quarter_end
    );
  }
}