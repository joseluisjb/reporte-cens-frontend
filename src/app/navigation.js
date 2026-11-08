// Única fuente de verdad de las pantallas internas: menú, rutas y roles salen de aquí.
// Para agregar una pantalla: crea su página en features/<modulo>/ y añade una fila.
//
// `roles`: quién puede abrirla. `null` = los dos roles; `SOLO_ADMIN` o `SOLO_ANALISTA` = solo ese rol.
// El menú muestra todas las opciones: las que el rol no puede abrir salen bloqueadas (candado y
// etiqueta ADMIN o ANALISTA) y, si se abren, muestran «Acceso restringido», igual que por URL.
// `section`: título del grupo del menú (`null` = sin grupo, arriba). El orden sigue a la maqueta v3.
import { lazy } from 'react'
import { ROLES } from '../features/auth/roles'

export const SOLO_ADMIN = [ROLES.ADMIN]
export const SOLO_ANALISTA = [ROLES.ANALISTA]

export const SECCIONES = ['Extracción', 'Ciclo de vida', 'Reporte a TransUnion', 'Administración']

// Pantallas de la Iteración 2 que todavía no existen: muestran «Pantalla en construcción».
const enConstruccion = (nombre) => lazy(() => import('./pantallasEnConstruccion').then((m) => ({ default: m[nombre] })))

export const NAV_ITEMS = [
  { path: '/panel', label: 'Inicio', icon: 'home', roles: null, section: null, Page: lazy(() => import('../features/home/HomePage')) },
  { path: '/extraccion', label: 'Extracción de Cartera', icon: 'bolt', roles: null, section: 'Extracción', Page: lazy(() => import('../features/extraction/ExtractionPage')) },
  { path: '/parametrizacion', label: 'Parametrización de Conceptos', icon: 'gear', roles: SOLO_ADMIN, section: 'Extracción', Page: lazy(() => import('../features/parameters/ParametersPage')) },
  { path: '/obligaciones', label: 'Obligaciones y Estados', icon: 'list', roles: SOLO_ANALISTA, section: 'Ciclo de vida', Page: enConstruccion('Obligaciones') },
  { path: '/ciclo', label: 'Actualización Mensual', icon: 'refresh', roles: SOLO_ANALISTA, section: 'Ciclo de vida', Page: enConstruccion('ActualizacionMensual') },
  { path: '/refinanciaciones', label: 'Refinanciaciones', icon: 'link', roles: SOLO_ANALISTA, section: 'Ciclo de vida', Page: enConstruccion('Refinanciaciones') },
  { path: '/reporte', label: 'Generar Reporte', icon: 'file', roles: SOLO_ANALISTA, section: 'Reporte a TransUnion', Page: enConstruccion('ReporteTransUnion') },
  { path: '/reclamos', label: 'Reclamos Habeas Data', icon: 'flag', roles: SOLO_ANALISTA, section: 'Reporte a TransUnion', Page: enConstruccion('Reclamos') },
  { path: '/novedades', label: 'Novedades Urgentes', icon: 'clock', roles: SOLO_ANALISTA, section: 'Reporte a TransUnion', Page: enConstruccion('Novedades') },
  { path: '/usuarios', label: 'Gestión de Usuarios', icon: 'user', roles: SOLO_ADMIN, section: 'Administración', Page: lazy(() => import('../features/users/UsersPage')) },
  { path: '/auditoria', label: 'Auditoría', icon: 'shield', roles: SOLO_ADMIN, section: 'Administración', Page: lazy(() => import('../features/audit/AuditPage')) },
  { path: '/entidad', label: 'Datos de la Entidad', icon: 'wallet', roles: SOLO_ADMIN, section: 'Administración', Page: enConstruccion('DatosEntidad') },
  { path: '/homologacion-estados', label: 'Homologación de Estados', icon: 'layers', roles: SOLO_ADMIN, section: 'Administración', Page: enConstruccion('HomologacionEstados') },
]

export const RUTA_INICIAL = '/panel'
export const RUTA_LOGIN = '/login'

// ¿El rol puede abrir la opción?
export const puedeAbrir = (item, rol) => !item.roles || item.roles.includes(rol)
