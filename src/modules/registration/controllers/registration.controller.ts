import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';

export class RegistrationController {
  private registrationService = new RegistrationService();

  async registerStudents(req: Request, res: Response) {
    try {
      const { dataAssignment, registrationData } = req.body;
      const result = await this.registrationService.registerStudents(dataAssignment, registrationData);

      res.status(201).json(result);

    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateStudent(req: Request, res: Response) {
    try {
      const { registrationUpdates } = req.body;

      const result = await this.registrationService.updateStudent(registrationUpdates);

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