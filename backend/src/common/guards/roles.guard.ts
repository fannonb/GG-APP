import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import type { AuthenticatedUser } from '../types/authenticated-user.type'

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly reflector: Reflector

  constructor(@Inject(Reflector) reflector: Reflector) {
    this.reflector = reflector
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) return true

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    const role = request.user?.role?.toUpperCase()

    return !!role && requiredRoles.includes(role)
  }
}
