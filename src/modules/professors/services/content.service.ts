import Database from '../../../shared/database/connection';

export class ContentService {
    private db = Database.getInstance();

    async submitContent(courseId: number, subjectId: number, managementId: number, file: { name: string; url: string }) {
        return await this.db.$transaction(async (tx) => {
            // Verificar que el curso existe
            const course = await tx.course.findUnique({
                where: {
                    id: courseId
                }
            });

            if (!course) {
                throw new Error('Curso no encontrado');
            }

            // Verificar que la materia existe
            const subject = await tx.subject.findUnique({
                where: {
                    id: subjectId
                }
            });

            if (!subject) {
                throw new Error('Materia no encontrada');
            }

            // Verificar que la gestión existe
            const management = await tx.management.findUnique({
                where: {
                    id: managementId
                }
            });

            if (!management) {
                throw new Error('Gestión no encontrada');
            }

            // Crear nuevo contenido
            return await tx.content.create({
                data: {
                    course_id: courseId,
                    subject_id: subjectId,
                    management_id: managementId,
                    file: file,
                    submitted_at: new Date(),
                    last_update: new Date()
                }
            });
        });
    }

    async getContent(courseId: number, subjectId: number, managementId: number) {
        return await this.db.content.findMany({
            where: {
                course_id: courseId,
                subject_id: subjectId,
                management_id: managementId
            },
            orderBy: {
                submitted_at: 'desc'
            }
        });
    }

    async deleteContent(id: number) {
        return await this.db.content.delete({
            where: {
                id: id
            }
        });
    }
} 