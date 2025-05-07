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

    async createTutorship(req: Request, res: Response) {
        try {
          const tutorData = req.body;
          const tutor = await this.service.createTutorWithTutorships(tutorData);
          res.status(201).json(tutor);
        } catch (error) {
          this.handleError(res, error);
        }
    }

    async getStudentIdByRudeOrCi(req: Request, res: Response) {
      try {
          const { rude, ci } = req.body;
          const result = await this.service.getStudentIdByRudeOrCi({ rude, ci });
          res.status(200).json(result);
      } catch (error) {
          this.handleError(res, error);
      }
    }

    async updateTutor(req: Request, res: Response) {
      try {
        const { tutorId, status } = req.body;
        const result = await this.service.updateTutorStatus(tutorId, status);
        res.status(200).json(result);
      } catch (error) {
          this.handleError(res, error);
      }
    }

    async getTutorByEmail(req: Request, res: Response) {
      try {
          const { email } = req.params;
  
          if (!email) {
              return res.status(400).json({
                  message: 'Se requiere el email del tutor.',
              });
          }
  
          const tutor = await this.service.getTutorByEmail(email);
          res.status(200).json(tutor);
      } catch (error) {
          this.handleError(res, error);
      }
    }

    async getStudentByEmail(req: Request, res: Response) {
      try {
          const { email } = req.params;
  
          if (!email) {
              return res.status(400).json({
                  message: 'Se requiere el email del estudiante.',
              });
          }
  
          const student = await this.service.getStudentByEmail(email);
          res.status(200).json(student);
      } catch (error) {
          this.handleError(res, error);
      }
    }
    
    async getStudentsByCourseId(req: Request, res: Response) {
      try {
          const { courseId } = req.params;
  
          if (!courseId) {
              return res.status(400).json({
                  message: 'Se requiere el ID del curso.',
              });
          }
  
          const students = await this.service.getStudentsByCourseId(Number(courseId));
          res.status(200).json(students);
      } catch (error) {
          this.handleError(res, error);
      }
  }
    
    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
}
