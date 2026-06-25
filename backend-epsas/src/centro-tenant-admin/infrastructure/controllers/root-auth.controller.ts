import { Controller, Post, Body } from '@nestjs/common';
import { RootAuthService } from '../../application/services/root-auth.service';
import { RootLoginDto } from '../../application/dtos/root-login.dto';
import { Public } from '../../../auth/public.decorator';

@Public()
@Controller('root/auth')
export class RootAuthController {
  constructor(private readonly rootAuthService: RootAuthService) {}

  @Post('login')
  login(@Body() dto: RootLoginDto) {
    return this.rootAuthService.login(dto);
  }
}
