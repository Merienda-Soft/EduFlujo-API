import { PrismaClient } from '@prisma/client';

export class EnvironmentService  {
  constructor(private prisma: PrismaClient) {}

  async createAcademicYearWithCourses(transactionData: {
    managementData: {
      year: number;
      start_date: string;
      end_date: string;
      status?: number;
      first_quarter_start?: string;
      first_quarter_end?: string;
      second_quarter_start?: string;
      second_quarter_end?: string;
      third_quarter_start?: string;
      third_quarter_end?: string;
    };
    courses: Array<{
      course_name: string;
      parallel: string;
      degree_id: number;
      status?: number;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear la gestión académica
      const management = await tx.management.create({
        data: {
          management: transactionData.managementData.year,
          status: transactionData.managementData.status || 1,
          start_date: new Date(transactionData.managementData.start_date),
          end_date: new Date(transactionData.managementData.end_date),
          first_quarter_start: transactionData.managementData.first_quarter_start 
            ? new Date(transactionData.managementData.first_quarter_start) 
            : null,
          first_quarter_end: transactionData.managementData.first_quarter_end
            ? new Date(transactionData.managementData.first_quarter_end)
            : null,
          second_quarter_start: transactionData.managementData.second_quarter_start
            ? new Date(transactionData.managementData.second_quarter_start)
            : null,
          second_quarter_end: transactionData.managementData.second_quarter_end || null,
          third_quarter_start: transactionData.managementData.third_quarter_start || null,
          third_quarter_end: transactionData.managementData.third_quarter_end || null
        }
      });

      const environmentCreations = await Promise.all(
        transactionData.courses.map(async (courseData) => {
          // Buscar o crear el curso
          let course = await tx.course.findFirst({
            where: {
              course: courseData.course_name,
              parallel: courseData.parallel,
              degree_id: courseData.degree_id
            }
          });

          if (!course) {
            course = await tx.course.create({
              data: {
                course: courseData.course_name,
                parallel: courseData.parallel,
                degree_id: courseData.degree_id,
                last_update: new Date()
              }
            });
          }

          // Crear el environment (relación curso-gestión)
          return tx.environment.create({
            data: {
              management_id: management.id,
              course_id: course.id,
              status: courseData.status || 1
            }
          });
        })
      );

      return {
        management,
        environments: environmentCreations,
        totalCourses: environmentCreations.length
      };
    });
  }
}