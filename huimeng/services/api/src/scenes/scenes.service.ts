import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { Scene } from '../entities/scenes.entity';

@Injectable()
export class ScenesService {
  constructor(
    @InjectRepository(Scene)
    private readonly sceneRepo: EntityRepository<Scene>,
  ) {}

  async findByProjectId(projectId: string): Promise<Scene[]> {
    return this.sceneRepo.find({ projectId }, { orderBy: { orderIndex: 'asc' } });
  }

  async findOne(id: string): Promise<Scene | null> {
    return this.sceneRepo.findOne({ id });
  }

  async create(data: Partial<Scene>): Promise<Scene> {
    // Upsert: 如果记录已存在则更新
    if (data.id) {
      const existing = await this.sceneRepo.findOne({ id: data.id });
      if (existing) {
        this.sceneRepo.assign(existing, data as any);
        await this.sceneRepo.getEntityManager().flush();
        return existing;
      }
    }
    const scene = this.sceneRepo.create({
      ...data,
      id: data.id || uuidv4(),
    } as any);
    await this.sceneRepo.getEntityManager().flush();
    return scene;
  }

  async createMany(items: Partial<Scene>[]): Promise<Scene[]> {
    const scenes = items.map(item => this.sceneRepo.create({
      ...item,
      id: item.id || uuidv4(),
    } as any));
    await this.sceneRepo.getEntityManager().flush();
    return scenes;
  }

  async update(id: string, data: Partial<Scene>): Promise<Scene | null> {
    const scene = await this.sceneRepo.findOne({ id });
    if (!scene) return null;
    this.sceneRepo.assign(scene, data as any);
    await this.sceneRepo.getEntityManager().flush();
    return scene;
  }

  async delete(id: string): Promise<void> {
    const scene = await this.sceneRepo.findOne({ id });
    if (scene) {
      const em = this.sceneRepo.getEntityManager();
      em.remove(scene);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const scenes = await this.sceneRepo.find({ projectId });
    const em = this.sceneRepo.getEntityManager();
    for (const scene of scenes) {
      em.remove(scene);
    }
    await em.flush();
  }
}
