# Discrepancias del backend frente al manual de TransUnion

Registro para revisar lo que implementa el backend (`reporte-cens-backend`, rama `dev`) contra el **Manual Sector Real v34 de TransUnion** y contra los requerimientos del proyecto. Es la versión pública: no contiene datos de CENS. Se citan solo números de tabla y página del manual y los RF.

- **Revisado:** commit `cf07754` (10/10/2026).
- **Contrato:** [`openapi.yaml`](openapi.yaml) versión 0.3. Las diferencias de forma de la API (posibles 500, orden, fechas) están en el [README](README.md), filas Q a AA.
- **Regla:** cuando el backend se aparta del manual, el contrato y los mocks del frontend siguen al manual y la diferencia queda aquí.

Comprobación: **verificado** (leído en el código), **inferido** (sin ejecutar) o **no verificable** (la lógica está fuera del repositorio). Impacto: **I1** afecta la Iteración 1; **I2** afecta el archivo de TransUnion (Iteración 2).

## Decisión pendiente: sector Servicios o Comercio

Las tablas de estados de Comercio (4a) y Servicios (4b) usan los mismos códigos con significados distintos. Por ejemplo, `03` y `04` cambian de significado. El sector también define qué campos son obligatorios y qué significa el valor inicial.

**Propuesta: Servicios** (paquete SSR, Tabla 4b), porque la categoría 04 "Servicio energía" solo existe en Servicios (Tabla 5). Hasta confirmarlo, los mocks solo usan `01` Vigente, `02` Saldada y `06` Castigada, que significan lo mismo en ambas tablas.

## Backend frente al manual y los requerimientos

| ID | Tema | Manual o requerimiento | Backend (`cf07754`) | Comprobación | Impacto | Propuesta |
|---|---|---|---|---|---|---|
| A1 | La lógica de negocio no está en el repositorio | RF3 a RF7: consolidación, mora, Tabla 9 y número de obligación | Se toma de las vistas `V_CALCULO_CORTE` y `V_VALIDACION_CORTE`, cuyo SQL no está en `extraccion/sql/` | Verificado | I1, I2 | Versionar el SQL de las vistas para poder revisarlas |
| A2 | Las obligaciones pagadas dejan de reportarse | El reporte mensual incluye toda la base. Una obligación se cierra reportándola como Saldada; la que deja de reportarse queda como "no reportada" | `V_DEUDOR_VIGENTE` filtra saldo mayor que 0 (filtro de estado provisional) | Verificado / inferido | I2 | Incluir las obligaciones cerradas desde el corte anterior con estado 02 |
| A3 | Tipo de identificación | Tabla 2: código numérico de 2 dígitos (`01` Cédula, `02` NIT…) | La documentación y las pruebas usan `"CC"` | Inferido | I1, I2 | Usar el código de la Tabla 2 |
| A4 | Estado de la obligación | Tabla 4a o 4b, según el sector | Sin tabla declarada ni validación | Verificado / no verificable | I1, I2 | Declarar la tabla y validar los códigos |
| A5 | Edad de mora | Tabla 9: `00` a `14`; los tramos amplios son `12` (360–539), `13` (540–729) y `14` (730 o más) | Código en texto, calculado en la vista | No verificable | I1, I2 | Publicar el SQL y probar los límites de cada tramo |
| A6 | Reglas para saldar | Saldo 0, mora 0, edad `00`, cuota 0 y cuotas en mora 0; además fecha de pago, modo de extinción y tipo de pago | No se ven las reglas; faltan las columnas de modo de extinción y de tipo de pago | No verificable / verificado | I2 | Agregar los campos y la validación |
| A7 | "Fecha de pago" (campo 20) | Es la fecha de extinción de la mora o de pago total; no se reporta si hay mora | Guarda la fecha del último pago recibido | Verificado | I2 | Calcularla aparte |
| A8 | Tipo de cartera, línea de crédito y categoría de servicios | El tipo de cartera lo define el registro de control. En Servicios se usa la categoría 04 y no la línea de crédito. | Guarda el tipo de cartera y la línea de crédito por fila, pero no la categoría | Verificado | I2 | Guardar la categoría de servicios |
| A9 | Fecha de corte | Debe ser mayor que la última reportada (inconsistencia 074) y no futura | Rechaza la fecha futura, pero no la compara con el último corte ENVIADO | Verificado | I1, I2 | 409 si es menor o igual a la del último ENVIADO (el mock lo aplica) |
| A10 | Corrección, eliminación y renumeración | El manual prevé rectificación, eliminación con justificación (Tabla 12) y renumeración (registro tipo 3) | El ciclo termina en ENVIADO | Verificado | Iteración 2 | Registrar para la HU-C |
| A11 | Identificación completa en la API | Datos personales con acceso restringido (RF30, Habeas Data) | Se devuelve completa | Verificado | I1 | El frontend la enmascara en pantalla |
| A12 | Caracteres del número de obligación | Máximo 20; solo `( ) * , - . / \ _` (inconsistencia 972); único y permanente | La permanencia se cumple, pero no se validan los caracteres | Verificado | I2 | Validar el patrón al crear la obligación |

**Lo que coincide:**
- La permanencia del número de obligación.
- Las validaciones correctivas e informativas.
- El rechazo de la fecha futura.
- El tipo de reporte (total o parcial) en el corte.
- Que se guarden los campos del reporte.

## Requerimientos abiertos (no son errores del backend)

Los documentos del proyecto tienen versiones distintas de algunas reglas, así que el backend todavía no puede acertarlas:
- Obligación por proceso o por deudor. El contrato usa por proceso, como el manual.
- Qué conceptos se excluyen.
- Qué factura sirve de referencia para la mora (la última emitida o la última vencida).
- Cómo se reparten los abonos parciales.
- Qué entra al corte: solo las vigentes (RF1) o toda la base (manual).
- La definición de "estado del deudor" (RF8 y RF9).
- El alcance de RF43 y RF44, que no figuran en la Planificación.

## Inconsistencias del propio manual (confirmar con TransUnion para el generador)

- **Longitudes declaradas que no cuadran con la suma de los campos:** el registro 2 declara 930 y suma 929; el registro 3 no atípico declara 53 y suma 41; el registro 4 atípico también trae un error de longitud.
- **El código 711 aparece como informativo y como correctivo.**
- **La obligatoriedad de algunos campos cambia según la página:** la fecha límite de pago y las cuotas en mora.
- **Cálculos que el manual no define:** los días de mora, el redondeo, el signo y el terminador de línea.
- **El manual no fija un plazo de notificación previa al titular.**
- **Las matrices de cambio de estado** no se pudieron leer y hay que revisarlas en el PDF.
