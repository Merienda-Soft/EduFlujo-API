import Database from '../../../shared/database/connection';

export class CourseService {
  async getAllCourses() {
    return await Database.getInstance().course.findMany({
      include: {
        degree: true,
        management: true,
        curriculums: {
          include: {
            subject: {
              select: {
                id: true,
                subject: true, 
              },
            },
          },
        },
      },
    });
  }

  async getCourseById(id: number) {
    return await Database.getInstance().course.findUnique({

      where: { id },
      include: {
        degree: true, 
        management: true, 
        curriculums: {
          include: {
            subject: true, 
          },
        },
      },
    });
  }

  async createCourse(data: {
    course: string;
    parallel: string;
    degree_id: number;
    management_id: number;
    subject_ids: number[]; // IDs de las materias para las currículas
  }) {
    return await Database.getInstance().$transaction(async (transaction) => {
      // Crear el curso
      const course = await transaction.course.create({
        data: {
          course: data.course,
          parallel: data.parallel,
          degree_id: data.degree_id,
          management_id: data.management_id,
        },
      });
  
      // Crear las currículas asociadas al curso
      const curriculums = [];
      for (const subjectId of data.subject_ids) {
        const curriculum = await transaction.curriculum.create({
          data: {
            course_id: course.id,
            subject_id: subjectId,
            management_id: data.management_id,
          },
        });
        curriculums.push(curriculum);
      }
  
      return {
        message: 'Curso y currículas creados exitosamente.',
        course,
        curriculums,
      };
    });
  }

  async updateCourse(
    id: number,
    data: Partial<{
      course: string;
      parallel: string;
      degree_id: number;
      management_id: number;
      subject_ids: number[]; // IDs de las materias para las currículas
    }>
  ) {
    return await Database.getInstance().$transaction(async (transaction) => {
      // Actualizar el curso
      const updatedCourse = await transaction.course.update({
        where: { id },
        data: {
          course: data.course,
          parallel: data.parallel,
          degree_id: data.degree_id,
          management_id: data.management_id,
        },
      });
  
      if (data.subject_ids) {
        await transaction.curriculum.deleteMany({
          where: { course_id: id },
        });
  
        const curriculums = [];
        for (const subjectId of data.subject_ids) {
          const curriculum = await transaction.curriculum.create({
            data: {
              course_id: id,
              subject_id: subjectId,
              management_id: data.management_id,
            },
          });
          curriculums.push(curriculum);
        }
  
        return {
          message: 'Curso y currículas actualizados exitosamente.',
          course: updatedCourse,
          curriculums,
        };
      }
  
      return {
        message: 'Curso actualizado exitosamente.',
        course: updatedCourse,
      };
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