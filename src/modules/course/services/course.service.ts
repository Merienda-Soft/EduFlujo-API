import Database from '../../../shared/database/connection';

export class CourseService {
  async getAllCourses() {
    return await Database.getInstance().course.findMany({
      where: {
        status: 1,
      },
      include: {
        degree: true,
        management: true,
        curriculums: {
          where: {
            status: 1,
          },
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
      where: { 
        id,
        status: 1,
      },
      include: {
        degree: true, 
        management: true, 
        curriculums: {
          where: {
            status: 1,
          },
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
    created_by?: number;
  }) {
    return await Database.getInstance().$transaction(async (transaction) => {
      // Crear el curso
      const course = await transaction.course.create({
        data: {
          course: data.course,
          parallel: data.parallel,
          degree_id: data.degree_id,
          management_id: data.management_id,
          status: 1,
          created_by: data.created_by || null,
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
            status: 1,
            created_by: data.created_by || null,
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
      updated_by?: number;
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
          updated_by: data.updated_by || null,
        },
      });
  
      if (data.subject_ids) {
        // Primero, marcar como inactivas las currículas existentes
        await transaction.curriculum.updateMany({
          where: { course_id: id },
          data: { 
            status: 0,
            updated_by: data.updated_by || null,
          },
        });
  
        const curriculums = [];
        for (const subjectId of data.subject_ids) {
          const curriculum = await transaction.curriculum.create({
            data: {
              course_id: id,
              subject_id: subjectId,
              management_id: data.management_id,
              status: 1,
              created_by: data.updated_by || null,
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


  async deactivatedCourse(id: number, updated_by?: number): Promise<void> {
    await Database.getInstance().course.update({
        where: { id: id },
        data: { 
          status: 0,
          updated_by: updated_by || null,
        } 
      });
  }


  async activatedCourse(id: number, updated_by?: number): Promise<void> {
    await Database.getInstance().course.update({
        where: { id: id },
        data: { 
          status: 1,
          updated_by: updated_by || null,
        } 
      });
  }


  async getCoursesByDegree(degreeId: number) {
    return await Database.getInstance().course.findMany({
      where: { 
        degree_id: degreeId,
        status: 1,
      },
      include: {
        management: true, 
      },
    });
  }

  async getCourseWithCurriculum(courseId: number) {
    return await Database.getInstance().course.findUnique({
      where: { 
        id: courseId,
        status: 1,
      },
      include: {
        curriculums: {
          where: {
            status: 1,
          },
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