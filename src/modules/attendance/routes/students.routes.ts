import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';

export const studentRouter = (() => {
    const router = Router();
    const controller = new StudentController();

    // Obtener estudiantes por curso
    router.get('/course/:courseId', controller.getStudentsByCourse.bind(controller));

    return router;
})(); 