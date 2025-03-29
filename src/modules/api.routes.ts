import { Router } from 'express';
import managementRouter from './management/routes';

const router = Router();

// Usa el prefijo base aquí
router.use('/management', managementRouter);

export default router;