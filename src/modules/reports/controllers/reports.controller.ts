import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  attendanceReportSchema,
  customDateReportSchema,
  managementReportSchema,
  monthlyReportSchema,
  yearlyReportSchema,
} from "../dtos/reports.dtos";
import { ReportsService } from "../services/reports.service";

export class ReportsController {
  private service = new ReportsService();

  async generateAttendanceReport(req: Request, res: Response) {
    try {
      const { courseId, subjectId, professorId, managementId } = req.params;
      const { startDate, endDate } = req.query;

      // Validar parámetros
      const validatedData = attendanceReportSchema.parse({
        courseId: Number(courseId),
        subjectId: Number(subjectId),
        professorId: Number(professorId),
        managementId: Number(managementId),
        startDate: startDate as string,
        endDate: endDate as string,
      });

      const result = await this.service.generateAttendanceReport(
        validatedData.courseId,
        validatedData.subjectId,
        validatedData.professorId,
        validatedData.managementId,
        validatedData.startDate,
        validatedData.endDate
      );

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Datos de entrada inválidos",
          details: error.errors,
        });
      }

      console.error("Error in generateAttendanceReport:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "Error interno del servidor",
      });
    }
  }

  // Reporte de asistencia con rango de fechas personalizado
  // Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  async generateCustomDateReport(req: Request, res: Response) {
    try {
      const { courseId, subjectId, professorId, managementId } = req.params;
      const { startDate, endDate } = req.query;

      // Validar parámetros
      const validatedData = customDateReportSchema.parse({
        courseId: Number(courseId),
        subjectId: Number(subjectId),
        professorId: Number(professorId),
        managementId: Number(managementId),
        startDate: startDate as string,
        endDate: endDate as string,
      });

      const result = await this.service.generateAttendanceReport(
        validatedData.courseId,
        validatedData.subjectId,
        validatedData.professorId,
        validatedData.managementId,
        validatedData.startDate,
        validatedData.endDate
      );

      res.status(200).json({
        ...result,
        reportType: "custom_date",
        period: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          customRange: true,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Datos de entrada inválidos",
          details: error.errors,
        });
      }
      this.handleError(res, error);
    }
  }

  // Reporte de asistencia mensual
  // Params: /monthly/2025/8/course/1/subject/1/professor/1/management/1
  async generateMonthlyReport(req: Request, res: Response) {
    try {
      const { courseId, subjectId, professorId, managementId, year, month } =
        req.params;

      // Validar parámetros
      const validatedData = monthlyReportSchema.parse({
        courseId: Number(courseId),
        subjectId: Number(subjectId),
        professorId: Number(professorId),
        managementId: Number(managementId),
        year: Number(year),
        month: Number(month),
      });

      // Calcular primer y último día del mes
      const startDate = new Date(
        validatedData.year,
        validatedData.month - 1,
        1
      );
      const endDate = new Date(validatedData.year, validatedData.month, 0); // Último día del mes

      const result = await this.service.generateAttendanceReport(
        validatedData.courseId,
        validatedData.subjectId,
        validatedData.professorId,
        validatedData.managementId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      res.status(200).json({
        ...result,
        reportType: "monthly",
        period: {
          year: validatedData.year,
          month: validatedData.month,
          monthName: new Date(
            validatedData.year,
            validatedData.month - 1
          ).toLocaleDateString("es-ES", { month: "long" }),
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Datos de entrada inválidos",
          details: error.errors,
        });
      }
      this.handleError(res, error);
    }
  }

  // Reporte de asistencia anual (año calendario completo)
  // Params: /yearly/2025/course/1/subject/1/professor/1/management/1
  async generateYearlyReport(req: Request, res: Response) {
    try {
      const { courseId, subjectId, professorId, managementId, year } =
        req.params;

      // Validar parámetros
      const validatedData = yearlyReportSchema.parse({
        courseId: Number(courseId),
        subjectId: Number(subjectId),
        professorId: Number(professorId),
        managementId: Number(managementId),
        year: Number(year),
      });

      const startDate = new Date(validatedData.year, 0, 1); // 1 de enero
      const endDate = new Date(validatedData.year, 11, 31); // 31 de diciembre

      const result = await this.service.generateAttendanceReport(
        validatedData.courseId,
        validatedData.subjectId,
        validatedData.professorId,
        validatedData.managementId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );

      res.status(200).json({
        ...result,
        reportType: "yearly",
        period: {
          year: validatedData.year,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Datos de entrada inválidos",
          details: error.errors,
        });
      }
      this.handleError(res, error);
    }
  }

  // Reporte de asistencia por gestión académica (basado en fechas de la gestión)
  // Params: /management/course/1/subject/1/professor/1/management/1
  async generateManagementReport(req: Request, res: Response) {
    try {
      const { courseId, subjectId, professorId, managementId } = req.params;

      // Validar parámetros
      const validatedData = managementReportSchema.parse({
        courseId: Number(courseId),
        subjectId: Number(subjectId),
        professorId: Number(professorId),
        managementId: Number(managementId),
      });

      // Obtener fechas de la gestión desde la base de datos
      const management = await this.service.getManagementInfo(
        validatedData.managementId
      );

      if (!management) {
        return res.status(404).json({
          ok: false,
          error: "Gestión no encontrada",
        });
      }

      let startDate: string;
      let endDate: string;

      if (management.start_date && management.end_date) {
        startDate = management.start_date.toISOString().split("T")[0];
        endDate = management.end_date.toISOString().split("T")[0];
      } else {
        // Si no hay fechas específicas, usar febrero a diciembre del año de gestión
        const year = management.management;
        startDate = new Date(year, 1, 1).toISOString().split("T")[0]; // Febrero
        endDate = new Date(year, 11, 31).toISOString().split("T")[0]; // Diciembre
      }

      const result = await this.service.generateAttendanceReport(
        validatedData.courseId,
        validatedData.subjectId,
        validatedData.professorId,
        validatedData.managementId,
        startDate,
        endDate
      );

      res.status(200).json({
        ...result,
        reportType: "management",
        period: {
          managementYear: management.management,
          startDate,
          endDate,
          academicPeriod: `Gestión ${management.management}`,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Datos de entrada inválidos",
          details: error.errors,
        });
      }
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Error interno del servidor",
    });
  }
}
