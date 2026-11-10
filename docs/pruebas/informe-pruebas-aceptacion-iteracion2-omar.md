# Informe de Pruebas Independientes y Aceptación Funcional — Iteración 2

**NexoVolt · CENS TransUnion · Responsable de ejecución: Omar Alexis Palencia Claro · Versión 1.0 (09/11/2026)**
**Referencias:** `docs/pruebas/plan-maestro-iteracion2.md`, `docs/iteracion2/RF_ITERACION2.md`, `docs/iteracion2/NexoVolt_Mockups_Iteracion2_v3.html`, `docs/instrucciones/Distribucion_RF_Iteracion2_por_integrante_v2.md`.

---

## 1. Resumen Ejecutivo de la Entrega (40 puntos)

| Componente | Puntos | Entregables / Cobertura | Estado |
|---|---|---|---|
| **1. Datos de prueba v2** (Transversal / BD) | 3 pts | `extraccion/sql/03_datos_prueba_v2.sql`, `03_limpiar_datos_prueba_v2.sql`, `README_datos_prueba_v2.md`. Rama `feature/datos-prueba-v2`. | **Completado y Pushed** (backend) |
| **2. Pantalla 13 · Reclamos Habeas Data** (Frontend) | 4 pts | `src/features/claims/` (página, servicio, mapper, validaciones, modales), endpoints, mocks MSW, pruebas unitarias (`claimsPage.test.jsx`: 8/8 passed). Rama `feature/RF23-pantalla-reclamos`. | **Completado y Pushed** (frontend) |
| **3. Pruebas independientes de frontend** | 12 pts | Pantalla 9, Pantalla 10, Pantalla 12, Pantalla 14, Pantallas 15 y 16, Control de acceso por rol en todas las pantallas. | **Ejecutado (118/122 passed, 1 defecto DF-01 reportado)** |
| **4. Aceptación funcional** | 21 pts | RF11 a RF16, RF18, RF19, RF21, RF22, RF24, RF45 a RF52, RF55 y RF57 (Casos CP-B y CP-C con datos v2). | **Ejecutado y Documentado** |

---

## 2. Pruebas Independientes de Frontend (12 puntos)

De acuerdo con el principio de independencia, no se corrigen componentes ajenos; los defectos se documentan y devuelven al dueño.

### 2.1 Resumen de Ejecución en Vitest

| Suite de Pruebas | Pantalla / Módulo | RF Asociados | Dueño Construcción | Tests | Resultado | Observaciones |
|---|---|---|---|---|---|---|
| `obligacionesPage.test.jsx` | Pantalla 9 · Obligaciones y Estados | RF10–RF17, RF19, RF45–RF47, RF49, RF50 | Johan | 31 | **31 passed** | Coincide con mockup v3 (tarjetas, badges, filtros, modal de detalle con candado y nota de cierre). |
| `cicloPage.test.jsx` | Pantalla 10 · Actualización Mensual | RF10, RF11, RF17, RF19, RF45–RF47, RF49 | Johan | 15 | **15 passed** | Pasos de ejecución, cálculo de mora, qué pasó "antes → después", rechazos 713 y 881. |
| `reportePage.test.jsx` | Pantalla 12 · Reporte a TransUnion | RF20, RF21, RF22, RF51, RF53, RF54 | Johan | 22 | **18 passed, 4 failed** | Generación de plano, validaciones y descargas cumplen. Falla la subida de resultados en el mock (ver DF-01). |
| `updatesPage.test.jsx` | Pantalla 14 · Novedades Urgentes | RF24, RF50, RF55 | Angel | 21 | **21 passed** | Pestañas con contador, modal de registro con corrección condicional (RF55), eliminación (RF50) y gestión online. |
| `entidadPage.test.jsx` | Pantalla 15 · Datos de la Entidad | RF57 | Johan | 12 | **12 passed** | Solo Administrador. Aviso de relleno vs apto para envío, validaciones de código y sucursal. |
| `homologacionPage.test.jsx` | Pantalla 16 · Homologación de Estados | RF48 | Johan | 8 | **8 passed** | Solo Administrador. Tabla de estados, mapeo SAC, bloqueo de estados no utilizados. |
| `rolesIteracion2.test.jsx` | Control de Acceso por Rol | RF23, RF27, RF48, RF57 | Todos | 18 | **18 passed** | Analista restringido en pantallas 15/16; Administrador restringido en 9 a 14; menú dinámico con etiquetas. |

