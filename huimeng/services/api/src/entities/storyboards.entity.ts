import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type StoryboardStatus = 'idle' | 'queued' | 'generating' | 'completed' | 'failed';
export type StoryboardSource = 'ai' | 'manual';

@Entity()
@Index({ name: 'idx_storyboards_project_id', properties: ['projectId'] })
@Index({ name: 'idx_storyboards_episode_id', properties: ['episodeId'] })
export class Storyboard {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string', nullable: true })
  episodeId?: string;

  @Property({ type: 'string', nullable: true })
  scriptId?: string;

  @Property({ type: 'string' })
  title: string;

  @Property({ type: 'number' })
  shotNumber: number;

  @Property({ type: 'number' })
  sceneNumber: number;

  @Property({ type: 'string', nullable: true })
  sceneLabel?: string;

  @Property({ type: 'string', nullable: true })
  shotType?: string;

  @Property({ type: 'string', nullable: true })
  cameraAngle?: string;

  @Property({ type: 'string', nullable: true })
  cameraMovement?: string;

  @Property({ type: 'string', nullable: true })
  composition?: string;

  @Property({ type: 'string', nullable: true })
  lens?: string;

  @Property({ type: 'string', nullable: true })
  beat?: string;

  @Property({ type: 'string', nullable: true })
  action?: string;

  @Property({ type: 'text', nullable: true })
  dialogue?: string;

  @Property({ type: 'text', nullable: true })
  narration?: string;

  @Property({ type: 'text', nullable: true })
  imagePrompt?: string;

  @Property({ type: 'string', nullable: true })
  negativePrompt?: string;

  @Property({ type: 'string', nullable: true })
  imageUrl?: string;

  @Property({ type: 'string', nullable: true })
  comfyAssetId?: string;

  @Property({ type: 'json', nullable: true })
  allImageUrls?: string[];

  @Property({ type: 'json', nullable: true })
  allComfyAssetIds?: string[];

  @Property({ type: 'number', default: 5 })
  durationSeconds: number;

  @Property({ type: 'string', default: 'idle' })
  status: StoryboardStatus;

  @Property({ type: 'string', default: 'ai' })
  source: StoryboardSource;

  @Property({ type: 'string', nullable: true })
  generationTaskId?: string;

  @Property({ type: 'string', nullable: true })
  generatedAt?: string;

  @Property({ type: 'number', default: 0 })
  orderIndex: number;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
