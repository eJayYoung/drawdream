import { defineConfig } from '@mikro-orm/postgresql';
import {
  Project,
  MaterialLibrary,
  Script,
  Character,
  Scene,
  Storyboard,
  VideoTimeline,
  Video,
} from './src/entities';

export default defineConfig({
  entities: [
    Project,
    MaterialLibrary,
    Script,
    Character,
    Scene,
    Storyboard,
    VideoTimeline,
    Video,
  ],
  dbName: process.env.POSTGRES_DB || 'huimeng',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
});
