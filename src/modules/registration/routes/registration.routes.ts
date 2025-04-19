import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';

export const registrationRouter = (() => {
  const router = Router();
  const controller = new RegistrationController();

  // Routes for registration
  router.post('/', controller.registerStudents.bind(controller));
  router.put('/', controller.updateStudent.bind(controller));
  router.get('/course/:courseId', controller.getStudentsByCourseId.bind(controller));

  return router;
})();