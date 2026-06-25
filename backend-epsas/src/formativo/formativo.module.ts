import { Module } from '@nestjs/common';
import { FormativoController } from './formativo.controller';
import { PersonasModule } from '../personas/personas.module';
import { AreasModule } from '../areas/areas.module';
import { AmbientesModule } from '../ambientes/ambientes.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [
        CommonModule,
        PersonasModule,
        AreasModule,
        AmbientesModule,
    ],
    controllers: [FormativoController],
})
export class FormativoModule {}
