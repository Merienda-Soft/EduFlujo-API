import Database from '../../../shared/database/connection';
import { CreateManagementDto } from '../dtos/management.dto';

export class EnvironmentService {
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