import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { Script } from '../entities/scripts.entity';

@Injectable()
export class ScriptsService {
  constructor(
    @InjectRepository(Script)
    private readonly scriptRepo: EntityRepository<Script>,
  ) {}

  async findByProjectId(projectId: string): Promise<Script[]> {
    return this.scriptRepo.find({ projectId }, { orderBy: { orderIndex: 'asc' } });
  }

  async findOne(id: string): Promise<Script | null> {
    return this.scriptRepo.findOne({ id });
  }

  async create(data: Partial<Script>): Promise<Script> {
    // Upsert: 如果记录已存在则更新
    if (data.id) {
      const existing = await this.scriptRepo.findOne({ id: data.id });
      if (existing) {
        this.scriptRepo.assign(existing, data as any);
        await this.scriptRepo.getEntityManager().flush();
        return existing;
      }
    }
    console.log('[ScriptsService] create called with:', JSON.stringify(data));
    const script = this.scriptRepo.create({
      ...data,
      id: data.id || uuidv4(),
    } as any);
    await this.scriptRepo.getEntityManager().flush();
    console.log('[ScriptsService] created:', script.id);
    return script;
  }

  async update(id: string, data: Partial<Script>): Promise<Script | null> {
    const script = await this.scriptRepo.findOne({ id });
    if (!script) return null;
    this.scriptRepo.assign(script, data as any);
    await this.scriptRepo.getEntityManager().flush();
    return script;
  }

  async delete(id: string): Promise<void> {
    const script = await this.scriptRepo.findOne({ id });
    if (script) {
      const em = this.scriptRepo.getEntityManager();
      em.remove(script);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const scripts = await this.scriptRepo.find({ projectId });
    const em = this.scriptRepo.getEntityManager();
    for (const script of scripts) {
      em.remove(script);
    }
    await em.flush();
  }
}
