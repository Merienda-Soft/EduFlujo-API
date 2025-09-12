import { Request, Response } from 'express';
import { ProfessorService } from '../services/professor.service';

export class ProfessorController {
    private service = new ProfessorService();

    async getAllProfessors(req: Request, res: Response) {
        try {
            const professors = await this.service.getAllProfessors();

            if (!professors) {
                res.status(404).json({ error: 'Profesor no encontrado', success: false });
                return;
            }

            res.status(200).json({ professors, success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }
    
    async getProfessorByEmail(req: Request, res: Response) {
        try {
            const { email } = req.params;
            const professor = await this.service.getProfessorByEmail(email);

            if (!professor) {
                res.status(404).json({ error: 'Profesor no encontrado', success: false });
                return;
            }

            res.status(200).json({ professor, success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async createProfessor(req: Request, res: Response) {
        try {
            const professorData = req.body;
            const { created_by } = req.body;

            const professor = await this.service.createProfessor({
                ...professorData,
                created_by,
            });
            res.status(201).json({ professor, success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor', success: false });
    }
}
