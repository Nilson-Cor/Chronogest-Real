import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RootUser } from '../../infrastructure/entities/root-user.entity';
import { RootLoginDto } from '../dtos/root-login.dto';

@Injectable()
export class RootAuthService {
  constructor(
    @InjectRepository(RootUser, 'masterConnection')
    private readonly rootUserRepo: Repository<RootUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: RootLoginDto): Promise<{ access_token: string }> {
    const rootUser = await this.rootUserRepo.findOne({ where: { email: dto.email } });
    if (!rootUser) throw new UnauthorizedException('Credenciales inválidas');

    const valido = await bcrypt.compare(dto.password, rootUser.password);
    if (!valido) throw new UnauthorizedException('Credenciales inválidas');

    const access_token = this.jwtService.sign({
      rootUserId: rootUser.id,
      email: rootUser.email,
      isRoot: true,
    });

    return { access_token };
  }
}
