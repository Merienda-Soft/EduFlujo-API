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
}
