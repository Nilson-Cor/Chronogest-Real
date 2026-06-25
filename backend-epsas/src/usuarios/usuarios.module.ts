import { Module } from '@nestjs/common';
import { usuarioController } from './infrastructure/controllers/usuario.controller';
import { usuarioService } from './application/services/usuario.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [usuarioController],
    providers: [usuarioService],
    exports: [usuarioService]
})
export class UsuariosModule { }
