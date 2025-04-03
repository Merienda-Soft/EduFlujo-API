import { Router } from 'express';
import managementRouter from './management/routes';
import tasksRouter from './tasks/routes';

const router = Router();

// Usa el prefijo base aquí
//router.use('/management', managementRouter);
router.use('/tasks', tasksRouter);

export default router;