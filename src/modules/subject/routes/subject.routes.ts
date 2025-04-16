import { Router } from 'express';
import { SubjectController } from '../controllers/subject.controllers';

export const subjectRouter = (() => {
  const router = Router();
  const controller = new SubjectController();

  // Rutas para la gestión de materias
  router.get('/', controller.getAllSubjects.bind(controller)); // Obtener todas las materias
  router.post('/', controller.createSubject.bind(controller)); // Crear una nueva materia
  router.delete('/:id', controller.deleteSubject.bind(controller)); // Eliminar una materia por ID

  return router;
})();