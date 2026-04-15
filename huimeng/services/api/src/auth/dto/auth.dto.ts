import { IsPhoneNumber, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCodeDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsPhoneNumber('CN')
  phone!: string;
}

export class PhoneLoginDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsPhoneNumber('CN')
  phone!: string;

  @ApiProperty({ description: '验证码', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class WechatCallbackDto {
  @ApiProperty({ description: '微信授权码' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: '微信OpenID' })
  @IsString()
  @IsOptional()
  openid?: string;

  @ApiProperty({ description: '用户ID' })
  @IsString()
  @IsOptional()
  userId?: string;
}
