import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { Storyboard } from '../entities/storyboards.entity';

@Injectable()
export class StoryboardsService {
  constructor(
    @InjectRepository(Storyboard)
    private readonly storyboardRepo: EntityRepository<Storyboard>,
  ) {}

  async findByProjectId(projectId: string): Promise<Storyboard[]> {
    return this.storyboardRepo.find({ projectId }, { orderBy: { orderIndex: 'asc' } });
  }

  async findByEpisodeId(episodeId: string): Promise<Storyboard[]> {
    return this.storyboardRepo.find({ episodeId }, { orderBy: { orderIndex: 'asc' } });
  }

  async findOne(id: string): Promise<Storyboard | null> {
    return this.storyboardRepo.findOne({ id });
  }

  async create(data: Partial<Storyboard>): Promise<Storyboard> {
    // Upsert: 如果记录已存在则更新
    if (data.id) {
      const existing = await this.storyboardRepo.findOne({ id: data.id });
      if (existing) {
        this.storyboardRepo.assign(existing, data as any);
        await this.storyboardRepo.getEntityManager().flush();
        return existing;
      }
    }
    const storyboard = this.storyboardRepo.create({
      ...data,
      id: data.id || uuidv4(),
    } as any);
    await this.storyboardRepo.getEntityManager().flush();
    return storyboard;
  }

  async createMany(items: Partial<Storyboard>[]): Promise<Storyboard[]> {
    const storyboards: Storyboard[] = [];
    for (const item of items) {
      const sb = await this.create(item);
      storyboards.push(sb);
    }
    return storyboards;
  }

  async update(id: string, data: Partial<Storyboard>): Promise<Storyboard | null> {
    const storyboard = await this.storyboardRepo.findOne({ id });
    if (!storyboard) return null;
    this.storyboardRepo.assign(storyboard, data as any);
    await this.storyboardRepo.getEntityManager().flush();
    return storyboard;
  }

  async updateImageUrl(id: string, imageUrl: string, comfyAssetId?: string): Promise<void> {
    const storyboard = await this.storyboardRepo.findOne({ id });
    if (storyboard) {
      this.storyboardRepo.assign(storyboard, {
        imageUrl,
        comfyAssetId: comfyAssetId || null,
        status: 'completed',
        generatedAt: new Date().toISOString(),
      } as any);
      await this.storyboardRepo.getEntityManager().flush();
    }
  }

  async delete(id: string): Promise<void> {
    const storyboard = await this.storyboardRepo.findOne({ id });
    if (storyboard) {
      const em = this.storyboardRepo.getEntityManager();
      em.remove(storyboard);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const storyboards = await this.storyboardRepo.find({ projectId });
    const em = this.storyboardRepo.getEntityManager();
    for (const storyboard of storyboards) {
      em.remove(storyboard);
    }
    await em.flush();
  }
}
