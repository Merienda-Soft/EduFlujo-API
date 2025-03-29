import { HttpServer } from './shared/http/server';
import apiRouter from './modules/api.routes';

const server = new HttpServer();
server.addRoute('/api', apiRouter);
server.start();