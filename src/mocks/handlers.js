// Simula el backend Django según el contrato `docs/contrato/openapi.yaml` (0.9); rutas en lib/api/endpoints.js.
// Responde como lo haría DRF: errores en { detail } o { campo: ['mensaje'] }.
// Un archivo por módulo en `rutas/`; el orden importa (MSW usa el primer handler que coincide).
import { auditoriaHandlers } from './rutas/auditoria'
import { authHandlers } from './rutas/auth'
import { catalogosHandlers } from './rutas/catalogos'
import { ciclosHandlers } from './rutas/ciclos'
import { conceptosHandlers } from './rutas/conceptos'
import { entidadHandlers } from './rutas/entidad'
import { extraccionesHandlers } from './rutas/extracciones'
import { gruposHandlers } from './rutas/grupos'
import { obligacionesHandlers } from './rutas/obligaciones'
import { panelHandlers } from './rutas/panel'
import { saludHandlers } from './rutas/salud'
import { usuariosHandlers } from './rutas/usuarios'

export const handlers = [
  ...saludHandlers,
  ...authHandlers,
  ...usuariosHandlers,
  ...conceptosHandlers,
  ...gruposHandlers,
  ...extraccionesHandlers,
  ...auditoriaHandlers,
  // Iteración 2 (contrato 0.9, propuestas)
  ...obligacionesHandlers,
  ...catalogosHandlers,
  ...entidadHandlers,
  ...panelHandlers,
  ...ciclosHandlers,
]
