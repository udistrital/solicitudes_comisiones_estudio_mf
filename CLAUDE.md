# CLAUDE.md

Angular 16 Single-SPA microfrontend para gestionar solicitudes de comisiones de estudio (Universidad Distrital). Se renderiza dentro del shell SGA como módulo UMD (`<mf1 />`).

## Arquitectura

- **Entry:** `src/main.single-spa.ts` → `bootstrap`, `mount`, `unmount`
- **Rutas:** `/solicitudes` (Bandeja), `/solicitudes/:id` (Detalle), `/solicitudes/nuevo` (Creación)
  - Query params: `?role=<Role>&mode=<EDITAR|GESTIONAR|VER>`
- **HTTP:** siempre `RequestManager.client('SERVICE_KEY')` — nunca `HttpClient` directo
  - Excepción: `DocenteInfoService` usa `HttpClient` (endpoint `academica_jbpm` externo)
- **Styling:** Tailwind CSS + Angular Material MDC v3. Color SGA: `#03678F`. No modificar archivos en `src/assets/styles/`. No usar `::ng-deep` (overrides globales en `_sga-global.scss`)
- **i18n:** `@ngx-translate/core@15`. Archivos: `src/assets/i18n/{es,en}.json`. Idioma vía cookie `lang` + `CustomEvent('lang')`
- **CI/CD:** Drone CI — `develop` → build, `release/*` → S3 pruebas, `master` → S3 prod
- **TypeScript:** Strict mode, target ES2022

### Variables de entorno (environment.ts / .development.ts / .production.ts)
- `ACADEMICA_JBPM_SERVICE` — datos docente planta (`DocenteInfoService`)
- `COMISIONES_MID_SERVICE` — lógica de negocio (crear, listar, detalle, cambio estado)
- `COMISIONES_CRUD_SERVICE` — tablas paramétricas (tipos documento solicitud, solicitudes activas)
- `DOCUMENTO_CRUD_SERVICE` — tipos de documento soporte (`DE_SOL_COM`)
- `CONFIGURACION_SERVICE` — permisos por rol (`configuracion_crud_api/v1/`)

### Repositorios relacionados
- **Core MF:** `udistrital/core_mf_cliente` — login, token OAuth2, user service, menú, idioma
- **Root Config:** `udistrital/sga_cliente_root` — bootstrap Single-SPA, TOKEN config

### Base de datos
- **Schema PostgreSQL:** `comision` en `pgtst.udistritaloas.edu.co:5432`
- **MCP postgres activo:** disponible en sesiones Claude Code (`~/.claude/mcp.json`). Usar `mcp__postgres__query` para consultar la BD directamente cuando sea necesario (siempre prefijar con `comision.tabla`).
- Tablas clave de fase 1: `solicitud`, `detalle_solicitud`, `historico_estado_solicitud`, `documento_solicitud`, `observacion`, `estado_solicitud`, `tipo_documento_solicitud`
- `observacion` tiene: `historico_estado_solicitud_id`, `descripcion` (text — texto del comentario), `activo`, `fecha_creacion`

---

## Roles y autenticación

**Roles:** `DOCENTE | COORDINADOR | ADMINISTRADOR | SECRETARIA_GENERAL | DECANO`

**Prioridad (menor→mayor):** DOCENTE(1) < COORDINADOR(2) < ADMINISTRADOR(3) < SECRETARIA_GENERAL(4) < DECANO(5)

| Rol código | Nombre en UI |
|---|---|
| DOCENTE | Docente |
| COORDINADOR | Coordinación de proyecto curricular |
| ADMINISTRADOR | Secretaría Académica |
| SECRETARIA_GENERAL | Secretaría General |
| DECANO | Decanatura |

- `auth.util.ts → getRolesUsuario()` lee roles de `localStorage.user` (base64 JSON)
- `roles.model.ts → resolverRolEfectivo()` retorna el de mayor prioridad
- `getDocumento()` → cédula, `getCorreoSesion()` → email, `getToken()` → Bearer token

---

## Sistema de permisos

### Arquitectura

Sistema de permisos dinámicos que consulta `configuracion_crud_api` para verificar si un perfil (rol) tiene acceso a una opción (acción/vista). Basado en la implementación de `sga_cliente_plan_docente_mf`.

