"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Input } from "@/components/ui";
import type { OpeningHourExceptionRow, OpeningHourRow } from "@/lib/database.types";
import { saveHours } from "@/lib/profile/actions";
import { WEEKDAYS, type FormMode } from "@/lib/profile/constants";
import { newId, ProfileForm } from "./profile-form";

type Interval = { id: string; weekday: number; opens_at: string; closes_at: string };
type Exception = {
  id: string;
  date: string;
  closed: boolean;
  opens_at: string;
  closes_at: string;
  note: string;
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function HoursForm({
  hours,
  exceptions,
  mode,
  readOnly,
}: {
  hours: OpeningHourRow[];
  exceptions: OpeningHourExceptionRow[];
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations("sections.hours");
  const common = useTranslations("common");
  const weekdayName = useTranslations("weekdays");

  const [intervals, setIntervals] = useState<Interval[]>(() =>
    hours.map((h) => ({ id: h.id, weekday: h.weekday, opens_at: hhmm(h.opens_at), closes_at: hhmm(h.closes_at) })),
  );
  const [specialDays, setSpecialDays] = useState<Exception[]>(() =>
    exceptions.map((e) => ({
      id: e.id,
      date: e.date,
      closed: e.closed,
      opens_at: hhmm(e.opens_at),
      closes_at: hhmm(e.closes_at),
      note: e.note,
    })),
  );

  const forDay = (day: number) => intervals.filter((i) => i.weekday === day);
  const updateInterval = (id: string, patch: Partial<Interval>) =>
    setIntervals((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addInterval = (day: number, opens_at = "09:00", closes_at = "17:00") =>
    setIntervals((list) => [...list, { id: newId(), weekday: day, opens_at, closes_at }]);
  const setDayOpen = (day: number, open: boolean) =>
    open ? addInterval(day) : setIntervals((list) => list.filter((i) => i.weekday !== day));
  const copyMondayToWeekdays = () =>
    setIntervals((list) => {
      const monday = list.filter((i) => i.weekday === 1);
      const kept = list.filter((i) => i.weekday === 1 || i.weekday > 5);
      const copies = [2, 3, 4, 5].flatMap((day) =>
        monday.map((m) => ({ ...m, id: newId(), weekday: day })),
      );
      return [...kept, ...copies];
    });

  const updateSpecialDay = (id: string, patch: Partial<Exception>) =>
    setSpecialDays((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const payload = {
    hours: intervals,
    exceptions: specialDays.map((e) => ({
      ...e,
      opens_at: e.closed ? null : e.opens_at || null,
      closes_at: e.closed ? null : e.closes_at || null,
    })),
  };

  return (
    <ProfileForm section="hours" mode={mode} action={saveHours} payload={payload} readOnly={readOnly}>
      <Card className="divide-y divide-stone-100 p-0 sm:p-0">
        {WEEKDAYS.map((day) => {
          const dayIntervals = forDay(day);
          const open = dayIntervals.length > 0;
          return (
            <div key={day} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-6">
              <label className="flex min-h-11 w-40 shrink-0 items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  className="size-5 accent-brand-600"
                  checked={open}
                  onChange={(e) => setDayOpen(day, e.target.checked)}
                />
                {weekdayName(String(day) as "1")}
              </label>
              {open ? (
                <div className="flex-1 space-y-2">
                  {dayIntervals.map((interval, idx) => (
                    <div key={interval.id} className="flex items-center gap-2">
                      <Input
                        type="time"
                        required
                        aria-label={t("from")}
                        className="w-32"
                        value={interval.opens_at}
                        onChange={(e) => updateInterval(interval.id, { opens_at: e.target.value })}
                      />
                      <span className="text-stone-400">–</span>
                      <Input
                        type="time"
                        required
                        aria-label={t("to")}
                        className="w-32"
                        value={interval.closes_at}
                        onChange={(e) => updateInterval(interval.id, { closes_at: e.target.value })}
                      />
                      {idx > 0 ? (
                        <Button
                          variant="ghost"
                          aria-label={common("remove")}
                          onClick={() => setIntervals((list) => list.filter((i) => i.id !== interval.id))}
                        >
                          ✕
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {readOnly ? null : (
                    <button
                      type="button"
                      className="text-sm text-brand-700 hover:underline"
                      onClick={() => addInterval(day, "13:00", "18:00")}
                    >
                      + {t("addInterval")}
                    </button>
                  )}
                </div>
              ) : (
                <p className="flex min-h-11 items-center text-stone-500">{t("closed")}</p>
              )}
            </div>
          );
        })}
      </Card>

      {readOnly ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" onClick={copyMondayToWeekdays} disabled={forDay(1).length === 0}>
            {t("copyToWeekdays")}
          </Button>
          <p className="text-sm text-stone-500">{t("overnightHint")}</p>
        </div>
      )}

      <div className="space-y-3 pt-4">
        <div>
          <h2 className="text-lg font-semibold">{t("exceptionsTitle")}</h2>
          <p className="text-sm text-stone-600">{t("exceptionsIntro")}</p>
        </div>
        {specialDays.map((day) => (
          <Card key={day.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="date"
                required
                aria-label={t("date")}
                className="w-44"
                value={day.date}
                onChange={(e) => updateSpecialDay(day.id, { date: e.target.value })}
              />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={day.closed}
                  onChange={(e) =>
                    updateSpecialDay(day.id, {
                      closed: e.target.checked,
                      opens_at: day.opens_at || "10:00",
                      closes_at: day.closes_at || "14:00",
                    })
                  }
                />
                {t("closedAllDay")}
              </label>
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => setSpecialDays((list) => list.filter((e) => e.id !== day.id))}
              >
                {common("remove")}
              </Button>
            </div>
            {day.closed ? null : (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  required
                  aria-label={t("from")}
                  className="w-32"
                  value={day.opens_at}
                  onChange={(e) => updateSpecialDay(day.id, { opens_at: e.target.value })}
                />
                <span className="text-stone-400">–</span>
                <Input
                  type="time"
                  required
                  aria-label={t("to")}
                  className="w-32"
                  value={day.closes_at}
                  onChange={(e) => updateSpecialDay(day.id, { closes_at: e.target.value })}
                />
              </div>
            )}
            <Input
              aria-label={t("note")}
              maxLength={200}
              placeholder={t("notePlaceholder")}
              value={day.note}
              onChange={(e) => updateSpecialDay(day.id, { note: e.target.value })}
            />
          </Card>
        ))}
        {readOnly ? null : (
          <Button
            variant="secondary"
            onClick={() =>
              setSpecialDays((list) => [
                ...list,
                { id: newId(), date: "", closed: true, opens_at: "", closes_at: "", note: "" },
              ])
            }
          >
            + {t("addException")}
          </Button>
        )}
      </div>
    </ProfileForm>
  );
}
