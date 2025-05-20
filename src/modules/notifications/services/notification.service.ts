import Database from '../../../shared/database/connection';
import { CreateNotificationDto, UpdateNotificationStatusDto } from '../dtos/notification.dto';

export class NotificationService {
    private db = Database.getInstance();

    async createNotification(data: CreateNotificationDto) {
        return await this.db.notifications.create({
            data: {
                id_person_from: data.id_person_from,
                id_person_to: data.id_person_to,
                message: data.message,
                created_date: new Date(),
                status: 0
            }
        });
    }

    async updateNotificationStatus(id: number, data: UpdateNotificationStatusDto) {
        return await this.db.notifications.update({
            where: { id },
            data: {
                status: data.status,
                updated_at: new Date()
            }
        });
    }

    async getNotificationsByPersonId(personId: number) {
        return await this.db.notifications.findMany({
            where: {
                id_person_to: personId
            },
            orderBy: {
                created_date: 'desc'
            }
        });
    }

    async getUnreadNotificationsCount(personId: number) {
        return await this.db.notifications.count({
            where: {
                id_person_to: personId,
                status: 0
            }
        });
    }

    async getNotificationsByEmail(email: string) {
        console.log('Getting notifications for email:', email);
        
        // First find the person by email
        const person = await this.db.person.findFirst({
            where: { email }
        });

        console.log('Found person:', person);

        if (!person) {
            throw new Error('Person not found with the provided email');
        }

        // Check if the person is a tutor
        const tutor = await this.db.tutor.findUnique({
            where: { id: person.id }
        });

        console.log('Tutor check result:', tutor ? 'Is tutor' : 'Not tutor');

        let notifications = [];
        
        if (tutor) {
            // If it's a tutor, first get their students' IDs
            const tutorships = await this.db.tutorship.findMany({
                where: {
                    tutor_id: tutor.id
                },
                select: {
                    student_id: true
                }
            });

            const studentIds = tutorships.map(t => t.student_id);
            console.log('Student IDs for tutor:', studentIds);

            if (studentIds.length > 0) {
                notifications = await this.db.notifications.findMany({
                    where: {
                        id_person_to: {
                            in: studentIds
                        }
                    },
                    orderBy: {
                        created_date: 'desc'
                    }
                });
            }
        } else {
            // If it's not a tutor (student or professor), get their notifications directly
            notifications = await this.db.notifications.findMany({
                where: {
                    id_person_to: person.id
                },
                orderBy: {
                    created_date: 'desc'
                }
            });
        }

        console.log('Found notifications:', notifications);

        return {
            success: true,
            data: notifications
        };
    }
} 