import { Request, Response } from 'express';
import { TutorStudentService } from '../services/tutorStudent.service';

export class TutorStudentController {
    private service = new TutorStudentService();

    async getCoursesAndSubjects(req: Request, res: Response) {
        try {
            const { userId, role } = req.params;
            const { managementId } = req.query;
            
            if (!userId || !role || !managementId) {
                return res.status(400).json({
                    ok: false,
                    error: 'Se requiere el ID de usuario, rol y período lectivo activo'
                });
            }

            const result = await this.service.getStudentCoursesAndSubjects(
                Number(userId),
                role.toLowerCase(),
                Number(managementId)
            );

            if (!result) {
                return res.status(404).json({
                    ok: false,
                    error: 'No se encontraron datos para el usuario'
                });
            }

            res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({
                ok: false,
                error: error.message || 'Error interno del servidor'
            });
        }
    }

    async getTutorsByStatus(req: Request, res: Response) {
        try {
          const { value } = req.params;
    
          const tutors = await this.service.getTutorsByStatus(Number(value));
          res.status(200).json(tutors);
        } catch (error) {
          this.handleError(res, error);
        }
      }
    

    async TutorshipRequest(req: Request, res: Response) {
        try {
          const { tutorId, studentIds, relacion, value } = req.body;
    
          const result = await this.service.TutorshipRequest({
            tutorId: Number(tutorId),
            studentIds: studentIds.map((id: string) => Number(id)),
            relacion,
            value: Number(value),
          });
    
          res.status(200).json(result);
        } catch (error) {
          this.handleError(res, error);
        }
    }
    

    async createTutor(req: Request, res: Response) {
        try {
          const tutorData = req.body;
    
          const tutor = await this.service.createTutor(tutorData);
          res.status(201).json(tutor);
        } catch (error) {
          this.handleError(res, error);
        }
    }
    
    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
}
