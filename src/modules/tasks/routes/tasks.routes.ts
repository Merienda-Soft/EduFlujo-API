import { Router } from 'express';
import { TasksController } from '../controllers/tasks.controller';

export const tasksRouter = (() => {
    const router = Router();
    const tController = new TasksController();

    // Rutas para tareas
    router.post('/', tController.create.bind(tController));
    router.get('/', tController.getAll.bind(tController));
    router.get('/:id', tController.getById.bind(tController));
    router.get('/:id/assignments', tController.getTaskByIdWithAssignments.bind(tController));
    router.put('/:id', tController.update.bind(tController));
    router.post('/:id', tController.delete.bind(tController));

    // Rutas para calificaciones
    router.post('/:taskId/grade', tController.gradeTask.bind(tController));

    // Rutas para filtros específicos
    router.get('/student/:studentId/course/:courseId/subject/:subjectId/management/:managementId', tController.getTasksByStudent.bind(tController));
    router.get('/professor/:professorId/course/:courseId/subject/:subjectId/management/:managementId', tController.getTasksByProfessorCourseSubjectManagement.bind(tController));

    return router;
})();
