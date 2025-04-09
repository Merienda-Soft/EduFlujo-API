import Database from '../../../shared/database/connection';

export class CourseService {
  async getAllCourses() {
    return await Database.getInstance().course.findMany({
      include: {
        degree: true, 
        management: true,
      },
    });
  }

  async getCourseById(id: number) {
    return await Database.getInstance().course.findUnique({

      where: { id },
      include: {
        degree: true, 
        management: true, 
      },
    });
  }

  async createCourse(data: {
    course: string;
    parallel: string;
    degree_id: number;
    management_id: number;
  }) {
    return await Database.getInstance().course.create({
      data,
    });
  }

  async updateCourse(id: number, data: Partial<{
    course: string;
    parallel: string;
    degree_id: number;
    management_id: number;
  }>) {
    return await Database.getInstance().course.update({
      where: { id },
      data,
    });
  }


  async deactivatedCourse(id: number): Promise<void> {
    await Database.getInstance().course.update({
        where: { id: id },
        data: { status: 0 } 
      });
  }


  async activatedCourse(id: number): Promise<void> {
    await Database.getInstance().course.update({
        where: { id: id },
        data: { status: 1 } 
      });
  }


  async getCoursesByDegree(degreeId: number) {
    return await Database.getInstance().course.findMany({
      where: { degree_id: degreeId },
      include: {
        management: true, 
      },
    });
  }

  async getCourseWithCurriculum(courseId: number) {
    return await Database.getInstance().course.findUnique({
      where: { id: courseId },
      include: {
        curriculums: {
          include: {
            subject: true,
          },
        },
        degree: true, 
        management: true, 
      },
    });
  }
}