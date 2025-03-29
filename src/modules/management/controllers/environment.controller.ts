import { Request, Response } from 'express';
import { EnvironmentService } from '../services/environment.service';

export class EnvironmentController {
    private academicService: EnvironmentService;

    constructor() {
        this.academicService = new EnvironmentService();
    }

    async createAcademicYear(req: Request, res: Response) {
        try {
          const result = await this.academicService.createAcademicYearWithCourses(req.body);
          
          res.status(201).json({
            success: true,
            managementId: result.management.id,
            coursesAssigned: result.totalCourses,
            academicYear: result.management.management
          });
        } catch (error) {
          console.error('Error en transacción:', error);
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
    }
}