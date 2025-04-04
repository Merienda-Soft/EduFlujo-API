import { Router } from 'express';
import { ManagementController } from '../controllers/management.controller';

export const managementRouter = (() => {
    const router = Router();
    const managementController = new ManagementController();

    router.get('/', managementController.getManagements.bind(managementController));

    return router;
})();
