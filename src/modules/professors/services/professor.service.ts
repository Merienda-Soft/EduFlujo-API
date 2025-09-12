import Database from '../../../shared/database/connection';

export class ProfessorService {
    private db = Database.getInstance();

    async getProfessorByEmail(email: string) {
        return await this.db.professor.findFirst({
            where: {
                status: 1,
                person: {
                    email: email,
                    status: 1,
                }
            },
            include: {
                person: true,
                assignments: {
                    where: {
                        status: { in: [1, 2] },
                    },
                    include: {
                        course: true,
                        subject: true
                    }
                }
            }
        });
    }

    async getAllProfessors() {
      return await this.db.professor.findMany({
        where: {
          status: 1,
          person: {
            status: 1,
          },
        },
        include: {
          person: {
            select: {
              name: true,
              lastname: true,
              second_lastname: true,
              gender: true,
              ci: true,
              birth_date: true,
              email: true,
            },
          },
        },
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
        temporary_password: string;
        created_by?: number;
      }) {
      return await this.db.$transaction(async (transaction) => {
      // Normalización de datos de ubicación
      const locationData = this.normalizeLocationData(professorData);

      // Procesamiento jerárquico de ubicaciones
      const { country, department, province, town } = await this.processLocationHierarchy(
        transaction,
        locationData
      );

      // Verificar si el profesor ya existe
      await this.checkProfessorExists(transaction, professorData.email);

      // Crear persona y profesor
      const { person, professor } = await this.createPersonAndProfessor(
        transaction,
        professorData,
        town.id
      );

      return {
        message: 'Profesor creado exitosamente.',
        professor,
        person,
        location: { country, department, province, town },
      };
    });
  }

  /**
   * Normaliza los datos de ubicación
   */
  private normalizeLocationData(professorData: {
    pais?: string;
    departamento?: string;
    provincia?: string;
    localidad?: string;
  }) {
    return {
      country: professorData.pais?.trim().toUpperCase() || 'NINGUNO',
      department: professorData.departamento?.trim().toUpperCase() || 'NINGUNO',
      province: professorData.provincia?.trim().toUpperCase() || 'NINGUNO',
      town: professorData.localidad?.trim().toUpperCase() || 'NINGUNO',
    };
  }

  /**
   * Procesa la jerarquía de ubicaciones (país → departamento → provincia → localidad)
   */
  private async processLocationHierarchy(
    transaction: any,
    locationData: {
      country: string;
      department: string;
      province: string;
      town: string;
    }
  ) {
    const country = await this.getOrCreateLocation(
      transaction,
      'country',
      locationData.country
    );

    const department = await this.getOrCreateLocation(
      transaction,
      'departament',
      locationData.department,
      country.id
    );

    const province = await this.getOrCreateLocation(
      transaction,
      'province',
      locationData.province,
      department.id
    );

    const town = await this.getOrCreateLocation(
      transaction,
      'town',
      locationData.town,
      province.id
    );

    return { country, department, province, town };
  }

  /**
   * Obtiene o crea un registro de ubicación
   */
  private async getOrCreateLocation(
    transaction: any,
    model: 'country' | 'departament' | 'province' | 'town',
    name: string,
    parentId?: number
  ) {
    const whereClause = this.buildLocationWhereClause(model, name, parentId);

    let record = await transaction[model].findFirst({
      where: whereClause,
    });

    if (!record && name !== 'NINGUNO') {
      const createData = this.buildLocationCreateData(model, name, parentId);
      record = await transaction[model].create({
        data: createData,
      });
    }

    if (!record && name === 'NINGUNO') {
      record = { id: 1 }; 
    }

    if (!record) {
      throw new Error(`No se pudo obtener o crear el registro de ${model}`);
    }

    return record;
  }

  /**
   * Construye la cláusula WHERE para buscar ubicaciones
   */
  private buildLocationWhereClause(
    model: 'country' | 'departament' | 'province' | 'town',
    name: string,
    parentId?: number
  ) {
    if (model === 'country') {
      return { country: name };
    }

    const parentField = this.getParentField(model);
    return {
      [model]: name,
      [parentField]: parentId,
    };
  }

  /**
   * Construye los datos para crear una nueva ubicación
   */
  private buildLocationCreateData(
    model: 'country' | 'departament' | 'province' | 'town',
    name: string,
    parentId?: number
  ) {
    if (model === 'country') {
      return { 
        country: name,
        status: 1,
      };
    }

    const parentField = this.getParentField(model);
    return {
      [model]: name,
      [parentField]: parentId,
      status: 1,
    };
  }

  /**
   * Obtiene el nombre del campo padre según el modelo
   */
  private getParentField(model: 'departament' | 'province' | 'town') {
    const fieldMap = {
      departament: 'country_id',
      province: 'departament_id',
      town: 'province_id',
    };
    return fieldMap[model];
  }

  /**
   * Verifica si el profesor ya existe
   */
  private async checkProfessorExists(transaction: any, email: string) {
    const existingPerson = await transaction.person.findFirst({
      where: { 
        email,
        status: 1,
      },
    });

    if (existingPerson) {
      throw new Error('El profesor ya existe con el correo proporcionado.');
    }
  }

  /**
   * Crea los registros de persona y profesor
   */
  private async createPersonAndProfessor(
    transaction: any,
    professorData: {
      name: string;
      lastname: string;
      second_lastname: string;
      gender: string;
      ci: string;
      birth_date: string;
      email: string;
      is_tecnical: number;
      subjects: string;
      temporary_password: string;
      created_by?: number;
    },
    townId: number
    ) {
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
        town_id: townId,
        temp_password: professorData.temporary_password,
        created_by: professorData.created_by || null,
      },
    });

    const professor = await transaction.professor.create({
      data: {
        id: person.id,
        is_tecnical: professorData.is_tecnical,
        subjects: professorData.subjects,
        status: 1,
        created_by: professorData.created_by || null,
      },
    });

    return { person, professor };
  } 
}
