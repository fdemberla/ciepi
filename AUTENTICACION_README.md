# Configuración de Autenticación de Administradores

## 📋 Requisitos previos

1. Base de datos PostgreSQL configurada
2. Azure AD configurado con las redirect URIs correctas

## � Concepto Clave: `isAdmin` y `rol_id`

- **`isAdmin`**: `true` si el usuario está en la tabla `ciepi.usuarios_administradores` (siempre, sin importar el rol)
- **`rol_id`**: Define el **tipo** de administrador (1=Admin General, 2=Super Admin, 3=Editor, etc.)
- **Si NO está en la tabla**: `isAdmin = false` (no puede acceder a rutas de admin)

## 🗄️ Paso 1: Crear la tabla de usuarios administradores

Ejecuta el SQL del archivo `db/usuarios_administradores.sql`:

```sql
-- Crear tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS ciepi.usuarios_administradores (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol_id INTEGER DEFAULT 1, -- Define el TIPO de administrador
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_email ON ciepi.usuarios_administradores(email);
```

## 👤 Paso 2: Insertar tu usuario administrador

**IMPORTANTE:** Reemplaza el email con el email de tu cuenta de Microsoft/Azure AD

```sql
-- Insertar tu usuario como administrador
-- rol_id: 1=Admin General, 2=Super Admin, 3=Editor
INSERT INTO ciepi.usuarios_administradores (email, nombre, rol_id)
VALUES ('tu-email@dominio.com', 'Tu Nombre Completo', 1);

-- Verificar que se insertó correctamente
SELECT * FROM ciepi.usuarios_administradores;
```

## 🔐 Paso 3: Configurar Azure AD Redirect URIs

En el Azure Portal, asegúrate de tener configuradas **AMBAS** URIs:

1. `http://localhost:3000/ciepi/api/auth/callback/azure-ad`
2. `http://localhost:3000/ciepi/callback/azure-ad`

## 🚀 Paso 4: Reiniciar el servidor

```powershell
# Detener el servidor (Ctrl+C)
npm run dev
```

## ✅ Flujo de Autenticación

### Para Usuarios Administradores:

1. Hacer clic en "Iniciar Sesión" en el Navbar
2. Login con cuenta de Microsoft
3. El sistema verifica que el email existe en `ciepi.usuarios_administradores`
4. Si existe y está activo, redirige a `/admin/capacitaciones`
5. El Navbar muestra:
   - Nombre del usuario
   - Menú "Admin" con opciones:
     - Capacitaciones
     - Mensajes de Contacto
   - Botón de "Cerrar Sesión"

### Para Usuarios NO Administradores:

1. Hacer clic en "Iniciar Sesión" en el Navbar
2. Login con cuenta de Microsoft
3. El sistema verifica que el email NO existe en la tabla de administradores
4. El middleware bloquea el acceso a rutas `/admin/*` y `/api/admin/*`
5. Son redirigidos a la página de "No Autorizado"

## 🛡️ Rutas Protegidas

Las siguientes rutas están protegidas y requieren ser administrador:

- `/ciepi/admin/*` - Todas las páginas de administración
- `/ciepi/api/admin/*` - Todos los endpoints de API de administración

## 🧪 Probar la Autenticación

### Test 1: Usuario Administrador

1. Asegúrate de que tu email está en la tabla `usuarios_administradores`
2. Inicia sesión
3. Deberías ver el menú "Admin" en el Navbar
4. Deberías poder acceder a `/ciepi/admin/capacitaciones`

### Test 2: Usuario NO Administrador

1. Usa un email que NO esté en la tabla
2. Inicia sesión
3. NO deberías ver el menú "Admin"
4. Si intentas acceder a `/ciepi/admin/capacitaciones`, serás redirigido a la página de "No Autorizado"

## 🔍 Debugging

Si tienes problemas, revisa los logs del servidor:

```
✅ [Auth] User is admin: usuario@ejemplo.com
❌ [Auth] User is NOT admin: otro@ejemplo.com
🔍 [Middleware] Access granted - user is admin
❌ [Middleware] Access denied - user is not admin
```

## 📝 Agregar Más Administradores

Para agregar más usuarios administradores:

```sql
INSERT INTO ciepi.usuarios_administradores (email, nombre, rol)
VALUES
  ('admin1@dominio.com', 'Administrador 1', 'admin'),
  ('admin2@dominio.com', 'Administrador 2', 'admin'),
  ('admin3@dominio.com', 'Administrador 3', 'admin');
```

## 🗑️ Desactivar un Administrador

En lugar de eliminar, es mejor desactivar:

```sql
-- Desactivar un administrador
UPDATE ciepi.usuarios_administradores
SET activo = false
WHERE email = 'admin@dominio.com';

-- Reactivar
UPDATE ciepi.usuarios_administradores
SET activo = true
WHERE email = 'admin@dominio.com';
```

## 🎨 Personalización del Navbar

El Navbar ahora muestra:

- **Inicio, Capacitaciones, Contacto** - Visible para todos
- **Menú Admin** - Solo visible para administradores autenticados
- **Avatar + Nombre** - Muestra iniciales y nombre del usuario logueado
- **Botón "Iniciar Sesión"** - Para usuarios no autenticados
- **Botón "Cerrar Sesión"** - En el menú desplegable del usuario

## 🔄 Cerrar Sesión

Los usuarios pueden cerrar sesión desde:

1. Click en su avatar/nombre en el Navbar
2. Click en "Cerrar Sesión"
3. Son redirigidos a la página de inicio (`/ciepi/`)

## 💻 Usar `rolId` en Componentes/Páginas

Para implementar permisos basados en roles, puedes acceder a `rolId` desde la sesión:

```typescript
"use client";
import { useSession } from "next-auth/react";

export default function MiComponente() {
  const { data: session } = useSession();

  const isAdmin = session?.user?.isAdmin ?? false;
  const rolId = session?.user?.rolId; // Tipo de administrador

  // Ejemplo: Solo Super Admins (rol_id = 2) pueden ver esto
  if (rolId === 2) {
    return <SuperAdminPanel />;
  }

  // Ejemplo: Editores (rol_id = 3) tienen permisos limitados
  if (rolId === 3) {
    return <EditorView />;
  }

  // Admin General (rol_id = 1)
  return <AdminGeneralView />;
}
```

### Ejemplo: Proteger un botón por rol

```typescript
const { data: session } = useSession();
const rolId = session?.user?.rolId;

// Solo Super Admins pueden eliminar
{
  rolId === 2 && <button onClick={handleDelete}>Eliminar Capacitación</button>;
}

// Todos los admins pueden editar
{
  session?.user?.isAdmin && (
    <button onClick={handleEdit}>Editar Capacitación</button>
  );
}
```

### Ejemplo: API Route con verificación de rol

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  // Verificar que es admin
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Solo Super Admins pueden eliminar
  if (session.user.rolId !== 2) {
    return NextResponse.json(
      { error: "Solo Super Admins pueden eliminar" },
      { status: 403 }
    );
  }

  // Proceder con la eliminación
  // ...
}
```
