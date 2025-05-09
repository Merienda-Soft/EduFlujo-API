import Database from '../../../shared/database/connection';
import { CreateManagementDto } from '../dtos/management.dto';

export class EnvironmentService {
  async ensureBaseEntities() {
    const db = Database.getInstance();
  
      await db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`
          INSERT INTO "Country" (_id, country)
          SELECT 1, 'NINGUNO'
          WHERE NOT EXISTS (
            SELECT 1 FROM "Country" WHERE country = 'NINGUNO'
          );
      `);
      
      await tx.$executeRawUnsafe(`
          INSERT INTO "Departament" (_id, departament, country_id)
          SELECT 1, 'NINGUNO', 1
          WHERE NOT EXISTS (
            SELECT 1 FROM "Departament" WHERE departament = 'NINGUNO'
          );
      `);
      
      await tx.$executeRawUnsafe(`
          INSERT INTO "Province" (_id, province, departament_id)
          SELECT 1, 'NINGUNO', 1
          WHERE NOT EXISTS (
            SELECT 1 FROM "Province" WHERE province = 'NINGUNO'
          );
      `);
      
      await tx.$executeRawUnsafe(`
          INSERT INTO "Town" (_id, town, province_id)
          SELECT 1, 'NINGUNO', 1
          WHERE NOT EXISTS (
            SELECT 1 FROM "Town" WHERE town = 'NINGUNO'
          );
      `);
  
      const degrees = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO'];
      for (const degree of degrees) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "Degree" (degree)
          SELECT '${degree}'
          WHERE NOT EXISTS (
            SELECT 1 FROM "Degree" WHERE degree = '${degree}'
          );
        `);
      }
  
      const subjects = [
        { subject: 'MATEMÁTICAS', is_tecnical: 0 },
        { subject: 'CIENCIAS SOCIALES', is_tecnical: 0 },
        { subject: 'CIENCIAS NATURALES', is_tecnical: 0 },
        { subject: 'COMUNICACIÓN Y LENGUAJES', is_tecnical: 0 },
        { subject: 'VALORES, ESPIRITUALIDADES Y RELIGIONES', is_tecnical: 1 },
        { subject: 'EDUCACIÓN FÍSICA Y DEPORTES', is_tecnical: 1 },
        { subject: 'EDUCACIÓN MUSICAL', is_tecnical: 1 },
        { subject: 'ARTES PLÁSTICAS Y VISUALES', is_tecnical: 1 },
        { subject: 'TÉCNICA TECNOLÓGICA', is_tecnical: 1 },
      ];

      for (const subj of subjects) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "Subject" (subject, is_tecnical, status)
          SELECT '${subj.subject}', ${subj.is_tecnical}, 1
          WHERE NOT EXISTS (
            SELECT 1 FROM "Subject" WHERE subject = '${subj.subject}'
          );
        `);
      }
    });
  }
  
  async CreateEnvironment(
  managementData: CreateManagementDto,
  gradeCourseData: {
    grade: number;
    courseCount: number;
    parallels: string[];
  }[],
  subjectIds: number[]
) {
  const db = Database.getInstance();

  return await db.$transaction(async (tx) => {
    // 1. Create management
    const management = await tx.management.create({
      data: {
        ...managementData,
        status: managementData.status ?? 1,
      },
    });

    // 2. Process each grade configuration
    for (const gradeConfig of gradeCourseData) {
      const { grade, courseCount, parallels } = gradeConfig;

      if (courseCount !== parallels.length) {
        throw new Error(`Parallels count doesn't match courseCount for grade ${grade}`);
      }

      // 3. Create each course for this grade
      for (let i = 0; i < courseCount; i++) {
        const course = await tx.course.create({
          data: {
            course: `${grade}° ${parallels[i]}`,
            parallel: parallels[i],
            degree_id: grade,
            management_id: management.id,
          },
        });

        // 4. Create curriculum for each subject
        for (const subjectId of subjectIds) {
          await tx.curriculum.create({
            data: {
              course_id: course.id,
              subject_id: subjectId,
              management_id: management.id,
            },
          });
        }
      }
    }

    return management;
  }, {
    maxWait: 30000, 
    timeout: 60000  
  });
}
}