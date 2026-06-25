import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  Matches,
} from 'class-validator';

export class CreateCentroTenantDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El slug debe ser texto' })
  @IsNotEmpty({ message: 'El slug es obligatorio' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones',
  })
  slug: string;

  @IsString({ message: 'El dominio debe ser texto' })
  @IsNotEmpty({ message: 'El dominio es obligatorio' })
  dominio: string;

  @IsOptional()
  @IsIn(['activo', 'inactivo'], { message: 'El estado debe ser activo o inactivo' })
  estado?: 'activo' | 'inactivo';

  @IsString({ message: 'epsasDbName debe ser texto' })
  @IsNotEmpty({ message: 'epsasDbName es obligatorio' })
  epsasDbName: string;

  @IsOptional()
  @IsString({ message: 'epsasDbHost debe ser texto' })
  epsasDbHost?: string;

  @IsOptional()
  @IsInt({ message: 'epsasDbPort debe ser un número entero' })
  epsasDbPort?: number;

  @IsString({ message: 'horariosDbName debe ser texto' })
  @IsNotEmpty({ message: 'horariosDbName es obligatorio' })
  horariosDbName: string;

  @IsOptional()
  @IsString({ message: 'horariosDbHost debe ser texto' })
  horariosDbHost?: string;

  @IsOptional()
  @IsInt({ message: 'horariosDbPort debe ser un número entero' })
  horariosDbPort?: number;
}
