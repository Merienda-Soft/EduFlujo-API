import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';

export const contentRouter = (() => {
    const router = Router();
    const contentController = new ContentController();
    
    // Subir contenido
    router.post('/:courseId/:subjectId/:managementId', contentController.submitContent.bind(contentController));

    // Obtener contenido
    router.get('/:courseId/:subjectId/:managementId', contentController.getContent.bind(contentController));

    // Eliminar contenido
    router.delete('/:id', contentController.deleteContent.bind(contentController));

    return router;
})(); 