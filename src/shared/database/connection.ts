import { PrismaClient } from '@prisma/client';
import { env } from '../../core/config/env';

class Database {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        datasources: {
          db: {
            url: env.DATABASE_URL,
          },
        },
        log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    }
    return Database.instance;
  }

  public static async connect(): Promise<void> {
    try {
      await Database.getInstance().$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection error:', error);
      process.exit(1);
    }
  }

  public static async disconnect(): Promise<void> {
    await Database.getInstance().$disconnect();
    console.log('Database disconnected');
  }
}

export default Database;