**Archivos creados:**
- `src/app/services/configuracion.service.ts` — wrapper de `RequestManager.client('CONFIGURACION_SERVICE')`, expone `get(endpoint)`
- `src/app/utils/role-permissions.ts` — `PermisosUtils` injectable con `obtenerPermisos(roles[], opciones[])` (bulk, recomendado) y `tienePermiso` (@deprecated)

**Archivos modificados:**
- `src/environments/environment.ts` / `.development.ts` / `.production.ts` — se agregó `CONFIGURACION_SERVICE`
- `src/app/pages/gestion-solicitudes/bandeja/bandeja.component.ts` — permisos: `crear_solicitud`, `ver_filtros_tabla`
- `src/app/pages/gestion-solicitudes/bandeja/bandeja.component.html` — botón crear condicionado a permiso
- `src/app/pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component.ts` — permisos: 10 opciones (ver lista abajo)
- `src/app/pages/gestion-solicitudes/detalle-solicitud/detalle-solicitud.component.html` — secciones y botones condicionados a permisos
- `src/assets/i18n/es.json` / `en.json` — mensaje `GLOBAL.acceso_denegado`

### Flujo de carga de permisos

1. En `ngOnInit` de cada componente se define `opcionesPermisos: string[]` con los nombres de las opciones a consultar
2. Se llama a `permisosUtils.obtenerPermisos(roles, opcionesPermisos)` — **una sola llamada HTTP**
3. La consulta usa: `GET configuracion_crud_api/v1/perfil_x_menu_opcion?limit=-1&query=Opcion__Nombre__in:{op1|op2|...},Perfil__Nombre__in:{roles}`
4. Retorna `Record<string, boolean>` directamente — sin loop ni `forkJoin`
5. Resultado se asigna a `this.permisos` y se marca `permisosListos = true`

### Patrones de uso en templates

- **Secciones estructurales (strict):** `*ngIf="permisosListos && permisos['key']"` — ocultas hasta que cargan permisos, previene flash
- **Botones de acción (graceful):** `*ngIf="!permisosListos || permisos['key']"` — visibles mientras cargan, se ocultan si no tiene permiso
- **Guards en métodos:** `if (this.permisosListos && !this.permisos['key']) { error; return; }` — solo bloquean después de que cargan permisos
- **Loader:** El HTML del detalle muestra loader cuando `cargandoDetalle || !permisosListos`, previniendo render de secciones antes de resolver permisos

### Permisos configurados en el panel administrativo

| Opción | Descripción | Roles | Componente |
|---|---|---|---|
| `crear_solicitud` | Botón crear + vista creación docente | DOCENTE | Bandeja + Detalle |
| `editar_solicitud` | Vista edición docente (NO_ENV, CORR) | DOCENTE | Detalle |
| `ver_filtros_tabla` | Filtros de columna en bandeja | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL, DECANO | Bandeja |
| `guardar_solicitud` | Ejecutar guardar en modo docente | DOCENTE | Detalle |
| `enviar_solicitud_docente` | Enviar solicitud (docente → REV_PROY) | DOCENTE | Detalle |
| `guardar_formulario_fr010` | Guardar formulario FR-010 | DOCENTE | Detalle |
| `revisar_solicitud` | Vista de revisión (tabla docs + observaciones) | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL, DECANO | Detalle |
| `adjuntar_soporte_revision` | Adjuntar documentos durante revisión | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL, DECANO | Detalle |
| `retornar_solicitud` | Retornar solicitud para subsanación | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL, DECANO | Detalle |
| `rechazar_solicitud` | Rechazar solicitud (NO_APROB) | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL, DECANO | Detalle |
| `enviar_revision` | Avalar y enviar a siguiente instancia | COORDINADOR, ADMINISTRADOR, SECRETARIA_GENERAL | Detalle |
| `dar_inicio_solicitud` | Panel DECANO: fecha inicio + iniciar ejecución | DECANO | Detalle |

**NOTA HISTÓRICA:** El permiso `editar_solicitud` estuvo un tiempo sin funcionar porque en el panel admin se había escrito "editar_solict**u**d" (faltaba la "i"). Al corregir el typo en el panel, la API devolvió datos correctamente. Verificar siempre que el nombre exacto coincida entre panel y código.

### Agregar nuevos permisos (checklist)

