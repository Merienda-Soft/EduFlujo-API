import { Router } from 'express';
import { ProfessorController } from '../controllers/professor.controller';

export const professorsRouter = (() => {
    const router = Router();
    const professorController = new ProfessorController();
    
    router.get('/:email', professorController.getProfessorByEmail.bind(professorController));

    return router;
})();
