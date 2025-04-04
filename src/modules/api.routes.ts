import { Router } from 'express';
//import managementRouter from './management/routes';
import {tasksRouter, managementRouter} from './tasks/routes'; 
import authRouter from './auth/routes';
import professorsRouter from './professors/routes';

const router = Router();

// Usa el prefijo base aquí
//router.use('/management', managementRouter);
router.use('/tasks', tasksRouter);
router.use('/auth', authRouter);
router.use('/professors', professorsRouter);
router.use('/management', managementRouter);

export default router;