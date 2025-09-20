import { PrismaClient } from "@prisma/client";

export class MarksService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  /**
   * Llenar la tabla mark con las notas finales anuales de todos los estudiantes de un curso
   * La nota final es el promedio de todas las materias de los 3 trimestres
   */
  async calculateAndSaveFinalMarks(courseId: number, managementId: number, userId?: number) {
    try {
      // 1. Obtener estudiantes del curso
      const students = await this.db.registration.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
          status: 1
        },
        include: {
          student: {
            include: {
              person: true
            }
          }
        }
      });

      if (students.length === 0) {
        throw new Error("No se encontraron estudiantes en este curso");
      }

      // 2. Obtener materias asignadas al curso
      const assignments = await this.db.assignment.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
          status: 1
        },
        include: {
          subject: true,
          professor: {
            include: {
              person: true
            }
          }
        }
      });

      if (assignments.length === 0) {
        throw new Error("No se encontraron materias asignadas a este curso");
      }

      const results = [];

      // 3. Calcular nota final para cada estudiante
      for (const studentRegistration of students) {
        const studentId = studentRegistration.student.id;
        let totalSubjectGrades = 0;
        let subjectCount = 0;

        // Calcular nota por cada materia
        for (const assignment of assignments) {
          const subjectFinalGrade = await this.calculateSubjectFinalGrade(
            studentId,
            assignment.subject_id!,
            managementId
          );

          if (subjectFinalGrade > 0) {
            totalSubjectGrades += subjectFinalGrade;
            subjectCount++;
          }
        }

        // Calcular promedio final del estudiante
        const finalGrade = subjectCount > 0 ? Math.round(totalSubjectGrades / subjectCount) : 0;
        
        // Determinar status: 1 = APROBADO (≥51), 0 = REPROBADO (<51)
        const approvalStatus = finalGrade >= 51 ? 1 : 0;

        // 4. Verificar si ya existe un registro para este estudiante
        const existingMark = await this.db.mark.findFirst({
          where: {
            student_id: studentId,
            course_id: courseId,
            management_id: managementId
          }
        });

        if (existingMark) {
          // Actualizar registro existente
          await this.db.mark.update({
            where: { id: existingMark.id },
            data: {
              total: finalGrade,
              status: approvalStatus,
              updated_by: userId,
              updated_at: new Date()
            }
          });
        } else {
          // Crear nuevo registro
          await this.db.mark.create({
            data: {
              total: finalGrade,
              student_id: studentId,
              course_id: courseId,
              management_id: managementId,
              created_by: userId,
              status: approvalStatus
            }
          });
        }

        results.push({
          student: studentRegistration.student,
          finalGrade: finalGrade,
          approvalStatus: approvalStatus,
          status: finalGrade >= 51 ? 'APROBADO' : 'REPROBADO'
        });
      }

      return {
        success: true,
        message: `Notas finales calculadas para ${students.length} estudiantes`,
        data: results
      };

    } catch (error) {
      console.error('Error calculando notas finales:', error);
      throw error;
    }
  }

  /**
   * Llenar la tabla markSubject con las notas finales por materia específica
   */
  async calculateAndSaveSubjectMarks(courseId: number, subjectId: number, managementId: number, userId?: number) {
    try {
      // 1. Obtener estudiantes del curso
      const students = await this.db.registration.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
          status: 1
        },
        include: {
          student: {
            include: {
              person: true
            }
          }
        }
      });

      if (students.length === 0) {
        throw new Error("No se encontraron estudiantes en este curso");
      }

      // 2. Verificar que la materia existe y está asignada al curso
      const assignment = await this.db.assignment.findFirst({
        where: {
          course_id: courseId,
          subject_id: subjectId,
          management_id: managementId,
          status: 1
        },
        include: {
          subject: true
        }
      });

      if (!assignment) {
        throw new Error("La materia no está asignada a este curso");
      }

      const results = [];

      // 3. Calcular nota final por materia para cada estudiante
      for (const studentRegistration of students) {
        const studentId = studentRegistration.student.id;
        const subjectFinalGrade = await this.calculateSubjectFinalGrade(
          studentId,
          subjectId,
          managementId
        );

        const finalGrade = Math.round(subjectFinalGrade);
        
        // Determinar status: 1 = APROBADO (≥51), 0 = REPROBADO (<51)
        const approvalStatus = finalGrade >= 51 ? 1 : 0;

        // 4. Verificar si ya existe un registro para este estudiante y materia
        const existingMarkSubject = await this.db.markSubject.findFirst({
          where: {
            student_id: studentId,
            course_id: courseId,
            subject_id: subjectId,
            management_id: managementId
          }
        });

        if (existingMarkSubject) {
          // Actualizar registro existente
          await this.db.markSubject.update({
            where: { id: existingMarkSubject.id },
            data: {
              mark_subject: finalGrade,
              status: approvalStatus,
              updated_by: userId,
              updated_at: new Date()
            }
          });
        } else {
          // Crear nuevo registro
          await this.db.markSubject.create({
            data: {
              mark_subject: finalGrade,
              student_id: studentId,
              course_id: courseId,
              subject_id: subjectId,
              management_id: managementId,
              created_by: userId,
              status: approvalStatus
            }
          });
        }

        results.push({
          student: studentRegistration.student,
          subject: assignment.subject!.subject,
          finalGrade: finalGrade,
          approvalStatus: approvalStatus,
          status: finalGrade >= 51 ? 'APROBADO' : 'REPROBADO'
        });
      }

      return {
        success: true,
        message: `Notas finales por materia calculadas para ${students.length} estudiantes`,
        data: results
      };

    } catch (error) {
      console.error('Error calculando notas por materia:', error);
      throw error;
    }
  }

  /**
   * Calcular la nota final de una materia específica para un estudiante
   * (Promedio de los 3 trimestres)
   */
  private async calculateSubjectFinalGrade(studentId: number, subjectId: number, managementId: number): Promise<number> {
    try {
      const dimensions = await this.db.dimension.findMany();
      
      let totalTrimesters = 0;
      let trimesterCount = 0;

      // Calcular notas para cada trimestre
      for (const quarter of ['Q1', 'Q2', 'Q3']) {
        const trimesterGrade = await this.calculateTrimesterGrades(
          studentId,
          subjectId,
          managementId,
          quarter,
          dimensions
        );

        if (trimesterGrade.total > 0) {
          totalTrimesters += trimesterGrade.total;
          trimesterCount++;
        }
      }

      // Promedio de los trimestres
      return trimesterCount > 0 ? totalTrimesters / trimesterCount : 0;

    } catch (error) {
      console.error('Error calculando nota final de materia:', error);
      return 0;
    }
  }

  /**
   * Cálculo de notas por trimestre con ponderación de tareas
   * (Reutilizada de reports.service.ts)
   * 
   * Sistema de ponderación:
   * - SER (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * - SABER (45 pts): Se calcula por meses dentro del trimestre, promediando los 3 meses  
   * - HACER (40 pts): Se calcula por meses dentro del trimestre, promediando los 3 meses
   * - DECIDIR (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * - AUTOEVALUACIÓN (5 pts): Se calcula por trimestre completo usando todas las tareas del trimestre
   * 
   * Cada tarea tiene un weight (porcentaje) que determina su importancia dentro de la dimensión.
   * Por ejemplo: Si SABER vale 45 pts y una tarea tiene weight=50%, entonces esa tarea vale 
   * el 50% de los 45 pts. Si el estudiante saca 100 en la tarea, obtiene 22.5 pts (50% de 45).
   * 
   * Para SABER y HACER, se calcula mes por mes y luego se promedian los 3 meses del trimestre.
   */
  private async calculateTrimesterGrades(
    studentId: number,
    subjectId: number,
    managementId: number,
    quarter: string,
    dimensions: any[]
  ) {
    const dimensionScores = {
      1: 5,   // SER
      2: 45,  // SABER
      3: 40,  // HACER
      4: 5,   // DECIDIR
      5: 5    // AUTOEVALUACIÓN
    };

    const grades = {
      saber: 0,
      hacer: 0,
      ser: 0,
      decidir: 0,
      autoevaluacion: 0,
      total: 0,
      details: {
        saber: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        hacer: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        ser: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        decidir: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
        autoevaluacion: { tasks: [], totalWeight: 0, totalScore: 0, finalScore: 0 },
      },
    };

    // Obtener información del management para las fechas
    const management = await this.db.management.findUnique({
      where: { id: managementId }
    });

    if (!management) {
      throw new Error('Management no encontrado');
    }

    // Determinar fechas del trimestre
    let quarterStart: Date, quarterEnd: Date;
    switch (quarter) {
      case 'Q1':
        quarterStart = new Date(management.first_quarter_start!);
        quarterEnd = new Date(management.first_quarter_end!);
        break;
      case 'Q2':
        quarterStart = new Date(management.second_quarter_start!);
        quarterEnd = new Date(management.second_quarter_end!);
        break;
      case 'Q3':
        quarterStart = new Date(management.third_quarter_start!);
        quarterEnd = new Date(management.third_quarter_end!);
        break;
      default:
        throw new Error(`Quarter inválido: ${quarter}`);
    }

    // 1. Calcular SER, DECIDIR y AUTOEVALUACIÓN por trimestre completo
    const quarterlyTasks = await this.db.task.findMany({
      where: {
        subject_id: subjectId,
        management_id: managementId,
        status: 1,
        dimension_id: { in: [1, 4, 5] }, // SER, DECIDIR, AUTOEVALUACIÓN
        end_date: {
          gte: quarterStart,
          lte: quarterEnd
        }
      },
      include: {
        assignments: {
          where: {
            student_id: studentId,
          },
        },
        dimension: true,
      },
    });

    // Procesar tareas por trimestre (SER, DECIDIR, AUTOEVALUACIÓN)
    quarterlyTasks.forEach(task => {
      const assignment = task.assignments[0];
      if (assignment && assignment.qualification) {
        const taskScore = parseFloat(assignment.qualification);
        const taskWeight = task.weight || 0;
        const dimensionId = task.dimension_id;
        
        let dimensionName = '';
        switch (dimensionId) {
          case 1: dimensionName = 'ser'; break;
          case 4: dimensionName = 'decidir'; break;
          case 5: dimensionName = 'autoevaluacion'; break;
        }

        if (dimensionName) {
          grades.details[dimensionName].tasks.push({
            taskName: task.name,
            score: taskScore,
            weight: taskWeight
          });
          grades.details[dimensionName].totalWeight += taskWeight;
          grades.details[dimensionName].totalScore += (taskScore * taskWeight) / 100;
        }
      }
    });

    // 2. Calcular SABER y HACER por meses
    const year = quarterStart.getFullYear();
    let monthRanges = [];

    switch (quarter) {
      case 'Q1':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 1, 28) }, // hasta 28 feb
          { start: new Date(year, 2, 1), end: new Date(year, 2, 31) }, // marzo completo
          { start: new Date(year, 3, 1), end: quarterEnd } // abril hasta fin Q1
        ];
        break;
      case 'Q2':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 4, 31) }, // mayo completo
          { start: new Date(year, 5, 1), end: new Date(year, 6, 31) }, // jun-jul
          { start: new Date(year, 7, 1), end: quarterEnd } // agosto hasta fin Q2
        ];
        break;
      case 'Q3':
        monthRanges = [
          { start: quarterStart, end: new Date(year, 8, 30) }, // septiembre
          { start: new Date(year, 9, 1), end: new Date(year, 9, 31) }, // octubre
          { start: new Date(year, 10, 1), end: quarterEnd } // nov-dic hasta fin Q3
        ];
        break;
    }

    // Calcular SABER y HACER por cada mes
    for (const monthRange of monthRanges) {
      const monthlyTasks = await this.db.task.findMany({
        where: {
          subject_id: subjectId,
          management_id: managementId,
          status: 1,
          dimension_id: { in: [2, 3] }, // SABER y HACER
          end_date: {
            gte: monthRange.start,
            lte: monthRange.end
          }
        },
        include: {
          assignments: {
            where: {
              student_id: studentId,
            },
          },
          dimension: true,
        },
      });

      // Agrupar por dimensión para este mes
      const monthlyByDimension = {
        saber: monthlyTasks.filter(t => t.dimension_id === 2),
        hacer: monthlyTasks.filter(t => t.dimension_id === 3)
      };

      // Procesar cada dimensión para este mes
      for (const [dimensionName, tasks] of Object.entries(monthlyByDimension)) {
        if (tasks.length > 0) {
          let monthTotalWeight = 0;
          let monthWeightedScore = 0;

          tasks.forEach(task => {
            const assignment = task.assignments[0];
            if (assignment && assignment.qualification) {
              const taskScore = parseFloat(assignment.qualification);
              const taskWeight = task.weight || 0;
              
              monthTotalWeight += taskWeight;
              monthWeightedScore += (taskScore * taskWeight) / 100;

              grades.details[dimensionName].tasks.push({
                taskName: task.name,
                score: taskScore,
                weight: taskWeight,
                month: monthRange.start.getMonth() + 1
              });
            }
          });

          // Si hay tareas en este mes, calcular el puntaje del mes
          if (monthTotalWeight > 0) {
            // El puntaje del mes es el promedio ponderado de las tareas del mes
            const monthPercentage = (monthWeightedScore / monthTotalWeight) * 100;
            const dimensionMaxScore = dimensionName === 'saber' ? 45 : 40;
            const monthPoints = (monthPercentage * dimensionMaxScore) / 100;
            
            grades.details[dimensionName].totalScore += monthPoints;
            grades.details[dimensionName].totalWeight += 1; // Cada mes cuenta como 1
          }
        }
      }
    }

    // Calcular puntajes finales
    // Para SER, DECIDIR, AUTOEVALUACIÓN (por trimestre)
    ['ser', 'decidir', 'autoevaluacion'].forEach(dimensionName => {
      const detail = grades.details[dimensionName];
      if (detail.totalWeight > 0) {
        const dimensionId = dimensionName === 'ser' ? 1 : (dimensionName === 'decidir' ? 4 : 5);
        const maxScore = dimensionScores[dimensionId];
        // Calcular porcentaje obtenido basado en peso total
        const percentage = (detail.totalScore / detail.totalWeight) * 100;
        detail.finalScore = (percentage * maxScore) / 100;
        grades[dimensionName] = detail.finalScore;
      }
    });

    // Para SABER y HACER (promedio de meses)
    ['saber', 'hacer'].forEach(dimensionName => {
      const detail = grades.details[dimensionName];
      if (detail.totalWeight > 0) {
        const dimensionId = dimensionName === 'saber' ? 2 : 3;
        const maxScore = dimensionScores[dimensionId];
        // Promedio de los meses
        detail.finalScore = detail.totalScore / detail.totalWeight;
        grades[dimensionName] = detail.finalScore;
      }
    });

    // Calcular total
    grades.total =
      grades.saber +
      grades.hacer +
      grades.ser +
      grades.decidir +
      grades.autoevaluacion;

    return grades;
  }

  /**
   * Obtener todas las notas finales de un curso
   */
  async getFinalMarksByCourse(courseId: number, managementId: number) {
    try {
      const marks = await this.db.mark.findMany({
        where: {
          course_id: courseId,
          management_id: managementId,
          status: 1
        },
        include: {
          student: {
            include: {
              person: true
            }
          },
          course: true,
          management: true
        },
        orderBy: {
          student: {
            person: {
              lastname: 'asc'
            }
          }
        }
      });

      return {
        success: true,
        data: marks
      };

    } catch (error) {
      console.error('Error obteniendo notas finales:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las notas finales por materia
   */
  async getSubjectMarksByCourse(courseId: number, subjectId: number, managementId: number) {
    try {
      const markSubjects = await this.db.markSubject.findMany({
        where: {
          course_id: courseId,
          subject_id: subjectId,
          management_id: managementId,
          status: 1
        },
        include: {
          student: {
            include: {
              person: true
            }
          },
          course: true,
          subject: true,
          management: true
        },
        orderBy: {
          student: {
            person: {
              lastname: 'asc'
            }
          }
        }
      });

      return {
        success: true,
        data: markSubjects
      };

    } catch (error) {
      console.error('Error obteniendo notas por materia:', error);
      throw error;
    }
  }
  
  // Verify if courses have marks for all their subjects in a management
  async checkCoursesHaveMarks(managementId: number) {
    try {
      // get courses
      const courses = await this.db.course.findMany({
        where: {
          management_id: managementId,
          status: 1
        },
        select: {
          id: true,
          course: true
        }
      });

      if (courses.length === 0) {
        return {
          success: true,
          data: [],
          is_checked: true
        };
      }

      // get subjects
      const subjects = await this.db.subject.findMany({
        where: {
          status: 1
        },
        select: {
          id: true
        }
      });

      if (subjects.length === 0) {
        return {
          success: true,
          data: [],
          is_checked: true
        };
      }

      const results = [];
      let allCoursesHaveMarks = true;

      for (const course of courses) {
        let courseHasAllMarks = true;
         
        // check if all subjects have marks
        for (const subject of subjects) {
          const hasMarksForSubject = await this.db.markSubject.findFirst({
            where: {
              course_id: course.id,
              subject_id: subject.id,
              management_id: managementId,
              status: 1
            }
          });

          if (!hasMarksForSubject) {
            courseHasAllMarks = false;
            break;
          }
        }

        results.push({
          course_name: course.course || 'Sin nombre',
          has_marks: courseHasAllMarks
        });

        if (!courseHasAllMarks) {
          allCoursesHaveMarks = false;
        }
      }

      return {
        success: true,
        data: results,
        is_checked: allCoursesHaveMarks
      };

    } catch (error) {
      console.error('Error verificando registros de cursos:', error);
      throw error;
    }
  }
}