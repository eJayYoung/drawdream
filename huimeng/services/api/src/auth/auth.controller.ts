import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendCodeDto, PhoneLoginDto, WechatCallbackDto } from './dto/auth.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('phone/send-code')
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    return this.authService.sendCode(sendCodeDto.phone);
  }

  @Post('phone/login')
  @ApiOperation({ summary: '手机号登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  async phoneLogin(@Body() phoneLoginDto: PhoneLoginDto) {
    return this.authService.phoneLogin(phoneLoginDto.phone, phoneLoginDto.code);
  }

  @Get('wechat/qrcode')
  @ApiOperation({ summary: '获取微信登录二维码' })
  async getWechatQrcode() {
    return {
      url: 'https://open.weixin.qq.com/connect/qrconnect?appid=wxXXXXXXXX&redirect_uri=...',
      state: 'wechat_login_state',
    };
  }

  @Post('wechat/callback')
  @ApiOperation({ summary: '微信OAuth回调' })
  async wechatCallback(@Body() callbackDto: WechatCallbackDto) {
    return this.authService.wechatCallback(callbackDto.code || callbackDto.openid || '');
  }

  @Post('bind-phone')
  @ApiOperation({ summary: '绑定手机号' })
  async bindPhone(@Body() dto: { userId: string; phone: string; code: string }) {
    return { success: true };
  }
}