1. Crear la **Opción** en el panel admin de configuración (nombre, descripción con "(Comisiones fase 1)", TipoOpcion: "Botón")
2. Crear el registro **perfil_x_menu_opcion** asociando la Opción al Perfil (rol) correspondiente
3. Agregar el nombre de la opción al array `opcionesPermisos` del componente correspondiente
4. Usar `this.permisos['nombre_opcion']` en el template (`*ngIf`) y/o como guard en el método
5. Verificar en consola (hay `console.log` comentados en `role-permissions.ts` y `detalle-solicitud.component.ts` que se pueden descomentar para debug)

---

## Bandeja (`BandejaComponent`)

Flujo: `ngOnInit → resolverRolEfectivo() → cargarSolicitudes()`

| Rol | Endpoint MID | Procesamiento |
|---|---|---|
| DOCENTE | `GET solicitudes_by_identificacion/{cedula}` | `forkJoin` con CRUD `solicitud?query=Activo:true` para filtrar inactivas |
| COORDINADOR | `GET pendientes_coordinador/{cedula}` | Directo |
| ADMINISTRADOR | `GET pendientes_secretaria/{cedula}` | Directo |
| SECRETARIA_GENERAL | `GET historico_estado_solicitud` (CRUD) | Filtra `Activo:true,EstadoSolicitudId__CodigoAbreviacion:REV_SEC_GRAL`, deduplica por `SolicitudId.Id`, luego `forkJoin` con `detalles_solicitud/{id}` (MID) para obtener nombre y cédula docente desde el Formulario FR-010 |
| DECANO | Sin endpoint aún | UI muestra "sin integración" |

**Filtro de solicitudes activas (DOCENTE):** El MID no incluye campo `Activo`. Se hace subconsulta al CRUD (`v1/solicitud?query=Activo:true&limit=-1`) para obtener IDs activos, y se filtran los resultados del MID con `Set<number>.has(item.id)`.

**Respuesta MID docente:** `{ Data: [{ id, nombre, programa, fecha_creacion, esado_solicitud: {Nombre} | null }] }` — nota: `esado_solicitud` tiene typo en backend.

**Acciones DOCENTE:** VER (si no editable), EDITAR (si `NO_ENV`/`CORR`), ELIMINAR (si `NO_ENV`), ENVIAR (si editable). Revisores: solo GESTIONAR.

---

## Detalle de solicitud (`DetalleSolicitudComponent`)

**Vistas según rol/estado:**
- `isDocenteEditable` (`NO_ENV || CORR`): formulario + documentos + observaciones editables
- `isDocenteReadOnly`: solo lectura
- Revisores (`!isDocente`): tabla con checkbox, observaciones, acciones (retornar/rechazar/enviar)
- DECANO: panel adicional con fecha inicio/prórroga

**Creación** (`isCreating`, ruta `/solicitudes/nuevo`):
- `POST comisiones_mid/v1/solicitud/crear_solicitud`
- `resolverTipoSolicitudId()`: DOCTORADO→2, MAESTRIA→3, POSTDOCTORADO→4
- `enviarDocente()` es no-op (sin endpoint de envío aún)

**Edición** (ruta `/solicitudes/:id`):
- `GET comisiones_mid/v1/solicitud/detalles_solicitud/{id}`
- `Data.Formulario` es string JSON → se parsea → `formularioRecuperado` → `[datosIniciales]` al FR-010
- Estado real desde `EstadoSolicitud.CodigoAbreviacion`

**Cambio de estado (revisores):**
- `POST comisiones_mid/v1/solicitud/estados`
- `IdTipoDocumento` para soportes resuelto dinámicamente desde `documento_crud/v2/tipo_documento?query=CodigoAbreviacion:DE_SOL_COM`
- Si no se resuelve y hay docs adjuntos → bloquea con error

**Documentos:**
- FR-010 fijo como primer ítem (kind: `FORM`)
- Resto del CRUD: `GET comisiones_crud/v1/tipo_documento_solicitud` (filtrado `Activo === true`)
- Ver FR-010 → abre `VisorDocumentosComponent` con `readOnly FR010FormComponent` (no PDF)
- Ver otros → visor PDF con iframe

---

## FR-010 (`Fr010FormComponent`)

- Formulario reactivo, 42 preguntas (q1-q43, con q10 subdividida en 10a/10b)
- `@Input() datosIniciales` — si tiene valor, `patchFromExisting()` y NO consulta docente
- `@Input() readOnly` — deshabilita todos los campos (`form.disable()`)
- Sin `datosIniciales`: precarga q1-q12 desde `academica_jbpm/v2/consulta_datos_docente_planta/{cedula}`
- Sección beca (q40-q43): vacía=OK, parcial=bloquea, completa=OK
- `isFormularioCompleto()` verifica campos requeridos de solicitante Y solicitud
- **Validaciones desactivadas temporalmente** en `save()` para pruebas (TODO: reactivar)

