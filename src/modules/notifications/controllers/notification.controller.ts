import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto, UpdateNotificationStatusDto } from '../dtos/notification.dto';

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    async createNotification(req: Request, res: Response) {
        try {
            const data: CreateNotificationDto = req.body;
            const notification = await this.notificationService.createNotification(data);
            res.status(201).json(notification);
        } catch (error) {
            res.status(500).json({
                message: 'Error al crear la notificación',
                error: error.message
            });
        }
    }

    async updateNotificationStatus(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const data: UpdateNotificationStatusDto = req.body;
            const notification = await this.notificationService.updateNotificationStatus(id, data);
            res.json(notification);
        } catch (error) {
            res.status(500).json({
                message: 'Error al actualizar el estado de la notificación',
                error: error.message
            });
        }
    }

    async getNotificationsByPersonId(req: Request, res: Response) {
        try {
            const personId = parseInt(req.params.personId);
            const notifications = await this.notificationService.getNotificationsByPersonId(personId);
            res.json(notifications);
        } catch (error) {
            res.status(500).json({
                message: 'Error al obtener las notificaciones',
                error: error.message
            });
        }
    }

    async getUnreadNotificationsCount(req: Request, res: Response) {
        try {
            const personId = parseInt(req.params.personId);
            const count = await this.notificationService.getUnreadNotificationsCount(personId);
            res.json({ count });
        } catch (error) {
            res.status(500).json({
                message: 'Error al obtener el conteo de notificaciones no leídas',
                error: error.message
            });
        }
    }

    async getNotificationsByEmail(req: Request, res: Response) {
        try {
            const { email } = req.params;
            const notifications = await this.notificationService.getNotificationsByEmail(email);
            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error al obtener las notificaciones',
                error: error.message
            });
        }
    }
} 