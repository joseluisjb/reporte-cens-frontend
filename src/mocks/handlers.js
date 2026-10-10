// Simula el backend Django según el contrato `docs/contrato/openapi.yaml` (0.2); rutas en lib/api/endpoints.js.
// Responde como lo haría DRF: errores en { detail } o { campo: ['mensaje'] }.
// Un archivo por módulo en `rutas/`; el orden importa (MSW usa el primer handler que coincide).
import { authHandlers } from './rutas/auth'
import { conceptosHandlers } from './rutas/conceptos'
import { gruposHandlers } from './rutas/grupos'
import { usuariosHandlers } from './rutas/usuarios'

export const handlers = [...authHandlers, ...usuariosHandlers, ...conceptosHandlers, ...gruposHandlers]
