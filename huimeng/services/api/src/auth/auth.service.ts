import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  private users: Map<string, any> = new Map();
  private verificationCodes: Map<string, { code: string; expiresAt: Date }> = new Map();

  async sendCode(phone: string): Promise<{ success: boolean; code?: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCodes.set(phone, {
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    console.log(`[DEV] Verification code for ${phone}: ${code}`);
    // Return code in response for dev testing
    return { success: true, code };
  }

  async phoneLogin(phone: string, code: string): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const stored = this.verificationCodes.get(phone);
    if (!stored || stored.code !== code) {
      throw new Error('验证码错误');
    }
    if (stored.expiresAt < new Date()) {
      throw new Error('验证码已过期');
    }

    let user = Array.from(this.users.values()).find((u) => u.phone === phone);
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        unionId: `phone_${phone}`,
        nickname: `用户${phone.slice(-4)}`,
        phone,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
    }

    user.lastLoginAt = new Date();
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
    let user = Array.from(this.users.values()).find((u) => u.wechatOpenid === mockOpenid);

    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        unionId: `wechat_${code || 'dev'}`,
        nickname: '微信用户',
        wechatOpenid: mockOpenid,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
    }

    user.lastLoginAt = new Date();
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
    return this.users.get(payload.sub);
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, unionId: user.unionId };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }
}
