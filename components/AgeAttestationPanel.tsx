"use client";

import { useState, useMemo } from "react";
import { INPUT } from "@/lib/form-styles";
import type { UIStrings } from "@/lib/ui-strings";

export function AgeAttestationPanel({
  ui,
  onAttested,
}: {
  ui: UIStrings;
  onAttested: (ageBand: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const years = useMemo(() => Array.from({ length: 120 }, (_, i) => currentYear - i), [currentYear]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!month || !day || !year) {
      setError(ui.ageGateError);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/attest-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: Number(month), day: Number(day), year: Number(year) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? ui.ageGateError);
        return;
      }
      if (data.blocked) {
        setBlocked(true);
        return;
      }
      onAttested(data.ageBand as string);
    } catch {
      setError(ui.ageGateError);
    } finally {
      setSubmitting(false);
    }
  }

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-navy/10 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">💛</div>
          <h1 className="text-2xl font-bold text-navy mb-3">{ui.ageGateBlockedTitle}</h1>
          <p className="text-navy/60 leading-relaxed">{ui.ageGateBlockedBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-navy/10 shadow-sm p-8 flex flex-col gap-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-navy mb-2">{ui.ageGateTitle}</h1>
          <p className="text-navy/60 leading-relaxed">{ui.ageGateBody}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy" htmlFor="dob_month">
              {ui.ageGateMonth}
            </label>
            <select id="dob_month" value={month} onChange={e => setMonth(e.target.value)} className={INPUT}>
              <option value="" disabled>{ui.ageGateMonth}</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy" htmlFor="dob_day">
              {ui.ageGateDay}
            </label>
            <select id="dob_day" value={day} onChange={e => setDay(e.target.value)} className={INPUT}>
              <option value="" disabled>{ui.ageGateDay}</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy" htmlFor="dob_year">
              {ui.ageGateYear}
            </label>
            <select id="dob_year" value={year} onChange={e => setYear(e.target.value)} className={INPUT}>
              <option value="" disabled>{ui.ageGateYear}</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <p className="text-xs text-navy/40">{ui.ageGateConfirm}</p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy text-cream font-bold py-4 rounded-full hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {submitting ? ui.ageGateSubmitting : ui.ageGateContinue}
        </button>
      </form>
    </div>
  );
}
