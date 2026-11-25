"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath, assetUrl } from "@/lib/basePath";
import SectionTitle from "@/components/brand/SectionTitle";

interface Mentor {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  biografia: string | null;
  foto: string | null;
  duracion_mentoria_min: number;
  areas: { id: number; nombre: string }[];
  modalidades: string[];
  turnos_disponibles: number;
  proximo_turno: string | null;
}

const proximo = (iso: string) =>
  new Date(iso).toLocaleString("es-PA", {
    timeZone: "America/Panama",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export default function MentoriasPage() {
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [area, setArea] = useState<number | null>(null);
  const [modalidad, setModalidad] = useState<string | null>(null);

  useEffect(() => {
    fetch(withBasePath("/api/mentorias/mentores"))
      .then((r) => r.json())
      .then((d) => (d.success ? setMentores(d.data) : setError(true)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(() => {
    const map = new Map<number, string>();
    mentores.forEach((m) => m.areas.forEach((a) => map.set(a.id, a.nombre)));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [mentores]);

  const visibles = mentores.filter(
    (m) => (area === null || m.areas.some((a) => a.id === area)) && (modalidad === null || m.modalidades.includes(modalidad))
  );

  const chip = (activo: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
      activo
        ? "bg-primary border-primary text-white"
        : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-midnight_text dark:text-gray-200 hover:border-primary"
    }`;

  return (
    <div className="bg-slateGray dark:bg-gray-900 min-h-screen">
      <section className="bg-primary text-white relative overflow-hidden py-0">
        <div className="absolute inset-0 bg-inadeh-pattern opacity-[0.045] pointer-events-none" aria-hidden="true" />
        <div className="relative container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-14">
          <span aria-hidden="true" className="block w-14 h-1.5 rounded-full bg-brand-green mb-4" />
          <h1 className="text-5xl md:text-6xl font-extrabold">Reserva de mentorías</h1>
          <p className="mt-4 text-lg text-white/85 max-w-[60ch]">
            Agenda una sesión con nuestros instructores y mentores especializados. Elige el área, el mentor y
            el horario que mejor te funcione.
          </p>
          <ol className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl text-sm">
            {[
              ["1", "Elige un mentor", "solar:user-check-rounded-linear"],
              ["2", "Escoge un horario", "solar:calendar-linear"],
              ["3", "Confirma por correo", "solar:letter-linear"],
            ].map(([n, t, icon]) => (
              <li key={n} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <Icon icon={icon} className="text-2xl text-white" aria-hidden="true" />
                <span>
                  <span className="text-white/70">Paso {n}</span>
                  <span className="block font-semibold">{t}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
          <SectionTitle title="Nuestros mentores" />

          {!loading && mentores.length > 0 && (
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por área">
                <span className="text-sm font-semibold text-dark_grey dark:text-gray-400 mr-1">Área:</span>
                <button className={chip(area === null)} aria-pressed={area === null} onClick={() => setArea(null)}>
                  Todas
                </button>
                {areas.map(([id, nombre]) => (
                  <button key={id} className={chip(area === id)} aria-pressed={area === id} onClick={() => setArea(id)}>
                    {nombre}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por modalidad">
                <span className="text-sm font-semibold text-dark_grey dark:text-gray-400 mr-1">Modalidad:</span>
                {[
                  [null, "Todas"],
                  ["virtual", "Virtual"],
                  ["presencial", "Presencial"],
                ].map(([v, l]) => (
                  <button key={l} className={chip(modalidad === v)} aria-pressed={modalidad === v} onClick={() => setModalidad(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
            </div>
          ) : error ? (
            <p className="text-center py-16 text-dark_grey">No pudimos cargar los mentores. Intenta de nuevo más tarde.</p>
          ) : visibles.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
              <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-primary/40 mx-auto mb-3" />
              <p className="font-semibold text-midnight_text dark:text-white">
                {mentores.length === 0 ? "Pronto publicaremos los horarios de nuestros mentores." : "Ningún mentor coincide con los filtros."}
              </p>
              <Link href="/contacto" className="inline-block mt-3 text-primary font-semibold hover:underline">
                Escríbenos si necesitas orientación
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibles.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6"
                >
                  <div className="flex items-center gap-4">
                    {m.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(m.foto)} alt="" className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <span className="w-20 h-20 rounded-full bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center flex-shrink-0">
                        {m.nombre.charAt(0)}
                        {m.apellido.charAt(0)}
                      </span>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-primary dark:text-white leading-tight">
                        {m.nombre} {m.apellido}
                      </h2>
                      {m.especialidad && <p className="text-sm text-dark_grey dark:text-gray-400">{m.especialidad}</p>}
                    </div>
                  </div>
                  {m.biografia && (
                    <p className="mt-4 text-sm text-dark_grey dark:text-gray-300 leading-relaxed line-clamp-3">{m.biografia}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {m.areas.map((a) => (
                      <span key={a.id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-tint dark:bg-gray-700 text-primary dark:text-gray-200">
                        {a.nombre}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark_grey dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Icon icon="solar:clock-circle-linear" aria-hidden="true" />
                      {m.duracion_mentoria_min} min
                    </span>
                    {m.modalidades.map((mod) => (
                      <span key={mod} className="inline-flex items-center gap-1">
                        <Icon icon={mod === "virtual" ? "solar:monitor-linear" : "solar:map-point-linear"} aria-hidden="true" />
                        {mod === "virtual" ? "Virtual" : "Presencial"}
                      </span>
                    ))}
                  </p>
                  <div className="mt-auto pt-5">
                    <p className="text-sm mb-3">
                      {m.proximo_turno ? (
                        <>
                          <span className="text-dark_grey dark:text-gray-400">Próximo horario: </span>
                          <strong className="text-midnight_text dark:text-white capitalize">{proximo(m.proximo_turno)}</strong>
                        </>
                      ) : (
                        <span className="text-dark_grey dark:text-gray-400">Sin horarios disponibles por ahora</span>
                      )}
                    </p>
                    <Link
                      href={`/mentorias/${m.id}`}
                      className={`group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-sm transition-all ${
                        m.turnos_disponibles > 0
                          ? "bg-secondary text-white hover:brightness-95"
                          : "bg-surface-tint dark:bg-gray-700 text-primary dark:text-white"
                      }`}
                    >
                      {m.turnos_disponibles > 0 ? "Ver horarios y reservar" : "Ver perfil"}
                      <Icon icon="solar:arrow-right-linear" className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
