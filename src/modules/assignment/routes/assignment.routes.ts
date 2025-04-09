import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';

export const assignmentRouter = (() => {
    const router = Router();
    const controller = new AssignmentController();

    // Routes for assignment
    router.get('/course/:courseId', controller.getAssignmentsByCourse.bind(controller)); 
    router.post('/', controller.createAssignments.bind(controller)); 
    router.put('/', controller.updateAssignments.bind(controller)); 
    router.put('/reactivate', controller.reactivateAssignments.bind(controller)); 
    return router;
})()