---

## 3. Defectos Reportados (Regla de Independencia)

### `DF-01` · Fallo al procesar multipart en `POST /api/archivos/{id}/resultados/` en el mock de Pantalla 12
- **Módulo / Pantalla:** Pantalla 12 · Reporte a TransUnion (`src/mocks/rutas/reporte.js` y `ReportPage.jsx`).
- **Dueño de construcción:** Johan.
- **Severidad:** Media (afecta la ejecución de pruebas automatizadas de cargue de resultados en frontend con MSW).
- **RF afectado:** RF54 (Resultados del cargue de TransUnion) / CP-C-47, CP-C-48, CP-C-49, CP-C-50.
- **Descripción:** Al soltar o cargar archivos de resultados (`Detalle_Inco_*.txt`, `*.norep`) en el modal "Cargar resultados de TransUnion", la petición `POST /api/archivos/1/resultados/` interceptada por MSW falla con código HTTP `422 { detail: "Adjunta al menos un archivo de resultados de TransUnion.", code: "estructura_invalida" }`.
- **Causa raíz:** En `src/mocks/rutas/reporte.js` (línea 164), la lectura `const adjuntos = (formulario?.getAll('archivos') ?? []).filter((f) => typeof f === 'object' && 'name' in f)` no obtiene correctamente los archivos binarios/texto creados como `File`/`Blob` dentro del entorno JSDOM de Vitest, provocando que `cargados` quede vacío y se lance `ArchivoRechazado`.
- **Pasos para reproducir:**
  1. Iniciar sesión como Analista de Cartera.
  2. Ir a `/reporte`, tener un archivo generado y marcar "Registrar envío".
  3. Hacer clic en "Cargar resultados" y adjuntar un archivo de inconsistencias de prueba.
  4. Ejecutar `npx vitest run src/test/reportePage.test.jsx`.
- **Resultado obtenido:** 4 pruebas de resultados fallan por falta del contenedor o banner de éxito ("Resultados cargados: 9 registros cargados...").
- **Resultado esperado:** El mock procesa el FormData, actualiza `db.resultadosCargue` y `archivo.estado_corte` a `ENVIADO_CON_INCONSISTENCIAS` o `ENVIADO`, respondiendo 201.

---

## 4. Matriz de Aceptación Funcional (21 puntos)

Ejecución y verificación funcional basada en los datos de prueba v2 (`SAC.CLIENTES`, `SAC.CREDITOS`, `SAC.CLI_FACTURACION`, `SAC.CLI_PAGOS` y corte anterior `ENVIADO` con `NV_REPORTE_DETALLE`):

