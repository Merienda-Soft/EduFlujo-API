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
    gradeCourseData: 
    { 
      grade: number; 
      courseCount: number; 
      parallels: string[] 
    }[], 
    subjectIds: number[] 
  ) {
    const db = Database.getInstance();

    // Management DTO
    return await db.$transaction(async (transaction) => {
      // Create the management
      const management = await this.createManagement(transaction, managementData);

      // Create courses and curriculums
      await this.createCoursesAndCurriculums(transaction, management.id, gradeCourseData, subjectIds);

      return management; 
    });
  }

  private async createManagement(transaction: any, managementData: CreateManagementDto) {
    return await transaction.management.create({
      data: {
        ...managementData,
        status: managementData.status ?? 1, // Default status to 1 if not provided
      },
    });
  }

  private async createCoursesAndCurriculums(
    transaction: any,
    managementId: number,
    gradeCourseData: { grade: number; courseCount: number; parallels: string[] }[],
    subjectIds: number[]
  ) {
    for (const gradeData of gradeCourseData) {
      const { grade, courseCount, parallels } = gradeData;

      if (courseCount !== parallels.length) {
        throw new Error(
          `Mismatch between course count (${courseCount}) and parallels (${parallels.length}) for grade ${grade}`
        );
      }

      for (let i = 0; i < courseCount; i++) {
        const course = await this.createCourse(transaction, grade, parallels[i], managementId);

        // Create curriculums for each subject in the course
        await this.createCurriculums(transaction, course.id, subjectIds, managementId);
      }
    }
  }

  private async createCourse(transaction: any, grade: number, parallel: string, managementId: number) {
    const courseDescription = `${grade}° ${parallel}`;
    return await transaction.course.create({
      data: {
        course: courseDescription,
        parallel: parallel,
        degree_id: grade,
        management_id: managementId,
      },
    });
  }

  private async createCurriculums(
    transaction: any,
    courseId: number,
    subjectIds: number[],
    managementId: number
  ) {
    for (const subjectId of subjectIds) {
      await transaction.curriculum.create({
        data: {
          course_id: courseId,
          subject_id: subjectId,
          management_id: managementId,
        },
      });
    }
  }
}