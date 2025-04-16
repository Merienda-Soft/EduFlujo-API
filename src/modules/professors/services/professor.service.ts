import Database from '../../../shared/database/connection';

export class ProfessorService {
    private db = Database.getInstance();

    async getProfessorByEmail(email: string) {
        return await this.db.professor.findFirst({
            where: {
                person: {
                    email: email
                }
            },
            include: {
                person: true,
                assignments: {
                    include: {
                        course: true,
                        subject: true
                    }
                }
            }
        });
    }

    async createProfessor(professorData: {
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
        is_tecnical: number; 
        subjects: string;
      }) {
        return await this.db.$transaction(async (transaction) => {
          const countryName = professorData.pais?.trim().toUpperCase() || 'NINGUNO';
          const departmentName = professorData.departamento?.trim().toUpperCase() || 'NINGUNO';
          const provinceName = professorData.provincia?.trim().toUpperCase() || 'NINGUNO';
          const townName = professorData.localidad?.trim().toUpperCase() || 'NINGUNO';
      
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
            where: { email: professorData.email },
          });
      
          if (existingPerson) {
            throw new Error('El profesor ya existe con el correo proporcionado.');
          }
      
          // Insert data person-professor
          const person = await transaction.person.create({
            data: {
              name: professorData.name,
              lastname: professorData.lastname,
              second_lastname: professorData.second_lastname,
              gender: professorData.gender,
              ci: professorData.ci || null,
              birth_date: professorData.birth_date ? new Date(professorData.birth_date) : null,
              email: professorData.email,
              status: 1,
              town_id: town.id, 
            },
          });

          const professor = await transaction.professor.create({
            data: {
              id: person.id,
              is_tecnical: professorData.is_tecnical, 
              subjects: professorData.subjects,
              status: 1,
            },
          });
      
          return {
            message: 'Profesor creado exitosamente.',
            professor,
            person,
            location: { country, department, province, town },
          };
        });
    }
    
}
