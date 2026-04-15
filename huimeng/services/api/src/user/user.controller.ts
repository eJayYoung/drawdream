import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('用户')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getMe(@Request() req: any) {
    const user = await this.userService.findById(req.user.id);
    return {
      id: user!.id,
      unionId: user!.unionId,
      nickname: user!.nickname,
      avatarUrl: user!.avatarUrl,
      createdAt: user!.createdAt,
    };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户资料' })
  async updateProfile(
    @Request() req: any,
    @Body() body: { nickname?: string; avatarUrl?: string },
  ) {
    const user = await this.userService.updateProfile(req.user.id, body);
    return {
      id: user.id,
      unionId: user.unionId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }
}
