import { Router } from 'express';
import { TutorStudentController } from '../controllers/tutorStudent.controller';

export const tutorStudentRouter = (() => {
    const router = Router();
    const controller = new TutorStudentController();

    // Ruta para obtener cursos y materias (managementId como query parameter)
    router.get('/:userId/:role/courses-subjects', controller.getCoursesAndSubjects.bind(controller));

    return router;
})();
