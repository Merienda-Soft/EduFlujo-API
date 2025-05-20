import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();
const notificationController = new NotificationController();

// Crear una nueva notificación
router.post('/', notificationController.createNotification.bind(notificationController));

// Actualizar el estado de una notificación
router.put('/:id/status', notificationController.updateNotificationStatus.bind(notificationController));

// Obtener notificaciones por ID de persona
router.get('/person/:personId', notificationController.getNotificationsByPersonId.bind(notificationController));

// Obtener conteo de notificaciones no leídas
router.get('/person/:personId/unread', notificationController.getUnreadNotificationsCount.bind(notificationController));

// Get notifications by email
router.get('/person/email/:email', notificationController.getNotificationsByEmail.bind(notificationController));

export default router;