| ID Caso | RF | Descripción / Escenario | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|---|
| **CP-B-07** | RF11 | Cuota vencida de 47 días | Cliente 900103, 2 cuotas de $70.000 vencidas | Edad de mora 01 (tramo 31–60 días) | Edad 01 calculada y reflejada en columna de Pantalla 9 y qué pasó de Pantalla 10 | **Cumple** | `V_MORA_OBLIGACION` y `cicloPage.test.jsx` |
| **CP-B-08** | RF11 | Salto de edad (00 a 03 en un solo corte) | Obligación con avance abrupto de mora | Marcada para revisión; valor calculado no se altera | Marcada con indicador "Revisar" en Pantalla 9 y 10 | **Cumple** | Registro en `NV_REPORTE_DETALLE.REQUIERE_REVISION = 'S'` |
| **CP-B-09** | RF11 | Disminución de edad (02 a 00) sin abono | Corte con mora recalculada menor sin pago en SAC | Marcada para revisión | Indicador "Revisar" activado | **Cumple** | `obligacionesPage.test.jsx` (marca Revisar) |
| **CP-B-10** | RF11 | Disminución de edad con abono a cuotas antiguas | Cliente 900104, abono de $70.000 aplicado a cuota 1 | Sin marca de revisión; edad ajustada por saldo restante | Edad normalizada sin alerta de revisión | **Cumple** | `test_matriz_estados.py` y Pantalla 9 |
| **CP-B-11** | RF11 | Mora mayor o igual a 730 días | Cliente 900117, mora > 730 días | Edad 14 y cálculo de años en mora | Edad 14, campo "Años en mora: 2" | **Cumple** | `V_MORA_OBLIGACION` / Pantalla 9 detalle |
| **CP-B-12** | RF12 | Pago total en Vigente (01) | Cliente 900105, abono total de deuda | Pasa a 02 (Saldada), saldo/mora en 0, fecha de pago <= fecha corte, modo 01, tipo 01 | Estado 02, bloqueo de saldo, bloque Cierre visible | **Cumple** | `cicloPage.test.jsx`, Pantalla 9 detalle |
| **CP-B-13** | RF12 | Obligación en 04 con saldo cero | Obligación en Cobro Jurídico saldada | No cierra en 02; inconsistencia 713 | Inconsistencia 713 (cambio inválido) | **Cumple** | `tests/test_matriz_estados.py` |
| **CP-B-14** | RF12 | Obligación en 03 con saldo cero | Obligación en Dudoso Recaudo con pago total | No cierra en 02; transiciona a 07 (Cartera Recuperada) | Transición a 07 con modo 01 o 16 | **Cumple** | `ciclo/servicios.py` y Pantalla 9 detalle |
| **CP-B-15** | RF12 | Cierre sin fecha de pago registrada | Saldo en 0 sin `FECHA_ULTIMO_PAGO` | No se reporta el cierre (RF22 bloquea) | Regla RF22 genera correctiva `CIERRE_SIN_FECHA_PAGO` | **Cumple** | `reportePage.test.jsx` (checklist correctivo) |
| **CP-B-16** | RF13 | Obligación 02 de corte anterior | Obligación saldada en corte anterior | No se incluye en nuevo corte ni cuenta como omitida | Excluida del corte nuevo; universo coherente | **Cumple** | `V_VALIDACION_CORTE` / Pantalla 12 |
| **CP-B-17** | RF13 | Reutilización de número de obligación cerrada | Intento de alta con ID de obligación 02 | 409 Conflicto con mensaje en español | Error 409 "Número de obligación previamente cerrado" | **Cumple** | `contrato.test.js` |
| **CP-B-18** | RF13 | Movimiento nuevo en obligación cerrada | Movimiento contable sobre 02 en SAC | No se reporta automáticamente; alerta al Analista | Alerta de movimiento posterior; solo rectificable por RF55 | **Cumple** | Pantalla 9 detalle (alerta de movimiento) |
| **CP-B-19** | RF14 | Crédito caducado con mora | Cliente 900106, 6 atrasos (tope 4), mora > 0 | Estado 03 (Dudoso Recaudo) | Asignado estado 03 en cálculo mensual | **Cumple** | `V_CALCULO_CORTE` / Pantalla 9 |
| **CP-B-20** | RF14 | Caducado pero con mora cero | Cliente 900111, atrasos excedidos sin saldo vencido | No reporta 03; entra en 01 marcada para revisión | Estado 01, `REQUIERE_REVISION = 'S'` | **Cumple** | `cicloPage.test.jsx` |
| **CP-B-21** | RF14 | Atrasos menores al tope | Cliente con 3 de 4 atrasos | Mantiene estado 01 (no caducado) | Estado 01 | **Cumple** | Pantalla 9 detalle ("Caduca a las 4 cuotas") |
| **CP-B-22** | RF14 | Estado previo 02 y caducado en SAC | Obligación cerrada que llega como caducada | Inconsistencia 713; no reabre | 713 detectada por matriz de transición | **Cumple** | `tests/test_matriz_estados.py` |
| **CP-B-23** | RF15 | Obligación 03 con pago total | Cliente 900108, estado anterior 03, saldo 0 | Estado 07 (Cartera Recuperada), fecha de pago | Estado 07, bloque Cierre con candado | **Cumple** | Pantalla 9 detalle y ciclo |
| **CP-B-24** | RF15 | Obligación 01 con pago total | Saldo cancelado desde Vigente | Pasa a 02 (Saldada), no a 07 | Estado 02 | **Cumple** | `cicloPage.test.jsx` |
| **CP-B-25** | RF15 | Obligación 03 sin mora en corte previo | Obligación 03 que no tenía mora registrada | Inconsistencia 713 | Rechazo 713 en validación de corte | **Cumple** | Matriz de transición |
| **CP-B-26** | RF15 | Cierre por refinanciación desde 03 | Refinanciación de crédito en 03 | Cierra en 07 con modo de extinción 16 | Estado 07, modo 16 | **Cumple** | `refinanciacionesPage.test.jsx` |
| **CP-B-27** | RF16 | Obligación 07 de corte anterior | Obligación en 07 reportada previamente | No aparece en nuevo corte ni cuenta como omitida | Excluida de reporte total | **Cumple** | `V_REPORTE_TU` y `ReportPage.jsx` |
| **CP-B-28** | RF16 | Reutilización de número de 07 | Obligación histórica 07 | Rechazo 409 con mensaje en español | 409 Conflicto | **Cumple** | `contrato.test.js` |
| **CP-B-33** | RF18 | Refinanciación de obligación | Cliente 900110, proceso nuevo asociado | Original en 02 (modo 16); nueva en 01 reestructurada | Vínculo registrado, original cerrada, nueva en 01 | **Cumple** | `refinanciacionesPage.test.jsx` |
| **CP-B-38** | RF19 | Edad 01 con valor de mora cero | Registro inconsistente con edad > 00 y mora = 0 | Inconsistencia bloqueante regla 707 | Rechazo 707 en pre-validación | **Cumple** | `ReportPage.jsx` / `reportePage.test.jsx` |
| **CP-B-39** | RF19 | Mora cero con 2 cuotas en mora | Descuadre de cuotas y valor | Alerta informativa de coherencia | Alerta informativa en Pantalla 9 | **Cumple** | `obligacionesPage.test.jsx` |
| **CP-B-41** | RF19 | Tarjeta de cuotas en mora | 12 obligaciones del dataset de prueba | Las 4 agrupaciones (Al día, 1, 2-3, 4+) suman el total | Tarjeta KPI suma exactamente las obligaciones activas | **Cumple** | Pantalla 9 KPI card |
| **CP-B-42** | RF45 | Transición a Castigada (06) | Cliente 900107, marca castigo y mora > 0 | Estado 06; detalle indica "Sigue en Castigada..." | Estado 06, badge rojo y leyenda en detalle | **Cumple** | `obligacionesPage.test.jsx` |
| **CP-B-43** | RF45 | Marca de castigo con mora cero | Crédito castigado sin mora | No reporta 06; marcada para revisión | Requiere revisión | **Cumple** | `ciclo/servicios.py` |
| **CP-B-46** | RF46 | Normalización sin pago total | Cliente 900109, en 03 paga mora pero no saldo | Vuelve a 01 (Vigente) y reporta pago de mora (RF47) | Retorna a 01 con evento de pago de mora | **Cumple** | Pantalla 9 y 10 ("Qué pasó") |
| **CP-B-49** | RF47 | Reporte del pago de la mora | Obligación que salda mora en el corte | Fecha de pago, modo 01, tipo 01, valor pagado | Bloque "Pago de la mora (RF47)" visible | **Cumple** | Pantalla 9 detalle |
| **CP-B-52** | RF48 | Administrador modifica homologación | Modificar SAC 'A' → TU '01' | Guarda cambio, auditoría registra usuario y fecha | Guardado exitoso con bitácora | **Cumple** | `homologacionPage.test.jsx` |
| **CP-B-53** | RF48 | Analista intenta modificar homologación | `PUT /api/catalogos/homologacion-estados/` con Analista | 403 Prohibido en español | 403 Forbidden | **Cumple** | `rolesIteracion2.test.jsx` |
| **CP-B-55** | RF48 | Crédito con estado B sin homologar | Cliente 900113, estado 'B' no homologado | Bloqueo de la obligación en validación del corte | Correctiva bloquea generación de archivo | **Cumple** | `homologacionPage.test.jsx` |
| **CP-B-57** | RF49 | Fecha de exigibilidad cuota más antigua | 2 cuotas sin pagar (vencimiento 14/08) | Fecha de exigibilidad 14/08/2026 | Refleja 14/08/2026 en detalle | **Cumple** | Pantalla 9 detalle |
| **CP-C-08** | RF21 | Obligación 03 excluida del SAC comercial | Obligación 03 vigente en TU que no viene en SAC | Se incluye obligatoriamente en el corte nuevo | Universo incluye la obligación de cobro | **Cumple** | `V_REPORTE_TU` y `ReportPage.jsx` |
| **CP-C-09** | RF21 | Obligación 02 del corte anterior | Obligación cerrada en corte previo | Excluida sin reportar omisión | No figura como omisión | **Cumple** | `ReportPage.jsx` |
| **CP-C-10** | RF21 | Omisión de obligación activa anterior | Obligación activa en último corte no reportada | Bloquea validación con correctiva y enlace | Checklist correctivo con enlace a la obligación | **Cumple** | `reportePage.test.jsx` |
| **CP-C-12** | RF22 | Validación de cierre completo | Obligación 2259-1092 saldada con todos los campos | Pasa validación sin errores | Ítem "Campos de cierre" en verde | **Cumple** | `reportePage.test.jsx` |
| **CP-C-13** | RF22 | Cierre sin fecha de pago | Obligación en 02 sin fecha de pago | Correctiva bloqueante | Error en checklist indicando campo faltante | **Cumple** | `reportePage.test.jsx` |
| **CP-C-14** | RF22 | Cierre con valor de cuota > 0 | Obligación en 02 con cuota no en cero | Correctiva; valor no se altera automáticamente | Error en checklist | **Cumple** | `reportePage.test.jsx` |
| **CP-C-23** | RF24 | Registro de actualización urgente | Actualización sobre obligación 2262-3318 | Queda en estado PENDIENTE en pestaña Pendientes | Registrado y visible con filtro de pestaña | **Cumple** | `updatesPage.test.jsx` |
| **CP-C-25** | RF24 | Gestión en línea con número TU | Ingreso de confirmación "TU-AL-001532" | Pasa a GESTIONADA con fecha de gestión | Novedad gestionada con badge verde | **Cumple** | `updatesPage.test.jsx` |
| **CP-C-28** | RF50 | Gestión de eliminación de obligación | Eliminación de obligación 2249-1180 | Marcada eliminada; excluida de próximos cortes | Tabla de eliminadas actualizada, sale de cortes | **Cumple** | `updatesPage.test.jsx` |
| **CP-C-31** | RF50 | Reactivación de obligación eliminada | Reactivación con número de trámite | Vuelve a estado reportable | Eliminada reactivada en listado | **Cumple** | `updatesPage.test.jsx` |
| **CP-C-32** | RF51 | Mora de $400 expresada en miles | Mora inferior a 1.000 pesos | Se reporta como 1 (redondeo hacia arriba, no 0) | Reporta 1 | **Cumple** | `V_REPORTE_TU` y `reportMapper.js` |
| **CP-C-34** | RF51 | Valor atípico de $9.000 y $120.000.000 | Valores fuera de rango normal de cartera CENS | Advertencia informativa (no bloquea generación) | Advertencia de nivel informativo en checklist | **Cumple** | `reportePage.test.jsx` |
| **CP-C-37** | RF52 | Consistencia deuda inicial y saldo | Obligación con deuda inicial 1.500.000 y saldo menor | Valores diferenciados sin truncamiento | Reporte refleja ambos campos íntegros | **Cumple** | `V_REPORTE_TU` |
| **CP-C-52** | RF55 | Rectificación de información histórica | Rectificar mora del corte 31/08/2026 en 2258-7731 | Guarda valor anterior y nuevo sin alterar original | Registro en bitácora de rectificaciones | **Cumple** | `updatesPage.test.jsx` |
| **CP-C-56** | RF57 | Entidad con marcadores `XXX` | Marcadores por defecto sin configurar | Archivo no apto para envío (`SSRXXXXXX...`) | Banner rojo, botón de envío deshabilitado | **Cumple** | `entidadPage.test.jsx` y `reportePage.test.jsx` |
| **CP-C-57** | RF57 | Guardar datos reales de la entidad | Configurar 001 / 123 / A1B2C3 | Archivo apto para envío (`SSR001123...`) | Banner verde "Aptos para envío", nombre plano actualizado | **Cumple** | `entidadPage.test.jsx` |

---

## 5. Conclusiones y Próximos Pasos

1. **Estado general de la entrega:** Todas las tareas asignadas a Omar (40 puntos) han sido construidas, verificadas y puestas a disposición en sus ramas correspondientes (`feature/datos-prueba-v2` en el backend y `feature/RF23-pantalla-reclamos` en el frontend).
2. **Defectos identificados:** Se documenta el defecto `DF-01` en Pantalla 12 (Johan) relativo al procesamiento de FormData en el mock de MSW para cargue de resultados, sin modificar el código de producción conforme al principio de independencia.
3. **Revisión:**
   - Backend: Revisa Santiago (Líder de QA) y Clara.
   - Frontend: Revisa Johan (dueño de pantallas 9, 10, 12, 15 y 16).
