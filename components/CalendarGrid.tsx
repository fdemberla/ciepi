"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import {
  DIAS_SEMANA_CORTOS,
  buildMonthGrid,
  toDateStr,
  type CalendarEvent,
} from "@/lib/calendarUtils";

const COLOR_STYLES: Record<NonNullable<CalendarEvent["color"]>, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800",
  emerald:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
  purple:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800",
  amber:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800",
  rose: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800",
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface CalendarGridProps {
  year: number;
  monthIndex0: number;
  onMonthChange: (year: number, monthIndex0: number) => void;
  events: CalendarEvent[];
  loading?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  emptyDayText?: string;
  headerRight?: ReactNode;
}

export default function CalendarGrid({
  year,
  monthIndex0,
  onMonthChange,
  events,
  loading = false,
  onEventClick,
  emptyDayText = "No hay actividades programadas para este día.",
  headerRight,
}: CalendarGridProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toDateStr(new Date()),
  );

  const cells = useMemo(
    () => buildMonthGrid(year, monthIndex0),
    [year, monthIndex0],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) || [];

  const handlePrevMonth = () => {
    if (monthIndex0 === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, monthIndex0 - 1);
  };

  const handleNextMonth = () => {
    if (monthIndex0 === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, monthIndex0 + 1);
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedDate(toDateStr(now));
    onMonthChange(now.getFullYear(), now.getMonth());
  };

  const formatSelectedHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString("es-PA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Main Month Grid */}
      <div className="xl:col-span-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-semibold text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Hoy
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mes anterior"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-dark_grey dark:text-gray-300"
              >
                <Icon icon="solar:alt-arrow-left-linear" className="text-xl" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Mes siguiente"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-dark_grey dark:text-gray-300"
              >
                <Icon icon="solar:alt-arrow-right-linear" className="text-xl" />
              </button>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-midnight_text dark:text-white">
              {MESES[monthIndex0]} {year}
            </h2>
          </div>

          {headerRight && (
            <div className="flex flex-wrap items-center gap-2">{headerRight}</div>
          )}
        </div>

        {/* Day of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          {DIAS_SEMANA_CORTOS.map((dia) => (
            <div
              key={dia}
              className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-dark_grey dark:text-gray-400"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        {loading ? (
          <div className="p-12 text-center text-sm text-dark_grey dark:text-gray-400">
            Cargando calendario...
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 dark:divide-gray-700">
            {cells.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const isSelected = cell.dateStr === selectedDate;
              const visibleEvents = dayEvents.slice(0, 3);
              const extraCount = dayEvents.length - visibleEvents.length;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[96px] sm:min-h-[115px] p-1.5 sm:p-2 cursor-pointer transition-colors ${
                    !cell.isCurrentMonth
                      ? "bg-gray-50/70 dark:bg-gray-900/30 text-gray-400"
                      : "bg-white dark:bg-gray-800"
                  } ${
                    isSelected
                      ? "ring-2 ring-inset ring-primary bg-primary/5 dark:bg-primary/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                        cell.isToday
                          ? "bg-primary text-white"
                          : cell.isCurrentMonth
                            ? "text-midnight_text dark:text-gray-200"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-gray-400 hidden sm:inline">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {visibleEvents.map((ev) => {
                      const style =
                        COLOR_STYLES[ev.color || "blue"] || COLOR_STYLES.blue;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateStr);
                            onEventClick?.(ev);
                          }}
                          className={`w-full text-left px-1.5 py-0.5 rounded border text-[11px] leading-tight truncate font-medium ${style}`}
                          title={`${ev.startTime ? `${ev.startTime} ` : ""}${ev.title}`}
                        >
                          {ev.startTime && (
                            <span className="font-bold mr-1">{ev.startTime}</span>
                          )}
                          {ev.title}
                        </button>
                      );
                    })}
                    {extraCount > 0 && (
                      <p className="text-[11px] font-semibold text-primary px-1">
                        +{extraCount} más
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Agenda Panel */}
      <div className="xl:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Agenda del día
          </p>
          <h3 className="text-lg font-bold text-midnight_text dark:text-white capitalize mt-0.5">
            {formatSelectedHeader(selectedDate)}
          </h3>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-dark_grey dark:text-gray-400">
            <Icon
              icon="solar:calendar-minimalistic-linear"
              className="text-4xl text-gray-300 dark:text-gray-600 mb-2"
            />
            <p className="text-sm">{emptyDayText}</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[560px] pr-1">
            {selectedEvents.map((ev) => {
              const style =
                COLOR_STYLES[ev.color || "blue"] || COLOR_STYLES.blue;
              return (
                <div
                  key={ev.id}
                  onClick={() => onEventClick?.(ev)}
                  className={`p-3.5 rounded-xl border transition-shadow ${style} ${
                    onEventClick ? "cursor-pointer hover:shadow-md" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm leading-snug">{ev.title}</h4>
                    {ev.badge && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/20 shrink-0">
                        {ev.badge}
                      </span>
                    )}
                  </div>

                  {(ev.startTime || ev.endTime) && (
                    <p className="text-xs mt-1.5 flex items-center gap-1.5 font-semibold">
                      <Icon icon="solar:clock-circle-linear" className="text-sm" />
                      {ev.startTime}
                      {ev.endTime ? ` - ${ev.endTime}` : ""}
                    </p>
                  )}

                  {ev.location && (
                    <p className="text-xs mt-1 flex items-center gap-1.5 opacity-90">
                      <Icon icon="solar:map-point-linear" className="text-sm shrink-0" />
                      <span>{ev.location}</span>
                    </p>
                  )}

                  {ev.subtitle && (
                    <p className="text-xs mt-1 flex items-center gap-1.5 opacity-90">
                      <Icon icon="solar:user-id-linear" className="text-sm shrink-0" />
                      <span>{ev.subtitle}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
