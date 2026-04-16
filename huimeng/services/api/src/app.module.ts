import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';
import { WorkflowModule } from './workflow/workflow.module';
import { GenerationModule } from './generation/generation.module';
import { MediaModule } from './media/media.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    CommonModule,
    AuthModule,
    UserModule,
    ProjectModule,
    WorkflowModule,
    GenerationModule,
    MediaModule,
  ],
})
export class AppModule {}
