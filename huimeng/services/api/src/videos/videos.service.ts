import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { Video } from '../entities/videos.entity';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepo: EntityRepository<Video>,
  ) {}

  async findByProjectId(projectId: string): Promise<Video[]> {
    return this.videoRepo.find({ projectId }, { orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Video | null> {
    return this.videoRepo.findOne({ id });
  }

  async findLatestByProjectId(projectId: string): Promise<Video | null> {
    return this.videoRepo.findOne({ projectId }, { orderBy: { createdAt: 'desc' } });
  }

  async create(data: Partial<Video>): Promise<Video> {
    // Upsert: 如果记录已存在则更新
    if (data.id) {
      const existing = await this.videoRepo.findOne({ id: data.id });
      if (existing) {
        this.videoRepo.assign(existing, data as any);
        await this.videoRepo.getEntityManager().flush();
        return existing;
      }
    }
    const video = this.videoRepo.create({
      ...data,
      id: data.id || uuidv4(),
    } as any);
    await this.videoRepo.getEntityManager().flush();
    return video;
  }

  async update(id: string, data: Partial<Video>): Promise<Video | null> {
    const video = await this.videoRepo.findOne({ id });
    if (!video) return null;
    this.videoRepo.assign(video, data as any);
    await this.videoRepo.getEntityManager().flush();
    return video;
  }

  async delete(id: string): Promise<void> {
    const video = await this.videoRepo.findOne({ id });
    if (video) {
      const em = this.videoRepo.getEntityManager();
      em.remove(video);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const videos = await this.videoRepo.find({ projectId });
    const em = this.videoRepo.getEntityManager();
    for (const video of videos) {
      em.remove(video);
    }
    await em.flush();
  }
}
