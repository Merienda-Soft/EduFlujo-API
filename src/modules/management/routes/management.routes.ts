import { Router } from 'express';
import { ManagementController } from '../controllers/management.controller';
import { EnvironmentController } from '../controllers/environment.controller';

export const managementRouter = (() => {
  const router = Router();
  const controller = new ManagementController();
  const econtroller = new EnvironmentController();
  
  // Rutas para la gestión de entorno
  router.get('/year', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.delete('/:id', controller.delete.bind(controller));
  router.post('/', econtroller.createAcademicYear.bind(econtroller));
  
  return router;
})();