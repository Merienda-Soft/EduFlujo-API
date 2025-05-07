import { HttpServer } from './shared/http/server';
import apiRouter from './modules/api.routes';
import { Router } from 'express';

const server = new HttpServer();

// Endpoint de Hola Mundo en la raíz
const rootRouter = Router();
rootRouter.get('/', (req, res) => {
  res.json({ message: '¡Hola Mundo!' });
});

server.addRoute('/', rootRouter);
server.addRoute('/api', apiRouter);
server.start();