"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import CalendarGrid from "@/components/CalendarGrid";
import { withBasePath } from "@/lib/basePath";
import { fechaPanama, horaPanama, ETIQUETA_ESTADO_RESERVA, type EstadoReserva } from "@/lib/mentorias";
import type { CalendarEvent } from "@/lib/calendarUtils";
import GestionReservaModal, { lugarReserva, type ReservaAdmin } from "./GestionReservaModal";

const COLOR: Record<EstadoReserva, CalendarEvent["color"]> = {
  confirmada: "blue",
  completada: "emerald",
  no_asistio: "amber",
  pendiente_verificacion: "purple",
  cancelada_usuario: "rose",
  cancelada_ciepi: "rose",
  expirada: "rose",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Agenda mensual de mentorías (todas menos las expiradas). */
export default function AgendaPanel() {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth());
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<ReservaAdmin | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const ultimo = new Date(year, month + 1, 0).getDate();
    const qs = new URLSearchParams({
      vista: "calendario",
      desde: `${year}-${pad(month + 1)}-01`,
      hasta: `${year}-${pad(month + 1)}-${pad(ultimo)}`,
    });
    try {
      const res = await fetch(withBasePath(`/api/admin/mentorias/reservas?${qs}`)).then((r) => r.json());
      if (!res.success) throw new Error(res.error);
      setReservas(res.data);
    } catch {
      toast.error("No se pudo cargar la agenda");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eventos: CalendarEvent[] = reservas.map((r) => ({
    id: String(r.id),
    title: r.nombre,
    date: fechaPanama(new Date(r.inicio)),
    startTime: horaPanama(new Date(r.inicio)),
    endTime: horaPanama(new Date(r.fin)),
    color: COLOR[r.estado],
    badge: ETIQUETA_ESTADO_RESERVA[r.estado],
    subtitle: r.mentor,
    location: lugarReserva(r),
    meta: { id: r.id },
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 text-xs">
        {(["confirmada", "completada", "no_asistio", "pendiente_verificacion", "cancelada_ciepi"] as EstadoReserva[]).map((e) => (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span
              className={`w-3 h-3 rounded-full ${
                { blue: "bg-blue-400", emerald: "bg-emerald-400", amber: "bg-amber-400", purple: "bg-purple-400", rose: "bg-rose-400" }[
                  COLOR[e]!
                ]
              }`}
            />
            {e === "cancelada_ciepi" ? "Cancelada" : ETIQUETA_ESTADO_RESERVA[e]}
          </span>
        ))}
      </div>
      <CalendarGrid
        year={year}
        monthIndex0={month}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        events={eventos}
        loading={loading}
        emptyDayText="No hay mentorías este día."
        onEventClick={(ev) => setAbierta(reservas.find((r) => String(r.id) === ev.id) ?? null)}
      />
      {abierta && (
        <GestionReservaModal
          reserva={abierta}
          onClose={() => setAbierta(null)}
          onChanged={() => {
            cargar();
          }}
        />
      )}
    </div>
  );
}
