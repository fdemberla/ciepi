import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@iconify/react";

export const metadata: Metadata = {
  title: "Política de Privacidad — CIEPI | INADEH",
  description:
    "Política de Privacidad y Protección de Datos Personales del Centro de Innovación y Emprendimiento Productivo (CIEPI - INADEH) conforme a la Ley 81 de 2019 de la República de Panamá.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-12 sm:py-16">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-blue-700 px-6 sm:px-10 py-10 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                <Icon icon="solar:shield-check-linear" className="text-2xl" />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider text-white/90">
                Protección de Datos Personales
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Política de Privacidad
            </h1>
            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              Centro de Innovación y Emprendimiento Productivo (CIEPI) &mdash;
              INADEH, República de Panamá. Cumplimiento conforme a la Ley 81 de
              26 de marzo de 2019 y su Decreto Ejecutivo No. 285 de 28 de mayo de
              2021.
            </p>
            <p className="mt-4 text-xs text-white/80">
              Última actualización: noviembre de 2026 &middot; Versión 1.0
            </p>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-8 text-dark_grey dark:text-gray-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                1. Responsable del Tratamiento de los Datos
              </h2>
              <p>
                El <strong>Centro de Innovación y Emprendimiento Productivo (CIEPI)</strong>,
                iniciativa del <strong>Instituto Nacional de Formación Profesional y
                Capacitación para el Desarrollo Humano (INADEH)</strong>, con sede
                en la República de Panamá, es responsable del tratamiento de los
                datos personales recopilados a través de esta plataforma web.
              </p>
              <p className="text-sm bg-slateGray dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <strong>Canal de contacto para privacidad y ejercicio de derechos:</strong>{" "}
                <a
                  href="mailto:info@ciepi.pa"
                  className="text-primary hover:underline font-medium"
                >
                  info@ciepi.pa
                </a>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                2. Marco Legal Aplicable
              </h2>
              <p>
                El tratamiento de sus datos personales se rige por las leyes de
                la República de Panamá, en especial por la{" "}
                <strong>Ley 81 de 26 de marzo de 2019</strong> sobre Protección
                de Datos Personales, su reglamento mediante el{" "}
                <strong>Decreto Ejecutivo No. 285 de 28 de mayo de 2021</strong>,
                y demás disposiciones aplicables bajo la supervisión de la{" "}
                <strong>
                  Autoridad Nacional de Transparencia y Acceso a la Información
                  (ANTAI)
                </strong>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                3. Datos Recopilados y Finalidades del Tratamiento
              </h2>
              <p>
                Recopilamos únicamente los datos estrictamente necesarios,
                pertinentes y limitados a las finalidades informadas en cada
                formulario de la plataforma:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Boletín informativo (Newsletter):</strong> correo
                  electrónico (y nombre, en caso de proporcionarse) con la única
                  finalidad de enviar comunicaciones informativas sobre nuevas
                  capacitaciones, eventos, convocatorias y artículos del blog de
                  CIEPI.
                </li>
                <li>
                  <strong>Inscripción a capacitaciones:</strong> datos de
                  identificación (como número de cédula, nombre y apellido),
                  contacto (correo electrónico y teléfono) y ubicación
                  geográfica, para gestionar su matrícula, verificar su correo
                  electrónico y, cuando corresponda, completar procesos de
                  validación de identidad.
                </li>
                <li>
                  <strong>Formulario de contacto y consultas:</strong> nombre,
                  correo electrónico, teléfono y descripción de la consulta, con
                  el fin de responder y dar seguimiento a su solicitud.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                4. Base Legal y Consentimiento del Titular
              </h2>
              <p>
                De acuerdo con el artículo 6 de la Ley 81 de 2019, el envío del
                boletín informativo y el tratamiento de los datos proporcionados
                en nuestros formularios se basan en el{" "}
                <strong>
                  consentimiento previo, informado, expreso e inequívoco
                </strong>{" "}
                del titular, otorgado mediante la aceptación explícita de esta
                Política de Privacidad (casilla de verificación sin pre-marcar).
              </p>
              <p>
                En el caso del Newsletter, implementamos un mecanismo de{" "}
                <strong>doble confirmación (Double Opt-In)</strong> para
                verificar que el titular del correo electrónico autoriza la
                suscripción, conservando evidencia auditable de la fecha, hora y
                versión de la política aceptada.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                5. Derechos del Titular (Derechos ARCO y Portabilidad)
              </h2>
              <p>
                Como titular de los datos personales, usted puede ejercer en
                cualquier momento los siguientes derechos reconocidos por la
                legislación panameña:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong>Acceso:</strong> conocer qué datos personales suyos
                  obran en nuestras bases de datos y la finalidad de su uso.
                </li>
                <li>
                  <strong>Rectificación:</strong> solicitar la corrección de
                  datos inexactos, incompletos o desactualizados.
                </li>
                <li>
                  <strong>Cancelación:</strong> solicitar la eliminación o
                  supresión de sus datos cuando ya no sean necesarios o retire su
                  consentimiento.
                </li>
                <li>
                  <strong>Oposición:</strong> oponerse al tratamiento de sus
                  datos por motivos legítimos o para el envío de boletines.
                </li>
                <li>
                  <strong>Portabilidad:</strong> obtener una copia de sus datos
                  en un formato estructurado y de uso común cuando corresponda.
                </li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, puede escribir a{" "}
                <a
                  href="mailto:info@ciepi.pa"
                  className="text-primary hover:underline font-medium"
                >
                  info@ciepi.pa
                </a>{" "}
                indicando su nombre, documento de identidad o correo registrado y
                el derecho que desea ejercer. Las solicitudes serán atendidas
                dentro de los plazos establecidos por la Ley 81 de 2019 y su
                reglamento (hasta diez (10) días hábiles para acceso,
                rectificación, cancelación u oposición).
              </p>
              <p>
                Adicionalmente, en cada boletín del Newsletter se incluirá un
                enlace directo para{" "}
                <strong>darse de baja de forma inmediata y gratuita</strong>.
                Asimismo, si considera que sus derechos han sido vulnerados,
                puede acudir ante la{" "}
                <strong>ANTAI</strong> como autoridad competente.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                6. Conservación, Seguridad y Transferencia de Datos
              </h2>
              <p>
                Los datos personales se conservarán únicamente durante el tiempo
                necesario para cumplir la finalidad para la cual fueron
                recabados. En el caso del Newsletter, se mantendrán mientras la
                suscripción permanezca activa y serán suprimidos o anonimizados
                tras su solicitud de baja, conservando únicamente el registro
                mínimo necesario para acreditar el cumplimiento legal.
              </p>
              <p>
                CIEPI aplica medidas técnicas y organizativas de seguridad para
                proteger la información contra acceso no autorizado, pérdida o
                alteración, incluyendo cifrado en tránsito (TLS), almacenamiento
                con control de acceso y tokens de verificación protegidos
                mediante hash criptográfico.
              </p>
              <p>
                No vendemos ni cedemos datos personales a terceros con fines
                comerciales. Únicamente podrán intervenir proveedores de
                infraestructura tecnológica, servicio de correo institucional y
                herramientas de seguridad anti-spam (como Google reCAPTCHA),
                bajo estrictos criterios de confidencialidad y necesidad técnica.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                7. Cookies y Modificaciones a esta Política
              </h2>
              <p>
                Esta plataforma utiliza cookies técnicas y de sesión necesarias
                para su funcionamiento y seguridad (por ejemplo, gestión de
                sesión administrativa). CIEPI podrá actualizar esta Política de
                Privacidad para adaptarla a cambios normativos o funcionales,
                publicando la versión vigente en esta misma página.
              </p>
            </section>

            <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
              >
                <Icon icon="solar:alt-arrow-left-linear" className="text-lg" />
                Volver al inicio
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Ir a Contacto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