---

## Estados

**Solicitud (13):** `NO_ENV | RAD | REV_PROY | REV_SEC_ACAD | REV_SEC_GRAL | REV_DEC | CORR | NO_APROB | APROB_EJEC | SUBS_PROY | SUBS_SEC_ACAD | SUBS_SEC_GRAL | SUBS_DEC`

**Documento (14 + PENDIENTE):** `PENDIENTE | CARG | APROB | NO_APROB | CORR | SUBS | ANUL | ENV_REV_* | APROB_*`

**Chips CSS:** clases `st-*` (solicitud) y `doc-chip--*` (documento) en `_sga-global.scss`

**Flujo de revisión (nuevo — COORDINADOR eliminado):**
`DOCENTE → REV_SEC_ACAD → REV_SEC_GRAL → REV_DEC → APROB_EJEC`
El rol COORDINADOR fue removido del flujo de aprobación (implementado por otro miembro del equipo). El frontend aún tiene código relacionado a COORDINADOR pero ya no participa en el flujo principal.

**Mapeo estado-enviar por rol:**
DOCENTE→`REV_SEC_ACAD`, SECRETARIA_ACADEMICA→`REV_SEC_GRAL`, SECRETARIA_GENERAL→`REV_DEC`, DECANO→`APROB_EJEC`

**Mapeo estado-retornar por rol:**
SECRETARIA_ACADEMICA→`SUBS_SEC_ACAD`, SECRETARIA_GENERAL→`SUBS_SEC_GRAL`, DECANO→`SUBS_DEC`

---

## Servicios HTTP (`solicitudes.service.ts`)

4 clients de `RequestManager`:
- `apiMid` → `COMISIONES_MID_SERVICE`
- `apiCrud` → `COMISIONES_CRUD_SERVICE`
- `apiDocCrud` → `DOCUMENTO_CRUD_SERVICE`
- `api` → `SOLICITUDES_SERVICE` (sin uso actual)

| Método | Tipo | Ruta |
|---|---|---|
| `obtenerDetalleSolicitud(id)` | GET MID | `v1/solicitud/detalles_solicitud/{id}` |
| `crearSolicitud(payload)` | POST MID | `v1/solicitud/crear_solicitud` |
| `cambiarEstadoSolicitud(payload)` | POST MID | `v1/solicitud/estados` |
| `listarSolicitudesDocente(cedula)` | GET MID | `v1/solicitud/solicitudes_by_identificacion/{cedula}` |
| `listarPendientesCoordinador(cedula)` | GET MID | `v1/solicitud/pendientes_coordinador/{cedula}` |
| `listarPendientesSecretaria(cedula)` | GET MID | `v1/solicitud/pendientes_secretaria/{cedula}` |
| `listarSolicitudesActivasCrud()` | GET CRUD | `v1/solicitud?query=Activo:true&limit=-1` |
| `listarTiposDocumentoSolicitud()` | GET CRUD | `v1/tipo_documento_solicitud` |
| `listarHistoricoEstadoPorCodigo(code)` | GET CRUD | `v1/historico_estado_solicitud?query=Activo:true,EstadoSolicitudId__CodigoAbreviacion:{code}&limit=-1` |
| `obtenerTipoDocumentoPorCodigo(code)` | GET DOC CRUD | `v2/tipo_documento?query=CodigoAbreviacion:{code}` |

---

## Componentes compartidos

- **DynamicTableComponent\<T\>:** `ColumnDef[]` + `TableAction[]`, filtros, chips, `MatPaginator` (10 filas default)
- **PopUpManager:** `MatSnackBar` + SweetAlert2
- **VisorDocumentosComponent:** MatDialog — FR-010 read-only o PDF iframe según `data.isFR010`
- **AvisoCreacionComponent:** MatDialog informativo que se muestra al docente antes de crear una solicitud. Contiene texto informativo, 3 links a la normativa de comisiones y un checkbox de aceptación. Solo continúa el flujo si el usuario acepta. Archivo: `src/app/pages/gestion-solicitudes/components/aviso-creacion/`

---

## Sistema de notificaciones por correo

### API

