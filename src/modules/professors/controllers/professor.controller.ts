import { Request, Response } from 'express';
import { ProfessorService } from '../services/professor.service';

export class ProfessorController {
    private service = new ProfessorService();
    
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

    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor', success: false });
    }
}
