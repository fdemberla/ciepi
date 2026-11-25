"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import { withBasePath, assetUrl } from "@/lib/basePath";
import { DIAS_SEMANA, DURACIONES_MENTORIA, type Turno } from "@/lib/mentorias";

interface Bloque {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  modalidad: "presencial" | "virtual";
  sede_id: number | null;
  aula_id: number | null;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

interface Bloqueo {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

interface Mentor {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  correo: string | null;
  es_mentor: boolean;
  foto: string | null;
  duracion_mentoria_min: number;
  area_ids: number[];
  disponibilidad: Bloque[];
  bloqueos: Bloqueo[];
}

interface Area {
  id: number;
  nombre: string;
  activo: boolean;
}

interface Sede {
  id: number;
  nombre: string;
  edificios: { id: number; nombre: string; aulas: { id: number; nombre: string; capacidad: number | null }[] }[];
}

const INPUT =
  "h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

const bloqueNuevo = (): Bloque => ({
  dia_semana: 1,
  hora_inicio: "09:00",
  hora_fin: "12:00",
  modalidad: "virtual",
  sede_id: null,
  aula_id: null,
  vigente_desde: null,
  vigente_hasta: null,
});

function Card({ title, icon, children, help }: { title: string; icon: string; children: React.ReactNode; help?: string }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-6 py-6 md:py-6 lg:py-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-primary dark:text-white">
        <Icon icon={icon} aria-hidden="true" />
        {title}
      </h2>
      {help && <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">{help}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const formatoFecha = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long" });

export default function ConfigurarMentorPage() {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [anticipacion, setAnticipacion] = useState(24);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [nuevoBloqueo, setNuevoBloqueo] = useState({ fecha_inicio: "", fecha_fin: "", motivo: "" });

  const cargarTurnos = useCallback(async () => {
    const res = await fetch(withBasePath(`/api/admin/mentorias/mentores/${id}/turnos?dias=14`)).then((r) => r.json());
    if (res.success) {
      setTurnos(res.data);
      setAnticipacion(res.anticipacionHoras);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const [m, a, s] = await Promise.all([
          fetch(withBasePath(`/api/admin/mentorias/mentores/${id}`)).then((r) => r.json()),
          fetch(withBasePath("/api/admin/mentorias/areas")).then((r) => r.json()),
          fetch(withBasePath("/api/admin/sedes")).then((r) => r.json()),
        ]);
        if (!m.success) throw new Error(m.error);
        setMentor(m.data);
        setAreas(a.data ?? []);
        setSedes(s.data ?? []);
        await cargarTurnos();
      } catch (e) {
        toast.error((e as Error).message || "No se pudo cargar el mentor");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, cargarTurnos]);

  const aulasDeSede = useCallback(
    (sedeId: number | null) =>
      sedes
        .find((s) => s.id === sedeId)
        ?.edificios.flatMap((e) => e.aulas.map((a) => ({ ...a, etiqueta: `${e.nombre} · ${a.nombre}` }))) ?? [],
    [sedes]
  );

  const setBloque = (i: number, cambios: Partial<Bloque>) =>
    setMentor((m) => m && { ...m, disponibilidad: m.disponibilidad.map((b, j) => (j === i ? { ...b, ...cambios } : b)) });

  const toggleArea = (areaId: number) =>
    setMentor(
      (m) =>
        m && {
          ...m,
          area_ids: m.area_ids.includes(areaId) ? m.area_ids.filter((x) => x !== areaId) : [...m.area_ids, areaId],
        }
    );

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("directory", "mentores");
      const res = await fetch(withBasePath("/api/upload"), { method: "POST", body: fd }).then((r) => r.json());
      if (!res.success) throw new Error(res.error);
      setMentor((m) => m && { ...m, foto: res.url });
      toast.success("Foto cargada. Recuerda guardar.");
    } catch (e) {
      toast.error((e as Error).message || "No se pudo subir la foto");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardar = async () => {
    if (!mentor) return;
    if (mentor.es_mentor && mentor.disponibilidad.length === 0) {
      toast("El mentor está activo pero no tiene horario: no aparecerán turnos.", { icon: "⚠️" });
    }
    setSaving(true);
    try {
      const res = await fetch(withBasePath(`/api/admin/mentorias/mentores/${mentor.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          es_mentor: mentor.es_mentor,
          duracion_mentoria_min: mentor.duracion_mentoria_min,
          foto: mentor.foto,
          area_ids: mentor.area_ids,
          disponibilidad: mentor.disponibilidad,
        }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error);
      toast.success("Configuración guardada");
      await cargarTurnos();
    } catch (e) {
      toast.error((e as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const agregarBloqueo = async (e: FormEvent) => {
    e.preventDefault();
    if (!mentor) return;
    const res = await fetch(withBasePath(`/api/admin/mentorias/mentores/${mentor.id}/bloqueos`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevoBloqueo, fecha_fin: nuevoBloqueo.fecha_fin || nuevoBloqueo.fecha_inicio }),
    }).then((r) => r.json());
    if (!res.success) return toast.error(res.error || "No se pudo agregar el bloqueo");
    setMentor((m) => m && { ...m, bloqueos: [...m.bloqueos, res.data].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)) });
    setNuevoBloqueo({ fecha_inicio: "", fecha_fin: "", motivo: "" });
    toast.success("Fechas bloqueadas");
    cargarTurnos();
  };

  const eliminarBloqueo = async (b: Bloqueo) => {
    if (!mentor || !window.confirm("¿Quitar este bloqueo? Esas fechas volverán a tener turnos.")) return;
    const res = await fetch(withBasePath(`/api/admin/mentorias/mentores/${mentor.id}/bloqueos/${b.id}`), {
      method: "DELETE",
    }).then((r) => r.json());
    if (!res.success) return toast.error(res.error || "No se pudo quitar el bloqueo");
    setMentor((m) => m && { ...m, bloqueos: m.bloqueos.filter((x) => x.id !== b.id) });
    cargarTurnos();
  };

  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>();
    for (const t of turnos) map.set(t.fecha, [...(map.get(t.fecha) ?? []), t]);
    return [...map.entries()];
  }, [turnos]);

  if (loading) {
    return (
      <AdminProtection>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
        </div>
      </AdminProtection>
    );
  }

  if (!mentor) {
    return (
      <AdminProtection>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-dark_grey">No se encontró el profesor.</p>
          <Link href="/admin/mentorias" className="text-primary font-semibold hover:underline">
            Volver a Mentorías
          </Link>
        </div>
      </AdminProtection>
    );
  }

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900">
        <div className="container mx-auto lg:max-w-screen-lg px-4 py-10 flex flex-col gap-6">
          <div>
            <nav className="text-xs text-dark_grey dark:text-gray-400 mb-2 flex items-center gap-1">
              <Link href="/admin/mentorias" className="hover:text-primary">
                Mentorías
              </Link>
              <Icon icon="solar:alt-arrow-right-linear" aria-hidden="true" />
              <span>Configurar mentor</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold text-primary dark:text-white">
              {mentor.nombre} {mentor.apellido}
            </h1>
            <p className="text-dark_grey dark:text-gray-400">{mentor.especialidad || "Sin especialidad registrada"}</p>
          </div>

          {/* 1. Datos de mentor */}
          <Card title="Perfil de mentor" icon="solar:user-check-rounded-linear">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="flex flex-col items-center gap-2">
                {mentor.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(mentor.foto)} alt="Foto del mentor" className="w-28 h-28 rounded-full object-cover" />
                ) : (
                  <span className="w-28 h-28 rounded-full bg-primary/10 text-primary text-3xl font-bold flex items-center justify-center">
                    {mentor.nombre.charAt(0)}
                    {mentor.apellido.charAt(0)}
                  </span>
                )}
                <label className="text-xs font-semibold text-primary cursor-pointer hover:underline">
                  {subiendoFoto ? "Subiendo..." : mentor.foto ? "Cambiar foto" : "Subir foto"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={subiendoFoto}
                    onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])}
                  />
                </label>
                {mentor.foto && (
                  <button type="button" onClick={() => setMentor({ ...mentor, foto: null })} className="text-xs text-dark_grey hover:underline">
                    Quitar foto
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mentor.es_mentor}
                    onChange={(e) => setMentor({ ...mentor, es_mentor: e.target.checked })}
                    className="w-5 h-5 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="font-semibold text-midnight_text dark:text-white">Ofrece mentorías</span>
                    <span className="block text-sm text-dark_grey dark:text-gray-400">
                      Si está desmarcado, no aparece en la página pública de mentorías.
                    </span>
                  </span>
                </label>
                <label className="flex flex-col gap-1 max-w-xs">
                  <span className="text-sm font-semibold text-midnight_text dark:text-white">Duración de cada mentoría</span>
                  <select
                    value={mentor.duracion_mentoria_min}
                    onChange={(e) => setMentor({ ...mentor, duracion_mentoria_min: Number(e.target.value) })}
                    className={INPUT}
                  >
                    {DURACIONES_MENTORIA.map((d) => (
                      <option key={d} value={d}>
                        {d} minutos
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-dark_grey dark:text-gray-400">
                  La foto y la biografía se muestran en la tarjeta pública del mentor. La biografía se edita en{" "}
                  <Link href="/admin/profesores" className="text-primary hover:underline">
                    Profesores
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Card>

          {/* 2. Áreas */}
          <Card title="Áreas que atiende" icon="solar:tag-linear" help="El público podrá filtrar a los mentores por estas áreas.">
            <div className="flex flex-wrap gap-2">
              {areas
                .filter((a) => a.activo || mentor.area_ids.includes(a.id))
                .map((a) => {
                  const on = mentor.area_ids.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleArea(a.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                        on
                          ? "bg-primary border-primary text-white"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-midnight_text dark:text-gray-200 hover:border-primary"
                      }`}
                    >
                      {on && <Icon icon="solar:check-read-linear" aria-hidden="true" />}
                      {a.nombre}
                    </button>
                  );
                })}
            </div>
            <Link href="/admin/mentorias" className="inline-block mt-3 text-xs text-primary hover:underline">
              Gestionar áreas
            </Link>
          </Card>

          {/* 3. Horario semanal */}
          <Card
            title="Horario semanal"
            icon="solar:calendar-linear"
            help="Bloques en hora de Panamá. Cada bloque se divide en turnos de la duración elegida."
          >
            <div className="flex flex-col gap-3">
              {mentor.disponibilidad.length === 0 && (
                <p className="text-sm text-dark_grey dark:text-gray-400">Sin bloques de horario. Agrega al menos uno.</p>
              )}
              {mentor.disponibilidad.map((b, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold">Día</span>
                      <select value={b.dia_semana} onChange={(e) => setBloque(i, { dia_semana: Number(e.target.value) })} className={INPUT}>
                        {DIAS_SEMANA.map((d, idx) => (
                          <option key={d} value={idx}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold">Desde</span>
                      <input type="time" value={b.hora_inicio} onChange={(e) => setBloque(i, { hora_inicio: e.target.value })} className={INPUT} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold">Hasta</span>
                      <input type="time" value={b.hora_fin} onChange={(e) => setBloque(i, { hora_fin: e.target.value })} className={INPUT} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold">Modalidad</span>
                      <select
                        value={b.modalidad}
                        onChange={(e) =>
                          setBloque(i, {
                            modalidad: e.target.value as Bloque["modalidad"],
                            ...(e.target.value === "virtual" ? { sede_id: null, aula_id: null } : {}),
                          })
                        }
                        className={INPUT}
                      >
                        <option value="virtual">Virtual</option>
                        <option value="presencial">Presencial</option>
                      </select>
                    </label>
                    {b.modalidad === "presencial" && (
                      <>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-semibold">Sede</span>
                          <select
                            value={b.sede_id ?? ""}
                            onChange={(e) => setBloque(i, { sede_id: e.target.value ? Number(e.target.value) : null, aula_id: null })}
                            className={INPUT}
                          >
                            <option value="">Sin definir</option>
                            {sedes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-semibold">Aula</span>
                          <select
                            value={b.aula_id ?? ""}
                            onChange={(e) => setBloque(i, { aula_id: e.target.value ? Number(e.target.value) : null })}
                            className={INPUT}
                            disabled={!b.sede_id}
                          >
                            <option value="">Sin definir</option>
                            {aulasDeSede(b.sede_id).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.etiqueta}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setMentor({ ...mentor, disponibilidad: mentor.disponibilidad.filter((_, j) => j !== i) })}
                      aria-label={`Eliminar bloque ${i + 1}`}
                      className="ml-auto h-10 w-10 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" className="text-xl" aria-hidden="true" />
                    </button>
                  </div>
                  <details className="text-sm" open={!!(b.vigente_desde || b.vigente_hasta)}>
                    <summary className="cursor-pointer text-xs text-dark_grey dark:text-gray-400">Vigencia (opcional)</summary>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">Desde</span>
                        <input type="date" value={b.vigente_desde ?? ""} onChange={(e) => setBloque(i, { vigente_desde: e.target.value || null })} className={INPUT} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">Hasta</span>
                        <input type="date" value={b.vigente_hasta ?? ""} onChange={(e) => setBloque(i, { vigente_hasta: e.target.value || null })} className={INPUT} />
                      </label>
                    </div>
                  </details>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMentor({ ...mentor, disponibilidad: [...mentor.disponibilidad, bloqueNuevo()] })}
                className="self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-tint dark:bg-gray-700 text-primary dark:text-white text-sm font-semibold"
              >
                <Icon icon="solar:add-circle-linear" aria-hidden="true" />
                Agregar bloque
              </button>
            </div>
          </Card>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary text-white font-semibold shadow-lg hover:brightness-95 disabled:opacity-60"
            >
              <Icon icon="solar:diskette-linear" aria-hidden="true" />
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>

          {/* 4. Bloqueos */}
          <Card
            title="Fechas sin atención"
            icon="solar:calendar-mark-linear"
            help="Vacaciones, licencias o feriados. Se guardan al instante y quitan los turnos de esas fechas."
          >
            {mentor.bloqueos.length > 0 && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 mb-4">
                {mentor.bloqueos.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="font-semibold text-midnight_text dark:text-white">
                        {b.fecha_inicio === b.fecha_fin ? b.fecha_inicio : `${b.fecha_inicio} al ${b.fecha_fin}`}
                      </span>
                      {b.motivo && <span className="text-dark_grey dark:text-gray-400"> · {b.motivo}</span>}
                    </span>
                    <button onClick={() => eliminarBloqueo(b)} className="text-xs font-semibold text-red-600 hover:underline">
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={agregarBloqueo} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold">Desde</span>
                <input type="date" required value={nuevoBloqueo.fecha_inicio} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, fecha_inicio: e.target.value })} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold">Hasta (opcional)</span>
                <input type="date" value={nuevoBloqueo.fecha_fin} min={nuevoBloqueo.fecha_inicio} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, fecha_fin: e.target.value })} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1 flex-1 min-w-[12rem]">
                <span className="text-xs font-semibold">Motivo (opcional)</span>
                <input value={nuevoBloqueo.motivo} maxLength={200} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, motivo: e.target.value })} className={INPUT} placeholder="Vacaciones" />
              </label>
              <button type="submit" className="h-10 px-4 rounded-full bg-primary text-white text-sm font-semibold">
                Bloquear fechas
              </button>
            </form>
          </Card>

          {/* 5. Vista previa */}
          <Card
            title="Vista previa de turnos (próximos 14 días)"
            icon="solar:eye-linear"
            help={`Así los verá el público. Solo se ofrecen turnos con al menos ${anticipacion} horas de anticipación. Se actualiza al guardar.`}
          >
            {!mentor.es_mentor && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Este profesor no está marcado como mentor: no se mostrará al público.
              </p>
            )}
            {turnosPorDia.length === 0 ? (
              <p className="text-sm text-dark_grey dark:text-gray-400">No hay turnos disponibles en los próximos 14 días.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {turnosPorDia.map(([fecha, ts]) => (
                  <div key={fecha}>
                    <p className="text-sm font-semibold capitalize text-midnight_text dark:text-white mb-1.5">{formatoFecha(fecha)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ts.map((t) => (
                        <span
                          key={t.inicio}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            t.modalidad === "virtual" ? "bg-primary/10 text-primary" : "bg-brand-green/15 text-green-800 dark:text-green-300"
                          }`}
                          title={t.modalidad === "virtual" ? "Virtual" : "Presencial"}
                        >
                          {t.hora}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminProtection>
  );
}
