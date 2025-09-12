import Database from '../../../shared/database/connection';
import { emailService } from './email.service';
import { AuthService } from '../../auth/services/auth.service';

export class RegistrationService {
  async registerStudents(dataAssignment: any[], registrationData: { courseId: number; managementId: number; created_by?: number }) {
    const db = Database.getInstance();
    const email = new emailService();
    const authService = new AuthService(); 
    const { courseId, managementId, created_by } = registrationData;

    return await db.$transaction(
      async (transaction) => {
      const registeredStudents = [];
      const usersToCreate = []; 
      for (const student of dataAssignment) {
        const [lastname, second_lastname, ...nameParts] = student.name.split(' ');
        const name = nameParts.join(' ');

        const countryName = student.pais?.trim().toUpperCase() || 'NINGUNO';
        const departmentName = student.departamento?.trim().toUpperCase() || 'NINGUNO';
        const provinceName = student.provincia?.trim().toUpperCase() || 'NINGUNO';
        const townName = student.localidad?.trim().toUpperCase() || 'NINGUNO';

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

        // Insert data person-student
        const person = await transaction.person.create({
          data: {
            name: name,
            lastname: lastname || null,
            second_lastname: second_lastname || null,
            gender: student.gender,
            ci: student.ci || null,
            birth_date: student.datebirth ? new Date(student.datebirth) : null,
            status: 1,
            town_id: town.id,
            email: email.generateStudentEmail(student.name, student.rude, student.datebirth),
            temp_password: email.generateMemorablePassword(),
            created_by: created_by || null,
          },
        });

        const studentRecord = await transaction.student.create({
          data: {
            id: person.id,
            matricula: student.matricula || null,
            rude: student.rude,
            status: 1,
            created_by: created_by || null,
          },
        });

        // Insert data registration
        const registration = await transaction.registration.create({
          data: {
            course_id: courseId,
            student_id: studentRecord.id,
            management_id: managementId,
            status: 1,
            created_by: created_by || null,
          },
        });

        usersToCreate.push({
          email: person.email,
          password: person.temp_password,
        });

        registeredStudents.push({
          person,
          student: studentRecord,
          registration,
          location: { country, department, province, town },
        });
      }

      //Create new users in Auth0
      const auth0Result = await authService.createStudentUsers(usersToCreate);

      return {
        registeredStudents,
        auth0Result,
      };
    }, 
    {
      timeout: 40000, 
      maxWait: 50000, 
    });
  }

  async updateStudent(registrationUpdates: { registrationId: number; data: any; updated_by?: number }[]) {
    console.log('registrationUpdates', registrationUpdates);
    const db = Database.getInstance();
  
    return await db.$transaction(async (transaction) => {
      const updatedRecords = [];
  
      for (const { registrationId, data, updated_by } of registrationUpdates) {
        // Obtener el registro de inscripción
        const registration = await transaction.registration.findUnique({
          where: { id: registrationId },
          include: {
            student: {
              include: {
                person: {
                  include: {
                    town: {
                      include: {
                        province: {
                          include: {
                            departament: {
                              include: {
                                country: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
  
        if (!registration) {
          throw new Error(`No se encontró el registro con ID ${registrationId}`);
        }
  
        const { student } = registration;
        const { person } = student;
  
        // Actualizar o asociar datos de ubicación
        const countryName = data.pais?.trim().toUpperCase() || 'NINGUNO';
        const departmentName = data.departamento?.trim().toUpperCase() || 'NINGUNO';
        const provinceName = data.provincia?.trim().toUpperCase() || 'NINGUNO';
        const townName = data.localidad?.trim().toUpperCase() || 'NINGUNO';
  
        // Actualizar o asociar país
        let country = await transaction.country.findFirst({
          where: { country: countryName },
        });
  
        if (!country) {
          country = await transaction.country.create({
            data: { country: countryName },
          });
        }
  
        // Actualizar o asociar departamento
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
  
        // Actualizar o asociar provincia
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
  
        // Actualizar o asociar localidad
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
  
        // Actualizar datos de la persona
        await transaction.person.update({
          where: { id: person.id },
          data: {
            name: data.name,
            lastname: data.lastname,
            second_lastname: data.second_lastname,
            gender: data.gender,
            ci: data.ci || null,
            birth_date: data.datebirth ? new Date(data.datebirth) : null,
            town_id: town.id, // Asociar la nueva localidad
            updated_by: updated_by || null,
          },
        });
  
        // Actualizar datos del estudiante
        await transaction.student.update({
          where: { id: student.id },
          data: {
            matricula: data.matricula || null,
            rude: data.rude ? data.rude : null,
            updated_by: updated_by || null,
          },
        });
  
        updatedRecords.push({
          registrationId,
          updated: true,
        });
      }
  
      return updatedRecords;
    });
  }

  async getStudentsByCourseId(courseId: number) {
    const db = Database.getInstance();
  
    return await db.registration.findMany({
      where: { 
        course_id: courseId,
        status: 1,
      },
      include: {
        student: {
          where: {
            status: 1,
          },
          include: {
            person: {
              include: {
                town: {
                  include: {
                    province: {
                      include: {
                        departament: {
                          include: {
                            country: true, 
                          },
                        },
                      },
                    },
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