- **Base URL:** `https://autenticacion.portaloas.udistrital.edu.co/apioas/notificacion_mid/v1`
- **Auth:** Bearer token en todas las operaciones
- **Source (remitente fijo):** `notificacionessga@udistrital.edu.co`
- **Variable de entorno a agregar:** `NOTIFICACION_MID_SERVICE` en los 3 archivos de environment

**Endpoints usados:**
| Operación | Ruta |
|---|---|
| Listar templates existentes | `GET /template_email` |
| Crear template | `POST /template_email` |
| Enviar correo con template | `POST /email/enviar_templated_email` |

**Payload de envío:**
```json
{
  "Source": "notificacionessga@udistrital.edu.co",
  "Template": "nombre_template",
  "Destinations": [
    {
      "Destination": { "ToAddresses": ["destinatario@udistrital.edu.co"] },
      "ReplacementTemplateData": { "nombre_docente": "...", "id_solicitud": "..." }
    }
  ],
  "DefaultTemplateData": {}
}
```

### Templates (9) — Fase 1

> ⚠️ **PENDIENTE — Logo incorrecto en todos los templates:**
> La URL actual del logo `https://sga.udistrital.edu.co/assets/images/logo_ud_blanco.png` no es válida. El usuario proporcionará la URL correcta. Cuando la tenga:
> 1. Pedir un Bearer token al usuario antes de empezar
> 2. Por cada template: `DELETE /template_email/{nombre}` y luego `POST /template_email` con el mismo contenido pero la URL del logo corregida
> 3. La API base es `https://autenticacion.portaloas.udistrital.edu.co/apioas/notificacion_mid/v1/`
> 4. El payload de creación es: `{ "TemplateName": "...", "SubjectPart": "...", "HtmlPart": "...", "TextPart": "..." }`
> 5. La API **no soporta PUT** (devuelve AccessDenied) — obligatorio DELETE + POST
> 6. Los 9 nombres de template están listados en la tabla de abajo — hay que recrear todos

Todos los templates usan las variables: `{{nombre_docente}}`, `{{id_solicitud}}`, `{{tipo_solicitud}}`, `{{instancia}}`, `{{observaciones}}`, `{{url_sistema}}`, `{{fecha}}`

| Nombre template | Disparo | Destino |
|---|---|---|
| `comisiones_solicitud_creada` | Creación exitosa → `NO_ENV` | Docente |
| `comisiones_enviada_docente` | `NO_ENV`/`CORR` → `REV_PROY` | Docente |
| `comisiones_enviada_revisor` | `NO_ENV`/`CORR` → `REV_PROY` | Coordinación |
| `comisiones_avalada_docente` | Avalar entre instancias revisoras | Docente |
| `comisiones_asignada_revisor` | Avalar entre instancias revisoras | Siguiente instancia |
| `comisiones_retornada` | → `SUBS_*` | Docente |
| `comisiones_aprobada` | → `APROB_EJEC` | Docente |
| `comisiones_rechazada` | → `NO_APROB` | Docente |
| `comisiones_subsanada_revisor` | Docente reenvía desde `SUBS_*` | Instancia revisora |

Los textos definitivos de cada template están en el archivo del proyecto:
`/home/blade100111/go/src/github.com/udistrital/Contexto/Plantillas notificacion comisiones.docx`

### Fuentes de datos para las notificaciones

| Dato | Cuando actúa el docente | Cuando actúa un revisor |
|---|---|---|
| Email docente | `getCorreoSesion()` | `formularioRecuperado?.solicitante?.q6_correo` |
| Nombre docente | `this.nombreDocente` (en DetalleSolicitudComponent) | idem |
| ID solicitud | `this.id` | idem |
| Tipo solicitud | campo en `formularioRecuperado` (a confirmar nombre exacto) | idem |
| Observaciones | `this.observacionDocente` / `this.observacionRevision` | `this.observacionRevision` |
| Email revisor | ❌ **Pendiente endpoint de cédulas** | idem |
| Instancia | Mapear desde `this.role` | idem |

### Implementación en el frontend

**Archivo a crear:** `src/app/services/notificaciones.service.ts`
- Un método público: `enviarEmail(template, destinations)` — fire-and-forget
- Errores solo en consola, no bloquean UI (notificaciones son secundarias al flujo principal)
- Usa `RequestManager.client('NOTIFICACION_MID_SERVICE')`

