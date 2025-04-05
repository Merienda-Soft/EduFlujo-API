import Database from '../../../shared/database/connection';

export class TutorStudentService {
    private db = Database.getInstance();

    async getStudentCoursesAndSubjects(userId: number, role: string, managementId: number) {
        try {
            if (role === 'student') {
                const studentData = await this.db.student.findUnique({
                    where: { id: userId },
                    include: {
                        person: true,
                        registrations: {
                            where: {
                                management_id: managementId
                            },
                            include: {
                                course: {
                                    include: {
                                        assignments: {
                                            include: {
                                                subject: true,
                                                professor: {
                                                    include: {
                                                        person: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                management: true
                            }
                        }
                    }
                });

                if (!studentData) {
                    return null;
                }

                // Procesar los datos para una estructura más limpia
                return {
                    student: {
                        id: studentData.id,
                        name: studentData.person.name,
                        lastname: studentData.person.lastname,
                        second_lastname: studentData.person.second_lastname
                    },
                    courses: studentData.registrations.map(reg => ({
                        course: reg.course,
                        management: reg.management,
                        subjects: reg.course.assignments.map(assign => ({
                            id: assign.subject.id,
                            name: assign.subject.subject,
                            professor: {
                                id: assign.professor.id,
                                name: assign.professor.person.name,
                                lastname: assign.professor.person.lastname,
                                second_lastname: assign.professor.person.second_lastname
                            }
                        }))
                    }))
                };

            } else if (role === 'tutor') {
                const tutorData = await this.db.tutor.findUnique({
                    where: { id: userId },
                    include: {
                        students: {
                            include: {
                                student: {
                                    include: {
                                        person: true,
                                        registrations: {
                                            where: {
                                                management_id: managementId
                                            },
                                            include: {
                                                course: {
                                                    include: {
                                                        assignments: {
                                                            include: {
                                                                subject: true,
                                                                professor: {
                                                                    include: {
                                                                        person: true
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                management: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (!tutorData) {
                    return null;
                }

                return {
                    tutor: {
                        id: tutorData.id
                    },
                    students: tutorData.students.map(tutorship => ({
                        student: {
                            id: tutorship.student.id,
                            name: tutorship.student.person.name,
                            lastname: tutorship.student.person.lastname,
                            second_lastname: tutorship.student.person.second_lastname
                        },
                        courses: tutorship.student.registrations.map(reg => ({
                            course: reg.course,
                            subjects: reg.course.assignments.map(assign => ({
                                id: assign.subject.id,
                                name: assign.subject.subject,
                                professor: {
                                    id: assign.professor.id,
                                    name: assign.professor.person.name,
                                    lastname: assign.professor.person.lastname,
                                    second_lastname: assign.professor.person.second_lastname
                                }
                            }))
                        }))
                    }))
                };
            }

            throw new Error('Rol no válido');
        } catch (error) {
            console.error('Error en getStudentCoursesAndSubjects:', error);
            throw error;
        }
    }
}
