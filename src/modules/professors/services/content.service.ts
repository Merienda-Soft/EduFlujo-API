import Database from '../../../shared/database/connection';

export class ContentService {
    private db = Database.getInstance();

    async submitContent(courseId: number, subjectId: number, managementId: number, file: { name: string; url: string }, created_by?: number) {
        return await this.db.$transaction(async (tx) => {
            // Verificar que el curso existe
            const course = await tx.course.findUnique({
                where: {
                    id: courseId,
                    status: 1,
                }
            });

            if (!course) {
                throw new Error('Curso no encontrado');
            }

            // Verificar que la materia existe
            const subject = await tx.subject.findUnique({
                where: {
                    id: subjectId,
                    status: 1,
                }
            });

            if (!subject) {
                throw new Error('Materia no encontrada');
            }

            // Verificar que la gestión existe
            const management = await tx.management.findUnique({
                where: {
                    id: managementId,
                    status: 1,
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
                    last_update: new Date(),
                    status: 1,
                    created_by: created_by || null,
                }
            });
        });
    }

    async getContent(courseId: number, subjectId: number, managementId: number) {
        return await this.db.content.findMany({
            where: {
                course_id: courseId,
                subject_id: subjectId,
                management_id: managementId,
                status: 1,
            },
            orderBy: {
                submitted_at: 'desc'
            }
        });
    }

    async deleteContent(id: number, deleted_by?: number) {
        return await this.db.content.update({
            where: { id },
            data: {
                status: 0,
                updated_by: deleted_by || null,
            }
        });
    }
} 