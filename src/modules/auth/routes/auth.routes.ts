import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const authRouter = (() => {
    const router = Router();
    const authController = new AuthController();

    router.post('/login', authController.login.bind(authController));

    return router;
})();
