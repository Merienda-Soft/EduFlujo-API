import { Request, Response } from 'express';
import { ContentService } from '../services/content.service';

export class ContentController {
    private contentService: ContentService;

    constructor() {
        this.contentService = new ContentService();
    }

    async submitContent(req: Request, res: Response) {
        try {
            const { courseId, subjectId, managementId } = req.params;
            const { file, created_by } = req.body;

            if (!courseId || !subjectId || !managementId || !file) {
                return res.status(400).json({
                    ok: false,
                    message: 'Faltan parámetros requeridos'
                });
            }

            const result = await this.contentService.submitContent(
                Number(courseId),
                Number(subjectId),
                Number(managementId),
                file,
                created_by
            );

            return res.status(200).json({
                ok: true,
                message: 'Contenido subido exitosamente',
                data: result
            });
        } catch (error: any) {
            return res.status(500).json({
                ok: false,
                message: error.message || 'Error al subir el contenido'
            });
        }
    }

    async getContent(req: Request, res: Response) {
        try {
            const { courseId, subjectId, managementId } = req.params;

            if (!courseId || !subjectId || !managementId) {
                return res.status(400).json({
                    ok: false,
                    message: 'Faltan parámetros requeridos'
                });
            }

            const result = await this.contentService.getContent(
                Number(courseId),
                Number(subjectId),
                Number(managementId)
            );

            if (!result) {
                return res.status(404).json({
                    ok: false,
                    message: 'Contenido no encontrado'
                });
            }

            return res.status(200).json({
                ok: true,
                data: result
            });
        } catch (error: any) {
            return res.status(500).json({
                ok: false,
                message: error.message || 'Error al obtener el contenido'
            });
        }
    }

    async deleteContent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deleted_by } = req.body;

            if (!id) {
                return res.status(400).json({
                    ok: false,
                    message: 'ID del contenido es requerido'
                });
            }

            await this.contentService.deleteContent(Number(id), deleted_by);

            return res.status(200).json({
                ok: true,
                message: 'Contenido eliminado exitosamente'
            });
        } catch (error: any) {
            if (error.code === 'P2025') {
                return res.status(404).json({
                    ok: false,
                    message: 'Contenido no encontrado'
                });
            }
            return res.status(500).json({
                ok: false,
                message: error.message || 'Error al eliminar el contenido'
            });
        }
    }
} 