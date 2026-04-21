import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../common/redis.service';

const USER_KEY_PREFIX = 'huimeng:user:';
const VERIFICATION_CODE_PREFIX = 'huimeng:code:';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async sendCode(phone: string): Promise<{ success: boolean; code?: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(
      `${VERIFICATION_CODE_PREFIX}${phone}`,
      code,
      600,
    );
    console.log(`[DEV] Verification code for ${phone}: ${code}`);
    return { success: true, code };
  }

  async phoneLogin(phone: string, code: string): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const storedCode = await this.redisService.get(
      `${VERIFICATION_CODE_PREFIX}${phone}`,
    );
    if (!storedCode || storedCode !== code) {
      throw new Error('验证码错误');
    }

    await this.redisService.del(`${VERIFICATION_CODE_PREFIX}${phone}`);

    const userKeys = await this.redisService.keys(`${USER_KEY_PREFIX}*`);
    let user: any = null;

    for (const key of userKeys) {
      const userData = await this.redisService.getJson<any>(key);
      if (userData?.phone === phone) {
        user = userData;
        break;
      }
    }

    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        unionId: `phone_${phone}`,
        nickname: `用户${phone.slice(-4)}`,
        phone,
        createdAt: new Date().toISOString(),
      };
      await this.redisService.setJson(
        `${USER_KEY_PREFIX}${user.id}`,
        user,
        86400 * 30,
      );
    }

    user.lastLoginAt = new Date().toISOString();
    await this.redisService.setJson(
      `${USER_KEY_PREFIX}${user.id}`,
      user,
      86400 * 30,
    );

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        unionId: user.unionId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
      isNewUser: !user.nickname || user.nickname.startsWith('用户'),
    };
  }

  async wechatCallback(code: string): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
  }> {
    const mockOpenid = `wechat_${code || 'dev'}`;
    const userKeys = await this.redisService.keys(`${USER_KEY_PREFIX}*`);
    let user: any = null;

    for (const key of userKeys) {
      const userData = await this.redisService.getJson<any>(key);
      if (userData?.wechatOpenid === mockOpenid) {
        user = userData;
        break;
      }
    }

    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        unionId: `wechat_${code || 'dev'}`,
        nickname: '微信用户',
        wechatOpenid: mockOpenid,
        createdAt: new Date().toISOString(),
      };
      await this.redisService.setJson(
        `${USER_KEY_PREFIX}${user.id}`,
        user,
        86400 * 30,
      );
    }

    user.lastLoginAt = new Date().toISOString();
    await this.redisService.setJson(
      `${USER_KEY_PREFIX}${user.id}`,
      user,
      86400 * 30,
    );

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        unionId: user.unionId,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async validateToken(payload: { sub: string }): Promise<any> {
    const user = await this.redisService.getJson<any>(
      `${USER_KEY_PREFIX}${payload.sub}`,
    );
    return user;
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, unionId: user.unionId };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }
}
