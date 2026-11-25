"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import CalendarGrid from "@/components/CalendarGrid";
import { withBasePath } from "@/lib/basePath";
import type { CalendarEvent } from "@/lib/calendarUtils";

interface SedeOption {
  id: number;
  nombre: string;
}

export default function AdminCalendarioPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(now.getMonth());
  const [sedeId, setSedeId] = useState<string>("");
  const [modalidad, setModalidad] = useState<string>("");
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBasePath("/api/admin/sedes"))
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSedes(d.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const monthStr = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
      const params = new URLSearchParams({ month: monthStr });
      if (sedeId) params.set("sedeId", sedeId);
      if (modalidad) params.set("modalidad", modalidad);

      const res = await fetch(
        withBasePath(`/api/admin/calendario?${params.toString()}`),
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Error cargando calendario:", err);
    } finally {
      setLoading(false);
    }
  }, [year, monthIndex0, sedeId, modalidad]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-10">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                Calendario de Clases
              </h1>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                Visualiza las clases programadas por día, sede, aula y
                modalidad.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                Presencial
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                Virtual
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                Híbrida
              </span>
            </div>
          </div>

          <CalendarGrid
            year={year}
            monthIndex0={monthIndex0}
            onMonthChange={(y, m) => {
              setYear(y);
              setMonthIndex0(m);
            }}
            events={events}
            loading={loading}
            emptyDayText="No hay clases programadas para este día."
            onEventClick={(ev) => {
              const capId = ev.meta?.capacitacionId;
              if (capId) {
                router.push(`/admin/capacitaciones/detalles/${capId}`);
              }
            }}
            headerRight={
              <>
                <select
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-medium"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-medium"
                >
                  <option value="">Todas las modalidades</option>
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="hibrida">Híbrida</option>
                </select>
              </>
            }
          />
        </div>
      </div>
    </AdminProtection>
  );
}
