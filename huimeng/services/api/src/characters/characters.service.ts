import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { Character } from '../entities/characters.entity';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private readonly characterRepo: EntityRepository<Character>,
  ) {}

  async findByProjectId(projectId: string): Promise<Character[]> {
    return this.characterRepo.find({ projectId }, { orderBy: { orderIndex: 'asc' } });
  }

  async findOne(id: string): Promise<Character | null> {
    return this.characterRepo.findOne({ id });
  }

  async create(data: Partial<Character>): Promise<Character> {
    // Upsert: 如果记录已存在则更新，否则创建
    if (data.id) {
      const em = this.characterRepo.getEntityManager();
      const existing = await this.characterRepo.findOne({ id: data.id });
      if (existing) {
        em.assign(existing, data as any);
        await em.flush();
        return existing;
      }
      // 不存在则创建
      const character = em.create(Character, { ...data, id: data.id } as any);
      await em.persist(character).flush();
      return character;
    }
    const character = this.characterRepo.create({
      ...data,
      id: uuidv4(),
    } as any);
    await this.characterRepo.getEntityManager().flush();
    return character;
  }

  async createMany(items: Partial<Character>[]): Promise<Character[]> {
    const characters: Character[] = [];
    for (const item of items) {
      const char = await this.create(item);
      characters.push(char);
    }
    return characters;
  }

  async update(id: string, data: Partial<Character>): Promise<Character | null> {
    const character = await this.characterRepo.findOne({ id });
    if (!character) return null;
    this.characterRepo.assign(character, data as any);
    await this.characterRepo.getEntityManager().flush();
    return character;
  }

  async delete(id: string): Promise<void> {
    const character = await this.characterRepo.findOne({ id });
    if (character) {
      const em = this.characterRepo.getEntityManager();
      em.remove(character);
      await em.flush();
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const characters = await this.characterRepo.find({ projectId });
    const em = this.characterRepo.getEntityManager();
    for (const character of characters) {
      em.remove(character);
    }
    await em.flush();
  }
}
