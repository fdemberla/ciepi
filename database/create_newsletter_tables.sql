-- Tablas para el módulo de Newsletter (CIEPI)
-- Cumplimiento Ley 81 de 2019 (Panamá): registro auditable de consentimiento y baja

CREATE TABLE IF NOT EXISTS ciepi.newsletter_suscriptores (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(150),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    confirm_token_hash VARCHAR(64),
    confirm_token_expiracion TIMESTAMP WITH TIME ZONE,
    acepto_politica BOOLEAN NOT NULL DEFAULT FALSE,
    version_politica VARCHAR(20) NOT NULL DEFAULT '1.0',
    fecha_consentimiento TIMESTAMP WITH TIME ZONE,
    ip_consentimiento INET,
    fecha_confirmacion TIMESTAMP WITH TIME ZONE,
    fecha_baja TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_newsletter_estado CHECK (estado IN ('pendiente', 'activo', 'baja'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_suscriptores_estado
    ON ciepi.newsletter_suscriptores (estado);

CREATE INDEX IF NOT EXISTS idx_newsletter_suscriptores_confirm_hash
    ON ciepi.newsletter_suscriptores (confirm_token_hash)
    WHERE confirm_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS ciepi.newsletter_envios (
    id SERIAL PRIMARY KEY,
    asunto VARCHAR(255) NOT NULL,
    contenido_html TEXT NOT NULL,
    contenido_texto TEXT,
    total_destinatarios INTEGER NOT NULL DEFAULT 0,
    total_enviados INTEGER NOT NULL DEFAULT 0,
    total_fallidos INTEGER NOT NULL DEFAULT 0,
    enviado_por VARCHAR(255) NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
