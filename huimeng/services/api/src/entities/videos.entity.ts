import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type VideoStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'failed';

@Entity()
@Index({ name: 'idx_videos_project_id', properties: ['projectId'] })
export class Video {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string' })
  title: string;

  @Property({ type: 'string', nullable: true })
  videoUrl?: string;

  @Property({ type: 'string', nullable: true })
  materialLibraryId?: string;

  @Property({ type: 'string', default: 'idle' })
  status: VideoStatus;

  @Property({ type: 'string', nullable: true })
  generationTaskId?: string;

  @Property({ type: 'number', nullable: true })
  duration?: number;

  @Property({ type: 'json', nullable: true })
  metadata?: any;

  @Property({ type: 'date', nullable: true })
  generatedAt?: Date;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
