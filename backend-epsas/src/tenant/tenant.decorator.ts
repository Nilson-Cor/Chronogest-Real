import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para obtener el aplicativoId (tenant) en un controller.
 * TenantGuard debe haber corrido antes (está registrado como APP_GUARD).
 *
 * Uso:
 *   @Get()
 *   obtenerTodos(@TenantId() tenantId: number) {
 *     return this.service.findAll(tenantId);
 *   }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    return request['tenantId'] ?? request.user?.aplicativoId;
  },
);
