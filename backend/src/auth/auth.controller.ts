import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, EnrollFaceDto, FaceVerifyDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Bir martalik yuz saqlash (faceEnrolled = false bo'lganda ishlaydi)
  @Post('enroll-face')
  enrollFace(@Body() dto: EnrollFaceDto) {
    return this.authService.enrollFace(dto);
  }

  @Post('face-verify')
  verifyFace(@Body() dto: FaceVerifyDto) {
    return this.authService.verifyFace(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}
