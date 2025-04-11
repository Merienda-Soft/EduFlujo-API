import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PDF_READER: process.env.PDF_READER || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  AUDIENCE: process.env.AUDIENCE || '',
};