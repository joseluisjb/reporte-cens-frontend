// Única fuente de verdad de las pantallas internas: menú, rutas y roles salen de aquí.
// Para agregar una pantalla: crea su página en features/<modulo>/ y añade una fila.
import { lazy } from 'react'

export const NAV_ITEMS = [
  { path: '/panel', label: 'Inicio', icon: 'home', adminOnly: false, Page: lazy(() => import('../features/home/HomePage')) },
  { path: '/extraccion', label: 'Extracción de Cartera', icon: 'bolt', adminOnly: false, Page: lazy(() => import('../features/extraction/ExtractionPage')) },
  { path: '/parametrizacion', label: 'Parametrización de Conceptos', icon: 'gear', adminOnly: true, Page: lazy(() => import('../features/parameters/ParametersPage')) },
  { path: '/usuarios', label: 'Gestión de Usuarios', icon: 'user', adminOnly: true, Page: lazy(() => import('../features/users/UsersPage')) },
  { path: '/auditoria', label: 'Auditoría', icon: 'shield', adminOnly: true, Page: lazy(() => import('../features/audit/AuditPage')) },
]

export const RUTA_INICIAL = '/panel'
export const RUTA_LOGIN = '/login'
