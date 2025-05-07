import { Router } from 'express';
import { TutorStudentController } from '../controllers/tutorStudent.controller';

export const tutorStudentRouter = (() => {
    const router = Router();
    const controller = new TutorStudentController();

    // Ruta para obtener cursos y materias (managementId como query parameter)
    router.get('/:userId/:role/courses-subjects', controller.getCoursesAndSubjects.bind(controller));
    router.get('/:value', controller.getTutorsByStatus.bind(controller));
    router.post('/request', controller.TutorshipRequest.bind(controller));
    router.post('/', controller.createTutor.bind(controller));
    router.put('/', controller.updateTutor.bind(controller));
    router.get('/email/:email', controller.getTutorByEmail.bind(controller));
    router.get('/student/email/:email', controller.getStudentByEmail.bind(controller));
    router.get('/course/:courseId', controller.getStudentsByCourseId.bind(controller));

    return router;
})();
