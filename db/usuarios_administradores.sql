-- ============================================
-- TABLA: usuarios_administradores
-- Descripción: Almacena los usuarios con permisos de administrador
-- IMPORTANTE: Todo usuario en esta tabla es considerado ADMINISTRADOR
-- ============================================

CREATE TABLE IF NOT EXISTS ciepi.usuarios_administradores (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol_id INTEGER DEFAULT 1, -- Define el TIPO de administrador (no si es admin o no)
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_usuarios_admin_email ON ciepi.usuarios_administradores(email);

-- ============================================
-- COMENTARIOS EN LAS COLUMNAS
-- ============================================
COMMENT ON TABLE ciepi.usuarios_administradores IS 'Usuarios con permisos de administrador del sistema. Si está en esta tabla = es admin.';
COMMENT ON COLUMN ciepi.usuarios_administradores.email IS 'Email del usuario (debe coincidir con Azure AD)';
COMMENT ON COLUMN ciepi.usuarios_administradores.nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN ciepi.usuarios_administradores.rol_id IS 'ID del tipo de administrador (1=Admin General, 2=Super Admin, 3=Editor, etc.)';
COMMENT ON COLUMN ciepi.usuarios_administradores.activo IS 'Indica si el usuario está activo y puede acceder al sistema';

-- ============================================
-- TIPOS DE ROLES (rol_id)
-- ============================================
-- 1 = Admin General (puede gestionar capacitaciones, ver mensajes)
-- 2 = Super Admin (acceso completo, puede gestionar otros admins)
-- 3 = Editor (puede editar pero no eliminar)
-- etc. (define según tus necesidades)

-- ============================================
-- EJEMPLO: Insertar usuario administrador
-- ============================================
-- IMPORTANTE: Reemplaza 'tu-email@dominio.com' con el email de tu cuenta de Azure AD
-- 
-- INSERT INTO ciepi.usuarios_administradores (email, nombre, rol_id) 
-- VALUES ('tu-email@dominio.com', 'Tu Nombre Completo', 1);
--
-- Verificar:
-- SELECT * FROM ciepi.usuarios_administradores;

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todos los administradores activos
-- SELECT * FROM ciepi.usuarios_administradores WHERE activo = true;

-- Desactivar un administrador
-- UPDATE ciepi.usuarios_administradores SET activo = false WHERE email = 'usuario@ejemplo.com';

-- Reactivar un administrador
-- UPDATE ciepi.usuarios_administradores SET activo = true WHERE email = 'usuario@ejemplo.com';

-- Cambiar el nombre de un administrador
-- UPDATE ciepi.usuarios_administradores SET nombre = 'Nuevo Nombre' WHERE email = 'usuario@ejemplo.com';

-- Cambiar el rol de un administrador
-- UPDATE ciepi.usuarios_administradores SET rol_id = 2 WHERE email = 'usuario@ejemplo.com';

-- Agregar múltiples administradores con diferentes roles
-- INSERT INTO ciepi.usuarios_administradores (email, nombre, rol_id) VALUES 
--   ('admin1@dominio.com', 'Admin General 1', 1),
--   ('superadmin@dominio.com', 'Super Administrador', 2),
--   ('editor@dominio.com', 'Editor Principal', 3);
