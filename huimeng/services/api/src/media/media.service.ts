import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private materials: Map<string, any> = new Map();

  async findAllByUser(
    userId: string,
    options?: { type?: string; page?: number; pageSize?: number },
  ): Promise<{ items: any[]; total: number }> {
    const { type, page = 1, pageSize = 20 } = options || {};
    let items = Array.from(this.materials.values()).filter(
      (m) => m.userId === userId,
    );

    if (type) {
      items = items.filter((m) => m.type === type);
    }

    const total = items.length;
    items = items
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * pageSize, page * pageSize);

    return { items, total };
  }

  async upload(userId: string, file: any, type: string): Promise<any> {
    const material = {
      id: uuidv4(),
      userId,
      filename: file.originalname,
      url: `https://minio.example.com/${userId}/${type}/${uuidv4()}-${file.originalname}`,
      type,
      size: file.size,
      width: file.width,
      height: file.height,
      duration: file.duration,
      createdAt: new Date(),
    };
    this.materials.set(material.id, material);
    return material;
  }

  async delete(id: string, userId: string): Promise<void> {
    const material = this.materials.get(id);
    if (material && material.userId === userId) {
      this.materials.delete(id);
    }
  }

  getSignedUrl(url: string): string {
    return url;
  }
}
