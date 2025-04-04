import { Request, Response } from 'express';
import { ManagementService } from '../services/management.service';

export class ManagementController {
    private service = new ManagementService();

    async getManagements(req: Request, res: Response) {
        try {
            const managements = await this.service.getManagements();

            if (!managements) {
                res.status(404).json({ error: 'No se encontraron managements', success: false });
                return;
            }

            res.status(200).json({ managements, success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    private handleError(res: Response, error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor', success: false });
    }
}

