import Database from '../../../shared/database/connection';

export class StudentService {
    private db = Database.getInstance();

    async getStudentsByCourse(courseId: number) {
        try {
            const students = await this.db.registration.findMany({
                where: {
                    course_id: courseId
                },
                include: {
                    student: {
                        include: {
                            person: true
                        }
                    }
                }
            });

            // Transformar los datos para una respuesta más limpia
            return students.map(registration => ({
                student_id: registration.student_id,
                registration_id: registration.id,
                name: registration.student?.person?.name || '',
                lastname: registration.student?.person?.lastname || '',
                second_lastname: registration.student?.person?.second_lastname || '',
                matricula: registration.student?.matricula || '',
                email: registration.student?.person?.email || ''
            }));
        } catch (error) {
            console.error('Error al obtener estudiantes por curso:', error);
            throw new Error('Error al obtener estudiantes por curso');
        }
    }
} 