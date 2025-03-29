import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EnvironmentService } from '../services/environment.service';

export class EnvironmentController {
    private academicService: EnvironmentService;
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
        this.academicService = new EnvironmentService(this.prisma);
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