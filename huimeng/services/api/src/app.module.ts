import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { WorkflowModule } from './workflow/workflow.module';
import { GenerationModule } from './generation/generation.module';
import { MediaModule } from './media/media.module';
import { CommonModule } from './common/common.module';
import { MaterialsModule } from './materials/materials.module';
import { ScriptsModule } from './scripts/scripts.module';
import { CharactersModule } from './characters/characters.module';
import { ScenesModule } from './scenes/scenes.module';
import { StoryboardsModule } from './storyboards/storyboards.module';
import { VideoTimelinesModule } from './video-timelines/video-timelines.module';
import { VideosModule } from './videos/videos.module';
import {
  Project,
  MaterialLibrary,
  Script,
  Character,
  Scene,
  Storyboard,
  VideoTimeline,
  Video,
} from './entities';
import { LoggingInterceptor } from './common/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
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
        dbName: configService.get('POSTGRES_DB') || 'huimeng',
        host: configService.get('POSTGRES_HOST') || 'localhost',
        port: parseInt(configService.get('POSTGRES_PORT') || '5432'),
        user: configService.get('POSTGRES_USER') || 'postgres',
        password: configService.get('POSTGRES_PASSWORD') || 'postgres',
        driver: PostgreSqlDriver,
        debug: configService.get('NODE_ENV') === 'development',
        allowGlobalContext: true,
      } as any),
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    UserModule,
    ProjectModule,
    WorkflowModule,
    GenerationModule,
    MediaModule,
    MaterialsModule,
    ScriptsModule,
    CharactersModule,
    ScenesModule,
    StoryboardsModule,
    VideoTimelinesModule,
    VideosModule,
  ],
  providers: [LoggingInterceptor],
})
export class AppModule {}
