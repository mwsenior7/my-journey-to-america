"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
];

type FormState = {
  name: string;
  country: string;
  year_arrived: string;
  us_state: string;
  profession: string;
  story_text: string;
  video_url: string;
  tags: string;
};

const EMPTY: FormState = {
  name: "",
  country: "",
  year_arrived: "",
  us_state: "",
  profession: "",
  story_text: "",
  video_url: "",
  tags: "",
};

const INPUT =
  "border border-navy/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold w-full bg-white";

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-navy" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-navy/40">{hint}</p>}
    </div>
  );
}

export default function SharePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Audio state
  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function set(
    field: keyof FormState
  ) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecState("recording");
    } catch {
      setErrorMsg("Microphone access was denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecState("stopped");
  }

  function clearAudio() {
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setAudioFile(null);
    setRecState("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    let audio_url: string | null = null;
    const mediaToUpload: Blob | File | null = audioBlob ?? audioFile;

    if (mediaToUpload) {
      const isRecorded = !!audioBlob;
      const ext = isRecorded
        ? "webm"
        : (audioFile!.name.split(".").pop() ?? "audio");
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const contentType = isRecorded
        ? "audio/webm"
        : audioFile!.type || "audio/mpeg";

      const { data: upload, error: uploadErr } = await supabase.storage
        .from("story-audio")
        .upload(path, mediaToUpload, { contentType });

      if (uploadErr) {
        console.error("Audio upload error:", uploadErr);
      } else {
        const { data: urlData } = supabase.storage
          .from("story-audio")
          .getPublicUrl(upload.path);
        audio_url = urlData.publicUrl;
      }
    }

    const tags = form.tags.trim()
      ? form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const { error } = await supabase.from("stories").insert({
      name: form.name,
      country: form.country,
      year_arrived: form.year_arrived ? parseInt(form.year_arrived, 10) : null,
      us_state: form.us_state || null,
      profession: form.profession || null,
      story_text: form.story_text,
      video_url: form.video_url || null,
      audio_url,
      tags: tags.length > 0 ? tags : null,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      setErrorMsg("Something went wrong submitting your story. Please try again.");
      setStatus("error");
    } else {
      setStatus("success");
      setForm(EMPTY);
      clearAudio();
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
        className="flex flex-col gap-8 bg-white rounded-2xl border border-navy/10 shadow-sm p-8"
      >
        {/* ── Personal details ── */}
        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Full Name" htmlFor="name" required>
              <input
                id="name"
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={set("name")}
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
            <Field label="Country of Origin" htmlFor="country" required>
              <input
                id="country"
                type="text"
                placeholder="Where did you come from?"
                value={form.country}
                onChange={set("country")}
                required
                className={INPUT}
              />
            </Field>

            <Field label="US State You Settled In" htmlFor="us_state">
              <select
                id="us_state"
                value={form.us_state}
                onChange={set("us_state")}
                className={INPUT}
              >
                <option value="">Select a state…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Year of Arrival" htmlFor="year_arrived">
            <input
              id="year_arrived"
              type="number"
              placeholder="e.g. 2015"
              min={1900}
              max={new Date().getFullYear()}
              value={form.year_arrived}
              onChange={set("year_arrived")}
              className={INPUT}
            />
          </Field>
        </div>

        {/* ── Story text ── */}
        <Field label="Your Story" htmlFor="story_text" required>
          <textarea
            id="story_text"
            rows={9}
            placeholder="Tell us about your journey — why you came, what it was like to arrive, and how your life has changed…"
            value={form.story_text}
            onChange={set("story_text")}
            required
            className={`${INPUT} resize-none`}
          />
        </Field>

        {/* ── Audio ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">
              Audio{" "}
              <span className="font-normal text-navy/40">(optional)</span>
            </span>
            <div className="flex bg-navy/5 rounded-lg p-1 gap-0.5">
              {(["record", "upload"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAudioMode(mode);
                    clearAudio();
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    audioMode === mode
                      ? "bg-white shadow-sm text-navy"
                      : "text-navy/50 hover:text-navy"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-navy/10 rounded-xl p-4 bg-navy/[0.02]">
            {audioMode === "record" && (
              <div className="flex flex-col gap-3">
                {recState === "idle" && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 self-start bg-navy text-cream text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-navy/90 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    Start Recording
                  </button>
                )}

                {recState === "recording" && (
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm text-navy/70">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
                      Recording…
                    </span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {recState === "stopped" && audioBlobUrl && (
                  <div className="flex flex-col gap-3">
                    <audio controls src={audioBlobUrl} className="w-full h-10" />
                    <button
                      type="button"
                      onClick={clearAudio}
                      className="self-start text-xs text-navy/50 hover:text-navy transition-colors underline underline-offset-2"
                    >
                      Re-record
                    </button>
                  </div>
                )}
              </div>
            )}

            {audioMode === "upload" && (
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="audio_file"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-navy/15 rounded-lg px-6 py-5 cursor-pointer hover:border-navy/30 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-navy/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <span className="text-sm text-navy/50">
                    {audioFile ? audioFile.name : "Click to choose an audio file"}
                  </span>
                  <span className="text-xs text-navy/30">MP3, M4A, WAV, OGG, WebM</span>
                </label>
                <input
                  id="audio_file"
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFile(file);
                  }}
                />
                {audioFile && (
                  <button
                    type="button"
                    onClick={clearAudio}
                    className="self-start text-xs text-navy/50 hover:text-navy transition-colors underline underline-offset-2"
                  >
                    Remove file
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Video URL ── */}
        <Field
          label="Video URL"
          htmlFor="video_url"
          hint="Paste a YouTube, Vimeo, or other video link (optional)"
        >
          <input
            id="video_url"
            type="url"
            placeholder="https://youtube.com/watch?v=…"
            value={form.video_url}
            onChange={set("video_url")}
            className={INPUT}
          />
        </Field>

        {/* ── Tags ── */}
        <Field
          label="Tags"
          htmlFor="tags"
          hint="Comma-separated — e.g. family, career change, 1990s"
        >
          <input
            id="tags"
            type="text"
            placeholder="family, engineer, New York…"
            value={form.tags}
            onChange={set("tags")}
            className={INPUT}
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
