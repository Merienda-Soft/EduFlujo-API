import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../../core/config/env';
import Database from '../database/connection';

export class HttpServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.connectToDatabase();
  }

  private setupMiddlewares(): void {
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(express.json());
  }

  private async connectToDatabase(): Promise<void> {
    await Database.connect();
  }

  public addRoute(prefix: string, router: express.Router): void {
    this.app.use(prefix, router);
  }

  public start(): void {
    const server = this.app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });

    // Manejar cierre limpio
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(async () => {
        await Database.disconnect();
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully');
      server.close(async () => {
        await Database.disconnect();
        console.log('Server closed');
        process.exit(0);
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}