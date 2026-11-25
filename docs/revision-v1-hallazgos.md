# Revisión de CIEPI v1.0: hallazgos y despliegue

Revisión hecha al preparar el manual de administración (`docs/Manual_Administracion_CIEPI_v1.pdf`, que se genera con `python docs/build_manual.py <salida.pdf> <logo.png>`). El manual describe la app tal como está ahora; los problemas pendientes aparecen en él como «Importante» o en el anexo.

## Corregidos (8 bloqueantes)

| # | Problema | Corrección |
|---|---|---|
| 1 | En producción, la página de detalle del blog pedía los datos a `https://yourdomain.com`, así que devolvía 404. | La página consulta la base de datos directamente con `lib/blogPublic.ts`, compartido con `/api/blog/[id]`. Se valida que el id sea un entero. |
| 2 | El nombre de una capacitación no aceptaba tildes, ñ ni números. | Se quitó la restricción `^[A-Za-z ]+$` en crear y editar. |
| 3 | El listado del admin ocultaba las capacitaciones con la inscripción cerrada. | Nuevo `GET /api/admin/capacitaciones`, que devuelve todas, incluidas las inactivas y las cerradas. |
| 4 | El rol 2 no podía guardar ediciones de usuarios. | Solo cuenta como cambio de rol si `rol_id` es distinto del actual. Cambiar roles sigue reservado al rol 1. |
| 5 | El filtro `"on"` ocultaba los adjuntos cuyo nombre contenía «on» (por ejemplo «informacion.pdf»). | Ahora detecta manejadores de eventos (`onX=`) y comillas o `<>`. Tests en `tests/unit/security.test.ts`. |
| 6 | Cada vez que se editaba un evento, sus horas se desplazaban 5 h. | Las fechas se muestran en hora local con `lib/dateInput.ts`. Comprobado en la BD: columnas `timestamptz` y zona America/Bogota. |
| 7 | El blog se creaba siempre como Borrador. | Se respeta la elección «Enviar a revisión CIEPI» (estado 2). |
| 8 | La bandeja de aprobación ocultaba los blogs en revisión de RR.PP. | La API acepta varios estados (`estado=2,4`, con `ANY(int[])`). |

**Encontrado y corregido al hacer las capturas del manual:**
- El calendario de clases nunca mostraba clases con datos reales. `node-postgres` entrega las fechas como `Date`, y `parseDateOnly` (`lib/calendarUtils.ts`) hacía `String(value).slice(0, 10)`, así que el parseo fallaba y se descartaban todas las capacitaciones. Los tests no lo detectaban porque usaban fechas como texto. Ahora acepta `Date` y tiene un test de regresión.

**Además:**
- Se agregó el prefijo `ciepi.` a `COUNT(*) FROM eventos`.
- Se confirmó que «Pendiente de validación» tiene el id 6 en la BD de `.env`.

## Paso a subdominio `ciepi.inadeh.edu.pa` (basePath vacío)

**Cambio en el código:** `/api/upload` ya no guarda el basePath en la URL. En la BD queda `/uploads/blogs/x.png`, y al mostrarse se usa `assetUrl()` (`lib/basePath.ts`).

**Resultado del recorrido con basePath vacío:** se revisaron las páginas públicas, sus enlaces y recursos, las APIs públicas y los archivos guardados en la BD. Todo responde, salvo **5 imágenes de blog guardadas con `/ciepi/`**. Esas imágenes sí existen en `/uploads/blogs/...`; las corrige la migración del punto 1.

**Lista para el despliegue:**
1. Ejecutar `database/migrate_quitar_basepath_ciepi.sql` en la BD de producción. Quita el prefijo `/ciepi/` de `blogs.imagen_banner`, y se puede ejecutar más de una vez sin efecto adicional.
2. Variables de entorno del servidor:
   - `NEXT_PUBLIC_BASE_PATH=` (vacío)
   - `NEXTAUTH_URL=https://ciepi.inadeh.edu.pa`
   - `NEXTAUTH_URL_INTERNAL`: la URL interna, sin `/ciepi`
   - `NEXT_PUBLIC_APP_URL=https://ciepi.inadeh.edu.pa` (se usa en los enlaces de los correos de verificación y del newsletter)