**Puntos de disparo en `DetalleSolicitudComponent`:**
- `crearSolicitud()` → `next` callback → template `comisiones_solicitud_creada`
- `ejecutarCambioEstado('ENVIAR')` → `next` callback → según estado anterior: templates 2+3 (primer envío docente) o template 9 (reenvío desde SUBS_*)
- `ejecutarCambioEstado('ENVIAR')` por revisor → templates 4+5
- `ejecutarCambioEstado('RETORNAR')` → template `comisiones_retornada`
- `ejecutarCambioEstado('RECHAZAR')` → template `comisiones_rechazada`
- `ejecutarCambioEstado('DAR_INICIO')` → template `comisiones_aprobada`

### Emails de revisores — endpoints validados, pendiente activar

Actualmente **todos los correos van a `jonathan100111a@gmail.com`** (override en `NotificacionesService.enviar()`). La línea marcada con `TODO` en ese método es lo único que hay que cambiar cuando se activen los correos reales.

**Flujo completo ya validado para Secretaria Académica y Decano:**

```
1. GET academica_jbpm/v2/consulta_datos_docente_planta/{cedula_docente}
      → JSON (requiere Accept: application/json)
      → campo: codigo_facultad (ej: "33")

2. GET academica_jbpm/v2/secretario_dependencia/{codigo_facultad}    ← Secretaria Académica
   GET academica_jbpm/v2/decano_dependencia/{codigo_facultad}        ← Decano
      → XML con Access-Control-Allow-Origin: * (sin problemas de CORS)
      → campo: <documento>cedula</documento>

3. POST autenticacion_mid/v1/token/documentoToken   Body: {"numero": "cedula"}
      → JSON con campo: email
```

**Flujo validado y ya implementado para Secretaria Académica y Decano.** El flujo de Secretaria General está pendiente.

**Secretaria General — implementado:**
- Usa `academica_jbpm/v2/secretario_dependencia/2` (código `2` fijo — dependencia central, no varía por facultad)
- En `resolverEmailRevisor` de `NotificacionesService`: case `SECRETARIA_GENERAL` cortocircuita antes de `consultarDocentePlanta` y llama `consultarSecretarioDependencia('2')` directamente
- Mismo flujo que los otros revisores: XML → cédula → `POST documentoToken` → email ✅

**Pendiente — Activar correos reales (quitar correo de pruebas):**
- En `NotificacionesService.enviar()` hay una línea marcada con `TODO` que sobreescribe el destinatario con `jonathan100111a@gmail.com`
- Cuando se confirme que todos los flujos están operativos en producción, eliminar esa línea para que los correos lleguen a los destinatarios reales
- El resto de la lógica ya está implementada y funcional

---

## Pendiente

### Alta prioridad
1. **Radicado real** — se usa `SOL-{id}` como radicado provisional; falta el número oficial del sistema
2. ~~**Notificaciones — email Secretaria General**~~ → resuelto: `secretario_dependencia/2` ✅
3. **Notificaciones — quitar correo de prueba:** todos los correos van a `jonathan100111a@gmail.com` por el `TODO` en `NotificacionesService.enviar()` (línea ~169). Eliminar esa línea cuando se vaya a producción real.
4. **Templates de notificación — logo:** URL del logo en los 9 templates es inválida. Pendiente de URL pública del deploy para recrearlos.

### Baja prioridad
5. **Reactivar validaciones FR-010** — `isFormularioCompleto()` existe en `fr010-form.component.ts` pero `save()` no la llama
6. **Limpiar console.log** — quedan 4 en `detalle-solicitud.component.ts` (líneas 397, 486, 1420, 2499)

### Resueltos (referencia histórica)
- MID base URL → `autenticacion.portaloas` en todos los environments ✅
- Endpoint DECANO en bandeja → `listarPendientesDecano` + case DECANO implementado ✅
- Endpoint de actualización → `editarSolicitud()` usa `PUT v1/solicitud/${id}` ✅
- `TerceroId` vs cédula → `sol.TerceroId || this.identificacionDocente` ✅
- Observaciones subsanación → `observacionesSubsanacion` implementado ✅
- `cod_abreviacion_rol` hardcodeado a `'PROFE'` → corregido a `'DOCENTE'` ✅
- Vista revisor con datos reales → usa endpoint `detalles_solicitud/{id}`, sin mock ✅
- `Data.Documentos` null → manejo correcto en línea 1910 del detalle ✅

