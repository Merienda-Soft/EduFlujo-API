import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
    private service = new AuthService();
    
    async login(req: Request, res: Response) {
        const { email, password } = req.body;
        const result = await this.service.login(email, password);
        res.status(200).json(result);
    }
}