3. **Volver a compilar** (`next build`) después de cambiar las variables, porque las `NEXT_PUBLIC_*` se incrustan en el código del navegador.
4. Azure AD (registro de la app): agregar la URI de redirección `https://ciepi.inadeh.edu.pa/api/auth/callback/azure-ad`.
5. Hub de biometría: registrar `https://ciepi.inadeh.edu.pa/biometria/callback/` como URI de retorno.
6. Proxy/servidor web: servir el subdominio en la raíz y quitar cualquier reescritura de `/ciepi`. Opcionalmente, redirigir el `/ciepi/*` antiguo al subdominio.
7. Los enlaces de verificación enviados antes del cambio apuntan a la URL vieja (caducan en 15 min). Los enlaces de baja del newsletter ya enviados apuntan a `/ciepi/newsletter/baja/...`, así que conviene la redirección del punto 6.

**Sin probar:** las pantallas del admin (requieren iniciar sesión con Microsoft) y los flujos de Azure y biometría contra el subdominio real.

## Pendientes importantes (no bloqueantes)

- **Sesión y usuarios:**
  - La sesión dura unos 30 días y no vuelve a comprobar si el usuario sigue activo, así que un usuario desactivado sigue dentro.
  - El correo se compara distinguiendo mayúsculas y minúsculas.
  - Si se deniega el acceso no se muestra ningún mensaje.
  - El rol 2 puede crear usuarios con rol 1.
  - El menú no filtra por rol.
- **Inscripciones:**
  - No se controla el cupo.
  - No se envían correos al cambiar de estado.
  - `EstadoSelector` ofrece los 6 estados y oculta el error del servidor.
  - No hay exportación.
- **Blog:**
  - `aprobar/[id]` envía `comentario` en lugar de `comentario_temp`.
  - La vista previa muestra un texto fijo.
  - Dice «Se ha notificado al autor», pero no se notifica.
  - «Gestionar aprobación» comprueba mal el estado.
  - «Reenviar a revisión» usa transiciones no permitidas.
- **Consultas:**
  - No se envía ningún correo (hay TODO).
  - Comprobar la FK `respondido_por → ciepi.usuarios`.
- **Archivos:**
  - La interfaz acepta xlsx, pero el servidor lo rechaza.
  - Solo se guarda el primer adjunto.
  - El límite de 5 MB de los eventos no se aplica.
  - Los archivos se escriben en `public/` mientras la app funciona.
- **Newsletter:** se envía sin confirmación.
- **Seguridad:** `/api/auth/session` devuelve al navegador el `accessToken` de Microsoft (Graph) del administrador (`lib/authOptions.ts:113`). Si la app no lo usa en el cliente, conviene no exponerlo.
- **Detalles de interfaz vistos en las capturas:**
  - «Tipos de Consulta» muestra «Invalid Date» en «Creado», porque la API no selecciona `fecha_creacion` (`app/api/admin/tipos-consultas/route.ts`).
  - La ventana de aprobación dice «aprobar para rr.ppel blog»: falta un espacio y se usa `toLowerCase()` (`app/admin/blog/aprobar/page.tsx:288`).
  - Los nombres de los roles en la BD local («Super Administrador» = 1, «Administrador» = 2, «Editor» = 3) no coinciden con los del código (`ADMIN` = 1, `SUPER_ADMIN` = 2, `CIEPI` = 3). El manual usa los nombres de pantalla; conviene unificarlos.
- **Textos de relleno:**
  - Teléfono `+507 0000-0000`.
  - Redes sociales con `href="#"`.
  - Cifras fijas en la portada.
  - Descripción incorrecta de CIEPI en `app/blog/page.tsx:122` y en el pie del detalle del blog.
  - README de plantilla.
- **Primer administrador:** no hay script que lo cree.

## Despliegue de mentorías (fases 1 a 4)

1. **Base de datos.** Ejecutar `database/create_mentorias.sql` en producción, igual que los demás scripts. Se puede repetir sin problema. Después, `database/verificar_migraciones.sql` debe mostrar el punto 7 como «aplicado».
2. **Variables en el `.env` del servidor:**
   - `MENTORIAS_NOTIFY_EMAIL` (opcional): correo de CIEPI que recibe copia de las reservas.
   - `CRON_SECRET` (obligatorio para los recordatorios): un valor aleatorio de al menos 24 caracteres. Se genera con:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Tarea programada.** En el servidor, en PowerShell como administrador y una sola vez:
   `schtasks /Create /TN "CIEPI Recordatorios Mentorias" /SC HOURLY /RU SYSTEM /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Apps\ciepi\scripts\recordatorios-mentorias.ps1"`
   - Si la app no escucha en el puerto 3000, agregar `-Url http://localhost:<puerto>` al final de `/TR`.
   - Para probarla a mano, ejecutar el mismo comando de PowerShell. El resultado queda en `logs\recordatorios-mentorias.log`.
4. **Configuración en el portal.** En Admin → Mentorías → Mentores, activar a los mentores y cargar su horario.
