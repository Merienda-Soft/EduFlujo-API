import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';

export const courseRouter = (() => {
  const router = Router();
  const controller = new CourseController();
  
  // Routes for course
  router.get('/', controller.getAllCourses.bind(controller)); 
  router.get('/:id', controller.getCourseById.bind(controller)); 
  router.post('/', controller.createCourse.bind(controller)); 
  router.put('/:id', controller.updateCourse.bind(controller)); 
  router.delete('/:id', controller.deleteCourse.bind(controller)); 
  router.get('/degree/:degreeId', controller.getCoursesByDegree.bind(controller)); 
  router.get('/curriculum/:courseId', controller.getCourseWithCurriculum.bind(controller)); 
  router.put('/activate/:id', controller.activatedCourse.bind(controller));

  return router;
})();