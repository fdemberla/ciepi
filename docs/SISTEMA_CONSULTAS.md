# Sistema de Gestión de Consultas

Sistema completo para gestionar consultas de contacto con panel de administración.

## 📋 Características

### Para Usuarios

- ✅ Formulario de contacto con reCAPTCHA v3
- ✅ Campos dinámicos cargados desde base de datos
- ✅ Validación de campos
- ✅ Confirmación de envío

### Para Administradores

- ✅ Panel de gestión de consultas
- ✅ Ver, responder y cerrar consultas
- ✅ Estados: Pendiente, En Proceso, Respondida, Cerrada
- ✅ Búsqueda y filtrado
- ✅ Gestión de tipos de consulta (CRUD completo)
- ✅ Paginación y ordenamiento
- ✅ Modal para respuestas detalladas

## 🚀 Instalación

### 1. Ejecutar Script SQL

Ejecuta el script SQL para crear la tabla de consultas:

\`\`\`bash
psql -U tu_usuario -d tu_base_de_datos -f database/create_consultas_table.sql
\`\`\`

O copia y pega el contenido de `database/create_consultas_table.sql` en tu cliente PostgreSQL.

### 2. Configurar Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

\`\`\`env

# reCAPTCHA

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=tu_site_key_aqui
RECAPTCHA_SECRET_KEY=tu_secret_key_aqui

# Base de datos (ya deberías tenerlas)

DATABASE_URL=postgresql://usuario:password@host:puerto/database
\`\`\`

### 3. Verificar Permisos

El sistema usa autenticación con NextAuth. Asegúrate de que tu usuario tenga `isAdmin: true`.

## 📁 Estructura de Archivos Creados

\`\`\`
database/
└── create_consultas_table.sql # Script SQL para crear tabla

app/
├── contacto/
│ └── page.tsx # Formulario público actualizado
│
├── admin/
│ ├── consultas/
│ │ └── page.tsx # Panel de gestión de consultas
│ └── tipos-consultas/
│ └── page.tsx # Gestión de tipos de consulta
│
└── api/
├── contacto/
│ └── consulta/
│ └── route.ts # API POST para crear consultas
│
└── admin/
├── consultas/
│ ├── route.ts # API GET para listar consultas
│ └── [id]/
│ └── route.ts # APIs GET, PUT, DELETE por ID
│
└── tipos-consultas/
├── route.ts # APIs GET, POST para tipos
└── [id]/
└── route.ts # APIs GET, PUT, DELETE por ID

config/
└── navigation.ts # Actualizado con link a Consultas
\`\`\`

## 🗄️ Estructura de la Base de Datos

### Tabla: `ciepi.consultas`

| Campo               | Tipo         | Descripción                                |
| ------------------- | ------------ | ------------------------------------------ |
| id                  | SERIAL       | ID único                                   |
| nombre              | VARCHAR(200) | Nombre del consultante                     |
| email               | VARCHAR(100) | Email del consultante                      |
| telefono            | VARCHAR(20)  | Teléfono                                   |
| tipo_consulta_id    | INTEGER      | FK a tipos_consultas                       |
| sede_id             | INTEGER      | FK a sedes_formacion                       |
| area_formacion_id   | INTEGER      | FK a areas_formacion                       |
| curso_interes       | VARCHAR(200) | Curso de interés                           |
| comentarios         | TEXT         | Comentarios/consulta                       |
| respuesta           | TEXT         | Respuesta del admin                        |
| respondido_por      | INTEGER      | FK a usuarios (admin)                      |
| fecha_respuesta     | TIMESTAMP    | Fecha de respuesta                         |
| estado              | VARCHAR(20)  | pendiente, en_proceso, respondida, cerrada |
| fecha_creacion      | TIMESTAMP    | Fecha de creación                          |
| fecha_actualizacion | TIMESTAMP    | Última actualización                       |
| recaptcha_token     | TEXT         | Token de reCAPTCHA                         |
| recaptcha_score     | NUMERIC(3,2) | Score de reCAPTCHA (0.0-1.0)               |

## 🔑 APIs Creadas

### Públicas

#### POST `/api/contacto/consulta`

Crear nueva consulta desde el formulario público.

**Body:**
\`\`\`json
{
"nombre": "Juan Pérez",
"email": "juan@example.com",
"telefono": "6666-6666",
"tipoConsulta": 1,
"sede": 2,
"areadeformacion": 3,
"CursoInteres": "Curso de Python",
"comentarios": "Me gustaría información sobre...",
"recaptchaToken": "token_aqui"
}
\`\`\`

#### GET `/api/admin/tipos-consultas`

Obtener todos los tipos de consulta (público para el formulario).

### Admin (Requieren autenticación y permisos de admin)

#### GET `/api/admin/consultas`

Listar todas las consultas con filtros y paginación.

**Query params:**

- `page`: Número de página (default: 1)
- `limit`: Consultas por página (default: 10)
- `search`: Buscar en nombre, email o comentarios
- `estado`: Filtrar por estado
- `tipo_consulta_id`: Filtrar por tipo

#### GET `/api/admin/consultas/[id]`

Obtener detalles de una consulta específica.

#### PUT `/api/admin/consultas/[id]`

Responder o actualizar estado de una consulta.

**Body:**
\`\`\`json
{
"respuesta": "Gracias por contactarnos...",
"estado": "respondida"
}
\`\`\`

#### DELETE `/api/admin/consultas/[id]`

Eliminar una consulta.

#### POST `/api/admin/tipos-consultas`

Crear nuevo tipo de consulta.

**Body:**
\`\`\`json
{
"nombre": "Consulta General",
"descripcion": "Consultas generales sobre nuestros servicios",
"activo": true
}
\`\`\`

#### PUT `/api/admin/tipos-consultas/[id]`

Actualizar tipo de consulta.

#### DELETE `/api/admin/tipos-consultas/[id]`

Eliminar tipo de consulta (solo si no tiene consultas asociadas).

## 🎨 Páginas del Sistema

### Formulario Público

**URL:** `/contacto`

- Carga tipos de consulta, sedes y áreas desde la BD
- Validación de campos
- Protección con reCAPTCHA v3
- Feedback visual al usuario
- Redirección automática después de enviar

### Panel de Consultas (Admin)

**URL:** `/admin/consultas`

- Tabla con todas las consultas
- Búsqueda y filtrado
- Estados visuales con badges de colores
- Modal para ver detalles completos
- Responder consultas con editor de texto
- Cambiar estado de consultas
- Eliminar consultas
- Link a gestión de tipos

### Gestión de Tipos (Admin)

**URL:** `/admin/tipos-consultas`

- CRUD completo de tipos de consulta
- Activar/desactivar tipos
- Validación de duplicados
- Prevención de eliminación si hay consultas asociadas
- Modal para crear/editar

## 🔔 Estados de Consulta

| Estado         | Descripción                           | Color    |
| -------------- | ------------------------------------- | -------- |
| **pendiente**  | Consulta recién recibida, sin revisar | Amarillo |
| **en_proceso** | Admin está trabajando en la respuesta | Azul     |
| **respondida** | Admin ha respondido la consulta       | Verde    |
| **cerrada**    | Consulta finalizada                   | Gris     |

## 🛠️ Uso del Sistema

### Como Usuario:

1. Ir a `/contacto`
2. Completar el formulario
3. Enviar (el reCAPTCHA se valida automáticamente)
4. Recibir confirmación

### Como Administrador:

#### Gestionar Consultas:

1. Ir a `/admin/consultas`
2. Ver lista de consultas ordenadas por estado y fecha
3. Hacer clic en el ícono de ojo para ver detalles
4. Escribir respuesta en el modal
5. Cambiar estado si es necesario
6. Clic en "Enviar Respuesta"

#### Gestionar Tipos:

1. Ir a `/admin/tipos-consultas`
2. Hacer clic en "Nuevo Tipo"
3. Completar nombre y descripción
4. Marcar como activo/inactivo
5. Guardar

## 🔒 Seguridad

- ✅ Autenticación requerida para APIs de admin
- ✅ Validación de permisos (isAdmin)
- ✅ reCAPTCHA v3 en formulario público
- ✅ Score mínimo de 0.5 para aceptar consultas
- ✅ Validación de campos en backend
- ✅ Sanitización de inputs
- ✅ Triggers en BD para timestamps automáticos

## 📊 Características Avanzadas

### Filtrado y Búsqueda

- Buscar por nombre, email o comentarios
- Filtrar por estado
- Filtrar por tipo de consulta
- Paginación automática

### Respuestas

- Editor de texto multilinea
- Registro de quién respondió
- Timestamp de respuesta
- Cambio automático a estado "respondida"

### Tipos de Consulta

- Configurables desde el admin
- Se pueden activar/desactivar
- Validación de duplicados
- Protección contra eliminación si hay consultas asociadas

## 🎯 Próximas Mejoras Sugeridas

- [ ] Enviar email al usuario cuando se responde su consulta
- [ ] Notificar a admin cuando llega nueva consulta
- [ ] Exportar consultas a CSV/Excel
- [ ] Estadísticas y gráficos de consultas
- [ ] Templates de respuestas frecuentes
- [ ] Adjuntar archivos en consultas
- [ ] Sistema de prioridades
- [ ] Asignación de consultas a diferentes admins

## 🐛 Solución de Problemas

**Problema:** No aparecen los tipos de consulta en el formulario

- ✅ Verifica que existan tipos en la BD con `activo = true`
- ✅ Revisa la consola del navegador
- ✅ Verifica la conexión a la API

**Problema:** Error al enviar consulta

- ✅ Verifica que RECAPTCHA_SECRET_KEY esté configurada
- ✅ Revisa que la tabla `consultas` exista
- ✅ Verifica los permisos de la BD

**Problema:** No puedo acceder al panel de admin

- ✅ Verifica que tu usuario tenga `isAdmin: true`
- ✅ Verifica que estés autenticado
- ✅ Revisa la sesión de NextAuth

## 📝 Notas Adicionales

- El sistema usa el componente `Table` reutilizable para las listas
- Los modals tienen fondo oscuro semi-transparente (z-50)
- El formulario tiene protección contra múltiples envíos
- Los triggers de BD actualizan automáticamente `fecha_actualizacion`
- El score de reCAPTCHA se guarda para análisis futuro

---

**Desarrollado para CIEPI** 🎓
