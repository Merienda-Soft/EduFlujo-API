import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
    private service = new AuthService();
    
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await this.service.login(email, password);
            
            if (!result.ok) {
                return res.status(result.status).json({
                    ok: false,
                    error: result.error
                });
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('Error en el controlador de login:', error);
            res.status(500).json({ 
                ok: false,
                error: 'Error interno del servidor' 
            });
        }
    }
}
