"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type FormState = {
  title: string;
  author_name: string;
  profession: string;
  country_of_origin: string;
  us_state: string;
  year_of_arrival: string;
  story_text: string;
};

const EMPTY: FormState = {
  title: "",
  author_name: "",
  profession: "",
  country_of_origin: "",
  us_state: "",
  year_of_arrival: "",
  story_text: "",
};

const INPUT =
  "border border-navy/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold w-full bg-white";

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-navy" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function SharePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.from("stories").insert({
      title: form.title,
      author_name: form.author_name,
      country_of_origin: form.country_of_origin,
      us_state: form.us_state || null,
      year_of_arrival: form.year_of_arrival ? parseInt(form.year_of_arrival, 10) : null,
      profession: form.profession || null,
      story_text: form.story_text,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      setErrorMsg("Something went wrong submitting your story. Please try again.");
      setStatus("error");
    } else {
      setStatus("success");
      setForm(EMPTY);
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">✈️</div>
        <h1 className="text-4xl font-bold text-navy mb-4">Thank You!</h1>
        <p className="text-navy/60 text-lg mb-10 leading-relaxed">
          Your story has been submitted and will appear in Browse Stories
          shortly. Thank you for sharing your journey.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="bg-navy text-cream font-semibold px-8 py-3 rounded-full hover:bg-navy/90 transition-colors"
        >
          Share Another Story
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-navy mb-2">Share Your Story</h1>
      <p className="text-navy/60 mb-10 text-lg">
        Your journey matters. Help us preserve it for future generations.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 bg-white rounded-2xl border border-navy/10 shadow-sm p-8"
      >
        <Field label="Story Title" htmlFor="title" required>
          <input
            id="title"
            type="text"
            placeholder="e.g. A New Beginning in New York"
            value={form.title}
            onChange={set("title")}
            required
            className={INPUT}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Your Name" htmlFor="name" required>
            <input
              id="name"
              type="text"
              placeholder="Your full name"
              value={form.author_name}
              onChange={set("author_name")}
              required
              className={INPUT}
            />
          </Field>

          <Field label="Profession" htmlFor="profession">
            <input
              id="profession"
              type="text"
              placeholder="e.g. Engineer, Teacher…"
              value={form.profession}
              onChange={set("profession")}
              className={INPUT}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Country of Origin" htmlFor="origin" required>
            <input
              id="origin"
              type="text"
              placeholder="Where did you come from?"
              value={form.country_of_origin}
              onChange={set("country_of_origin")}
              required
              className={INPUT}
            />
          </Field>

          <Field label="US State You Settled In" htmlFor="state">
            <input
              id="state"
              type="text"
              placeholder="e.g. New York, California…"
              value={form.us_state}
              onChange={set("us_state")}
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Year of Arrival" htmlFor="year">
          <input
            id="year"
            type="number"
            placeholder="e.g. 2015"
            min={1900}
            max={new Date().getFullYear()}
            value={form.year_of_arrival}
            onChange={set("year_of_arrival")}
            className={INPUT}
          />
        </Field>

        <Field label="Your Story" htmlFor="story" required>
          <textarea
            id="story"
            rows={8}
            placeholder="Tell us about your journey — why you came, what it was like to arrive, and how your life has changed…"
            value={form.story_text}
            onChange={set("story_text")}
            required
            className={`${INPUT} resize-none`}
          />
        </Field>

        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-navy text-cream font-semibold py-3 rounded-full hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Submitting…" : "Submit Your Story"}
        </button>
      </form>
    </div>
  );
}
