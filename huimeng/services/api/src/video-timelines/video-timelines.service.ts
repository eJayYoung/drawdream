import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { VideoTimeline } from '../entities/video_timelines.entity';

@Injectable()
export class VideoTimelinesService {
  constructor(
    @InjectRepository(VideoTimeline)
    private readonly timelineRepo: EntityRepository<VideoTimeline>,
  ) {}

  async findByProjectId(projectId: string): Promise<VideoTimeline[]> {
    return this.timelineRepo.find({ projectId }, { orderBy: { timeSeconds: 'asc' } });
  }

  async findByStoryboardId(storyboardId: string): Promise<VideoTimeline[]> {
    return this.timelineRepo.find({ storyboardId }, { orderBy: { timeSeconds: 'asc' } });
  }

  async findOne(id: string): Promise<VideoTimeline | null> {
    return this.timelineRepo.findOne({ id });
  }

  async create(data: Partial<VideoTimeline>): Promise<VideoTimeline> {
    // Upsert: 如果记录已存在则更新
    if (data.id) {
      const existing = await this.timelineRepo.findOne({ id: data.id });
      if (existing) {
        this.timelineRepo.assign(existing, data as any);
        await this.timelineRepo.getEntityManager().flush();
        return existing;
      }
    }
    const timeline = this.timelineRepo.create({
      ...data,
      id: data.id || uuidv4(),
    } as any);
    await this.timelineRepo.getEntityManager().flush();
    return timeline;
  }

  async createMany(items: Partial<VideoTimeline>[]): Promise<VideoTimeline[]> {
    const timelines = items.map(item => this.timelineRepo.create({
      ...item,
      id: item.id || uuidv4(),
    } as any));
    await this.timelineRepo.getEntityManager().flush();
    return timelines;
  }

  async update(id: string, data: Partial<VideoTimeline>): Promise<VideoTimeline | null> {
    const timeline = await this.timelineRepo.findOne({ id });
    if (!timeline) return null;
    this.timelineRepo.assign(timeline, data as any);
    await this.timelineRepo.getEntityManager().flush();
    return timeline;
  }

  async delete(id: string): Promise<void> {
    const timeline = await this.timelineRepo.findOne({ id });
    if (timeline) {
      const em = this.timelineRepo.getEntityManager();
      em.remove(timeline);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const timelines = await this.timelineRepo.find({ projectId });
    const em = this.timelineRepo.getEntityManager();
    for (const timeline of timelines) {
      em.remove(timeline);
    }
    await em.flush();
  }

  async deleteByStoryboardId(storyboardId: string): Promise<void> {
    const timelines = await this.timelineRepo.find({ storyboardId });
    const em = this.timelineRepo.getEntityManager();
    for (const timeline of timelines) {
      em.remove(timeline);
    }
    await em.flush();
  }
}
