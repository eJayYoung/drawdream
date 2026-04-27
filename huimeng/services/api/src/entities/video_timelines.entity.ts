import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type TimelineStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'failed';

export interface KeyframeVariant {
  id: string;
  materialLibraryId?: string;
  imageUrl: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  taskId: string;
  prompt: string;
  error: string;
  createdAt: string;
}

@Entity()
@Index({ name: 'idx_video_timelines_project_id', properties: ['projectId'] })
@Index({ name: 'idx_video_timelines_storyboard_id', properties: ['storyboardId'] })
export class VideoTimeline {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string' })
  storyboardId: string;

  @Property({ type: 'string' })
  label: string;

  @Property({ type: 'number' })
  timeSeconds: number;

  @Property({ type: 'number' })
  frameNumber: number;

  @Property({ type: 'number', default: 24 })
  fps: number;

  @Property({ type: 'text', nullable: true })
  prompt?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'number', default: 1 })
  generateCount: number;

  @Property({ type: 'string', nullable: true })
  selectedVariantId?: string;

  @Property({ type: 'json', nullable: true })
  variants?: KeyframeVariant[];

  @Property({ type: 'string', default: 'idle' })
  status: TimelineStatus;

  @Property({ type: 'string', default: 'ai' })
  source: 'ai' | 'manual';

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
