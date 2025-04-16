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
    
    async createTutor(tutorData: {
        name: string;
        lastname: string;
        second_lastname: string;
        gender: string;
        ci: string;
        birth_date: string;
        email: string;
        pais: string;
        departamento: string;
        provincia: string;
        localidad: string;
        url_imagefront: string;
        url_imageback: string;
      }) {
        return await this.db.$transaction(async (transaction) => {
          const countryName = tutorData.pais?.trim().toUpperCase() || 'NINGUNO';
          const departmentName = tutorData.departamento?.trim().toUpperCase() || 'NINGUNO';
          const provinceName = tutorData.provincia?.trim().toUpperCase() || 'NINGUNO';
          const townName = tutorData.localidad?.trim().toUpperCase() || 'NINGUNO';
      
          // Register or get country
          let country = await transaction.country.findFirst({
            where: { country: countryName },
          });
      
          if (!country) {
            country = await transaction.country.create({
              data: { country: countryName },
            });
          }
      
          // Register or get department (related to country)
          let department = await transaction.departament.findFirst({
            where: {
              departament: departmentName,
              country_id: country.id,
            },
          });
      
          if (!department) {
            department = await transaction.departament.create({
              data: {
                departament: departmentName,
                country_id: departmentName === 'NINGUNO' ? 1 : country.id,
              },
            });
          }
      
          // Register or get province (related to department)
          let province = await transaction.province.findFirst({
            where: {
              province: provinceName,
              departament_id: department.id,
            },
          });
      
          if (!province) {
            province = await transaction.province.create({
              data: {
                province: provinceName,
                departament_id: provinceName === 'NINGUNO' ? 1 : department.id,
              },
            });
          }
      
          // Register or get town (related to province)
          let town = await transaction.town.findFirst({
            where: {
              town: townName,
              province_id: province.id,
            },
          });
      
          if (!town) {
            town = await transaction.town.create({
              data: {
                town: townName,
                province_id: townName === 'NINGUNO' ? 1 : province.id,
              },
            });
          }
      
          const existingPerson = await transaction.person.findFirst({
            where: { email: tutorData.email },
          });
      
          if (existingPerson) {
            throw new Error('El tutor ya existe con el correo proporcionado.');
          }

          const person = await transaction.person.create({
            data: {
              name: tutorData.name,
              lastname: tutorData.lastname,
              second_lastname: tutorData.second_lastname,
              gender: tutorData.gender,
              ci: tutorData.ci || null,
              birth_date: tutorData.birth_date ? new Date(tutorData.birth_date) : null,
              email: tutorData.email,
              status: 1, 
              town_id: town.id, 
            },
          });
 
          const tutor = await transaction.tutor.create({
            data: {
              id: person.id, 
              status: 2, // 0: inactive, 1: active, 2: pending
              url_imagefront: tutorData.url_imagefront,
              url_imageback: tutorData.url_imageback,
            },
          });
      
          return {
            message: 'Tutor creado exitosamente.',
            tutor,
            person,
            location: { country, department, province, town },
          };
        });
    }

    async TutorshipRequest(requestData: {
        tutorId: number;
        studentIds: number[];
        relacion: string;
        value: number; // accept: 1, cancel: 0
      }) {
        return await this.db.$transaction(async (transaction) => {
          const { tutorId, studentIds, relacion, value } = requestData;

          const tutor = await transaction.tutor.findUnique({
            where: { id: tutorId },
            include: {
              person: true, 
            },
          });
      
          if (!tutor) {
            throw new Error('El tutor no existe.');
          }

          await transaction.tutor.update({
            where: { id: tutorId },
              data: {
              status: value, 
            },
          });
      
          if (value === 1) {
            const createdTutorships = [];
            for (const studentId of studentIds) {
              const student = await transaction.student.findUnique({
                where: { id: studentId },
                include: {
                  person: true,
                },
              });
      
              if (!student) {
                throw new Error(`El estudiante con ID ${studentId} no existe.`);
              }
      
              const tutorship = await transaction.tutorship.create({
                data: {
                  tutor_id: tutorId,
                  student_id: studentId,
                  relacion: relacion,
                },
              });
      
              createdTutorships.push({
                tutor: {
                  id: tutor.id,
                  name: tutor.person.name,
                  lastname: tutor.person.lastname,
                  second_lastname: tutor.person.second_lastname,
                },
                student: {
                  id: student.id,
                  name: student.person.name,
                  lastname: student.person.lastname,
                  second_lastname: student.person.second_lastname,
                },
                relacion,
              });
            }
      
            return {
              message: 'Tutoría creada exitosamente.',
              tutorships: createdTutorships,
            };
          } else {
            return {
              message: `Se canceló la tutoría de: ${tutor.person.name} ${tutor.person.lastname} ${tutor.person.second_lastname}.`,
            };
          }
        });
    }

    async getTutorsByStatus(value: number) {
        return await this.db.tutor.findMany({
          where: {
            status: value, // status: 0: inactive, 1: active, 2: pending
          },
          include: {
            person: {
              select: {
                name: true,
                lastname: true,
                second_lastname: true,
                ci: true,
                email: true,
              },
            },
            students: {
              include: {
                student: {
                  include: {
                    person: {
                      select: {
                        name: true,
                        lastname: true,
                        second_lastname: true,
                        ci: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
    }
}
