import { defineConfig } from '@mikro-orm/postgresql';
import { Project, Episode, Character } from './src/entities';

export default defineConfig({
  entities: [Project, Episode, Character],
  dbName: process.env.POSTGRES_DB || 'huimeng',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
});
