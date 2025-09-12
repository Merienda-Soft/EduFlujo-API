import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';

export class RegistrationController {
  private registrationService = new RegistrationService();

  async registerStudents(req: Request, res: Response) {
    try {
      const { dataAssignment, registrationData, created_by } = req.body;
      
      const result = await this.registrationService.registerStudents(dataAssignment, {
        ...registrationData,
        created_by,
      });

      res.status(201).json(result);

    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateStudent(req: Request, res: Response) {
    try {
      const { registrationUpdates, updated_by } = req.body;
      console.log('RegistrationUpdates Controller', registrationUpdates);

      // Agregar updated_by a cada update
      const updatesWithAudit = registrationUpdates.map((update: any) => ({
        ...update,
        updated_by,
      }));

      const result = await this.registrationService.updateStudent(updatesWithAudit);

      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getStudentsByCourseId(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const result = await this.registrationService.getStudentsByCourseId(Number(courseId));

      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}