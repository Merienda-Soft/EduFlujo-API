import { Router } from 'express';
import { getStudentCredentialsController } from '../controllers/credentials.controller';

const router = Router();

/**
 * Route to fetch student credentials based on management and course ID.
 */
router.get('/credentials', getStudentCredentialsController);

export default router;