import { Router } from 'express';
import { ManagementController } from '../controllers/management.controller';

export const managementRouter = (() => {
  const router = Router();
  const controller = new ManagementController();
  
  // Rutas para la gestión de entorno
  router.get('/', controller.getActive.bind(controller));
  router.get('/degree', controller.getDegree.bind(controller));
  router.get('/year', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));
  router.post('/', controller.createEnvironment.bind(controller));
  router.post('/clone', controller.cloneAcademicStructure.bind(controller));
  return router;
})();