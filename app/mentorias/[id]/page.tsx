"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { withBasePath, assetUrl } from "@/lib/basePath";
import PrivacyConsentCheckbox from "@/components/PrivacyConsentCheckbox";
import TurnstileWidget, { isTurnstileClientEnabled } from "@/components/TurnstileWidget";

interface Turno {
  inicio: string;
  fin: string;
  fecha: string;
  hora: string;
  modalidad: "presencial" | "virtual";
  sede_nombre: string | null;
  aula_nombre: string | null;
}

interface Mentor {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  biografia: string | null;
  foto: string | null;
  duracion_mentoria_min: number;
  areas: { id: number; nombre: string }[];
  turnos: Turno[];
}

const INPUT =
  "w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const fechaLarga = (fecha: string) =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-PA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** "9:00 a. m." a partir de "09:00". */
const hora12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
};

const lugar = (t: Turno) =>
  t.modalidad === "virtual" ? "Virtual" : [t.sede_nombre, t.aula_nombre].filter(Boolean).join(", ") || "Presencial";

export default function MentorPage() {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dia, setDia] = useState<string | null>(null);
  const [turno, setTurno] = useState<Turno | null>(null);
  const [form, setForm] = useState({ nombre: "", correo: "", telefono: "", area_id: "", tema: "" });
  const [consentimiento, setConsentimiento] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  // Cambia tras cada envío para volver a montar el widget: un token de Turnstile solo sirve una vez.
  const [intentoTurnstile, setIntentoTurnstile] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<{ minutos: number; correo: string } | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(withBasePath(`/api/mentorias/mentores/${id}`)).then((r) => r.json());
    if (!res.success) {
      setNotFound(true);
      return;
    }
    setMentor(res.data);
    const primerDia = res.data.turnos[0]?.fecha ?? null;
    setDia((d) => (d && res.data.turnos.some((t: Turno) => t.fecha === d) ? d : primerDia));
  }, [id]);

  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, [cargar]);

  const dias = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of mentor?.turnos ?? []) map.set(t.fecha, [...(map.get(t.fecha) ?? []), t]);
    return map;
  }, [mentor]);

  const reservar = async (e: FormEvent) => {
    e.preventDefault();
    if (!mentor || !turno) return;
    setError(null);
    if (!consentimiento) return setError("Debes aceptar la Política de Privacidad para reservar.");
    if (isTurnstileClientEnabled() && !turnstileToken) return setError("Completa la verificación de seguridad.");
    setEnviando(true);
    const tokenUsado = turnstileToken;
    // El token ya se consumió en el servidor, salga bien o mal: se pide uno nuevo.
    setTurnstileToken("");
    setIntentoTurnstile((n) => n + 1);
    try {
      const resp = await fetch(withBasePath("/api/mentorias/reservas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profesor_id: mentor.id,
          inicio: turno.inicio,
          area_id: form.area_id || null,
          nombre: form.nombre,
          correo: form.correo,
          telefono: form.telefono,
          tema: form.tema,
          consentimiento,
          turnstileToken: tokenUsado,
        }),
      });
      const res = await resp.json().catch(() => ({ success: false }));
      if (!res.success) {
        setError(res.error || "No se pudo registrar la reserva.");
        // Solo si el horario se ocupó se recargan los turnos y se cierra el formulario;
        // con otros errores (datos, verificación) la persona corrige y reintenta.
        if (res.code === "TURNO_OCUPADO") {
          await cargar();
          setTurno(null);
        }
        return;
      }
      setEnviado({ minutos: res.minutosParaConfirmar, correo: form.correo.trim() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (notFound || !mentor) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-midnight_text dark:text-white">Este mentor no está disponible.</p>
        <Link href="/mentorias" className="text-primary font-semibold hover:underline">
          Ver todos los mentores
        </Link>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="bg-slateGray dark:bg-gray-900 min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-8 text-center">
          <span className="w-16 h-16 mx-auto rounded-full bg-brand-green/15 text-brand-green flex items-center justify-center mb-4">
            <Icon icon="solar:letter-opened-linear" className="text-4xl" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold text-primary dark:text-white">Revisa tu correo</h1>
          <p className="mt-3 text-dark_grey dark:text-gray-300">
            Enviamos un enlace a <strong>{enviado.correo}</strong>. Ábrelo y pulsa <strong>«Confirmar reserva»</strong> en los
            próximos <strong>{enviado.minutos} minutos</strong>; si no, el horario quedará libre para otras personas.
          </p>
          <p className="mt-3 text-sm text-dark_grey dark:text-gray-400">¿No lo ves? Revisa la carpeta de correo no deseado.</p>
          <Link href="/mentorias" className="inline-block mt-6 text-primary font-semibold hover:underline">
            Volver a mentorías
          </Link>
        </div>
      </div>
    );
  }

  const turnosDelDia = dia ? dias.get(dia) ?? [] : [];

  return (
    <div className="bg-slateGray dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-10">
        <Link href="/mentorias" className="inline-flex items-center gap-1.5 text-sm text-dark_grey dark:text-gray-400 hover:text-primary mb-6">
          <Icon icon="solar:alt-arrow-left-linear" aria-hidden="true" />
          Todos los mentores
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Perfil */}
          <aside className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6">
            <div className="flex flex-col items-center text-center">
              {mentor.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(mentor.foto)} alt="" className="w-32 h-32 rounded-full object-cover" />
              ) : (
                <span className="w-32 h-32 rounded-full bg-primary/10 text-primary text-4xl font-bold flex items-center justify-center">
                  {mentor.nombre.charAt(0)}
                  {mentor.apellido.charAt(0)}
                </span>
              )}
              <h1 className="mt-4 text-3xl font-bold text-primary dark:text-white">
                {mentor.nombre} {mentor.apellido}
              </h1>
              {mentor.especialidad && <p className="text-dark_grey dark:text-gray-400">{mentor.especialidad}</p>}
            </div>
            {mentor.biografia && <p className="mt-5 text-sm text-dark_grey dark:text-gray-300 leading-relaxed">{mentor.biografia}</p>}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {mentor.areas.map((a) => (
                <span key={a.id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-tint dark:bg-gray-700 text-primary dark:text-gray-200">
                  {a.nombre}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm text-dark_grey dark:text-gray-400 inline-flex items-center gap-1.5">
              <Icon icon="solar:clock-circle-linear" aria-hidden="true" />
              Sesiones de {mentor.duracion_mentoria_min} minutos
            </p>
          </aside>

          {/* Horarios y formulario */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-primary dark:text-white">1. Elige un horario</h2>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">Horas de Panamá. Próximas 4 semanas.</p>
              {dias.size === 0 ? (
                <p className="mt-5 text-dark_grey dark:text-gray-300">
                  Este mentor no tiene horarios disponibles por ahora.{" "}
                  <Link href="/mentorias" className="text-primary font-semibold hover:underline">
                    Ver otros mentores
                  </Link>
                </p>
              ) : (
                <>
                  <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Días disponibles">
                    {[...dias.keys()].map((f) => {
                      const d = new Date(`${f}T12:00:00Z`);
                      const activo = f === dia;
                      return (
                        <button
                          key={f}
                          role="option"
                          aria-selected={activo}
                          aria-label={fechaLarga(f)}
                          onClick={() => {
                            setDia(f);
                            setTurno(null);
                          }}
                          className={`flex-shrink-0 w-20 rounded-xl border py-2 text-center transition-colors ${
                            activo
                              ? "bg-primary border-primary text-white"
                              : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-midnight_text dark:text-gray-200 hover:border-primary"
                          }`}
                        >
                          <span className="block text-xs uppercase">{d.toLocaleDateString("es-PA", { timeZone: "UTC", weekday: "short" })}</span>
                          <span className="block text-2xl font-bold font-[family-name:var(--font-display)]">{d.getUTCDate()}</span>
                          <span className="block text-xs">{d.toLocaleDateString("es-PA", { timeZone: "UTC", month: "short" })}</span>
                        </button>
                      );
                    })}
                  </div>
                  {dia && <p className="mt-4 text-sm font-semibold capitalize text-midnight_text dark:text-white">{fechaLarga(dia)}</p>}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {turnosDelDia.map((t) => {
                      const activo = turno?.inicio === t.inicio;
                      return (
                        <button
                          key={t.inicio}
                          onClick={() => setTurno(t)}
                          aria-pressed={activo}
                          aria-label={`${fechaLarga(t.fecha)}, ${hora12(t.hora)}, ${lugar(t)}`}
                          className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            activo
                              ? "bg-secondary border-secondary text-white"
                              : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-secondary"
                          }`}
                        >
                          <span className="block font-bold">{hora12(t.hora)}</span>
                          <span className={`block text-xs ${activo ? "text-white/90" : "text-dark_grey dark:text-gray-400"}`}>{lugar(t)}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {turno && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6">
                <h2 className="text-2xl font-bold text-primary dark:text-white">2. Tus datos</h2>
                <p className="mt-1 text-sm text-dark_grey dark:text-gray-300">
                  Reserva: <strong className="capitalize">{fechaLarga(turno.fecha)}</strong>, {hora12(turno.hora)} · {lugar(turno)}
                </p>
                <form onSubmit={reservar} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-sm font-semibold">Nombre completo *</span>
                    <input required maxLength={200} autoComplete="name" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={INPUT} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Correo electrónico *</span>
                    <input required type="email" maxLength={255} autoComplete="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className={INPUT} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">Teléfono *</span>
                    <input required type="tel" maxLength={20} autoComplete="tel" placeholder="6666-6666" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={INPUT} />
                  </label>
                  {mentor.areas.length > 0 && (
                    <label className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-sm font-semibold">Área</span>
                      <select value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} className={INPUT}>
                        <option value="">Sin especificar</option>
                        {mentor.areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-sm font-semibold">¿Qué quieres trabajar en la mentoría? *</span>
                    <textarea
                      required
                      minLength={10}
                      maxLength={1500}
                      rows={4}
                      value={form.tema}
                      onChange={(e) => setForm({ ...form, tema: e.target.value })}
                      placeholder="Ej.: Tengo una idea de negocio de alimentos y quiero validar precios y canales de venta."
                      className={`${INPUT} h-auto py-3`}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <PrivacyConsentCheckbox
                      checked={consentimiento}
                      onChange={setConsentimiento}
                      purpose="para gestionar mi reserva de mentoría y contactarme sobre ella"
                    />
                    {isTurnstileClientEnabled() && (
                      <div className="mb-4">
                        <TurnstileWidget
                          key={intentoTurnstile}
                          onVerify={setTurnstileToken}
                          onExpire={() => setTurnstileToken("")}
                        />
                      </div>
                    )}
                    {error && (
                      <p role="alert" className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={enviando}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary text-white font-semibold px-7 py-3 hover:brightness-95 disabled:opacity-60"
                    >
                      {enviando ? "Enviando..." : "Reservar mentoría"}
                      <Icon icon="solar:arrow-right-linear" aria-hidden="true" />
                    </button>
                    <p className="mt-3 text-xs text-dark_grey dark:text-gray-400">
                      Te enviaremos un correo para confirmar la reserva.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
