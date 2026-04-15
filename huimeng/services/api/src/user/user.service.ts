import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  private users: Map<string, any> = new Map();

  async findById(id: string): Promise<any | null> {
    return this.users.get(id) || null;
  }

  async updateProfile(
    userId: string,
    data: { nickname?: string; avatarUrl?: string },
  ): Promise<any> {
    let user = this.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        unionId: `user_${userId}`,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
    }

    if (data.nickname) user.nickname = data.nickname;
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;
    this.users.set(userId, user);

    return user;
  }
}
