import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload) throw new UnauthorizedException('Token inválido');
    return {
      id: payload.id ?? payload.personaId,
      rol: payload.rol,
      nombre: payload.nombre,
      apellido: payload.apellido,
      esLider: payload.esLider ?? false,
      areaLiderada: payload.areaLiderada ?? null,
      fichaId: payload.fichaId ?? null,
      idUsuario: payload.idUsuario,
      login: payload.login,
      aplicativoId: payload.aplicativoId,
      rolId: payload.rolId,
      cargo: payload.cargo,
      centroSlug: payload.centroSlug,
    };
  }
}
