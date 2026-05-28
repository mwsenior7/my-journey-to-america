"use client";

import { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";

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
  original_language: string;
};

const ACCEPTED_VIDEO = ".mp4,.mov,.avi,.webm,video/mp4,video/quicktime,video/x-msvideo,video/webm";

const EMPTY: FormState = {
  name: "",
  country: "",
  year_arrived: "",
  us_state: "",
  profession: "",
  story_text: "",
  video_url: "",
  tags: "",
  original_language: "en",
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

// ── AI Interview Component ─────────────────────────────────────────────────────

type Message = { role: "user" | "assistant"; content: string };

const TOTAL_QUESTIONS = 8;

function AIInterview({ onUseStory, language }: { onUseStory: (story: string) => void; language: string }) {
  const OPENING_MESSAGE = "Welcome — I'm so glad you're here to share your story! These stories matter so much. Let's start at the very beginning: where were you born, and what was life like there growing up?";

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"interview" | "generating" | "done">("interview");
  const [draftStory, setDraftStory] = useState("");
  const [editedStory, setEditedStory] = useState("");
  const [interviewComplete, setInterviewComplete] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function fetchText(res: Response): Promise<string> {
    if (!res.ok) {
      let message = "Sorry, something went wrong. Please try refreshing the page.";
      try {
        const data = await res.json();
        if (data.error) message = data.error;
      } catch {
        // ignore parse failure
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data.text ?? "";
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, phase: "interview", language }),
      });

      const finalText = await fetchText(res);

      const updatedMessages: Message[] = [
        ...newMessages,
        { role: "assistant", content: finalText },
      ];
      setMessages(updatedMessages);

      const answeredCount = newMessages.filter(m => m.role === "user").length;
      if (
        finalText.includes("I have everything I need to write your story") ||
        answeredCount >= TOTAL_QUESTIONS
      ) {
        setInterviewComplete(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages([...newMessages, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  async function generateStory() {
    setPhase("generating");
    setDraftStory("");

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, phase: "generate", language }),
    });

    const finalStory = await fetchText(res);
    setDraftStory(finalStory);
    setEditedStory(finalStory);
    setPhase("done");
  }

  const userMessageCount = messages.filter(m => m.role === "user").length;
  const progress = Math.min(userMessageCount, TOTAL_QUESTIONS);
  const progressPct = Math.round((progress / TOTAL_QUESTIONS) * 100);

  // ── Story draft view ──────────────────────────────────────────────────────
  if (phase === "generating" || phase === "done") {
    const wordCount = editedStory.trim().split(/\s+/).filter(Boolean).length;
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/40 to-gold/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy">Your Story is Ready!</p>
            <p className="text-sm text-navy/50">
              {phase === "generating"
                ? "Writing your story now — this takes just a moment…"
                : `${wordCount} words · Feel free to edit anything before submitting`}
            </p>
          </div>
          {phase === "generating" && (
            <span className="flex gap-1 flex-shrink-0">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            value={phase === "generating" ? draftStory : editedStory}
            onChange={e => setEditedStory(e.target.value)}
            readOnly={phase === "generating"}
            rows={16}
            className={`${INPUT} resize-none leading-relaxed font-serif text-[15px]`}
            placeholder="Your story is being written…"
          />
          {phase === "generating" && (
            <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white/30" />
          )}
        </div>

        {phase === "done" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onUseStory(editedStory)}
              className="w-full bg-navy text-cream font-bold py-4 rounded-full hover:bg-navy/90 transition-colors flex items-center justify-center gap-2 text-base shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Use This Story — Fill In My Details
            </button>
            <p className="text-xs text-center text-navy/40">
              You&rsquo;ll still be able to edit everything before submitting
            </p>
            <button
              onClick={() => { setPhase("interview"); setDraftStory(""); setEditedStory(""); setMessages([{ role: "assistant", content: OPENING_MESSAGE }]); setInterviewComplete(false); }}
              className="text-sm text-navy/40 hover:text-navy/60 transition-colors underline underline-offset-2 text-center"
            >
              Start over with new answers
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Interview chat view ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      {userMessageCount > 0 && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-1.5 bg-navy/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(to right, rgba(201,168,76,0.5), #C9A84C)",
              }}
            />
          </div>
          <span className="text-xs text-navy/40 flex-shrink-0 tabular-nums">
            {progress}/{TOTAL_QUESTIONS} questions
          </span>
        </div>
      )}

      {/* Chat messages */}
      <div ref={chatContainerRef} className="flex flex-col gap-4 max-h-[440px] overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "bg-white border border-navy/8 text-navy/80 rounded-tl-sm shadow-sm"
                  : "bg-navy text-cream rounded-tr-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="bg-white border border-navy/8 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-navy/25 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={2}
          placeholder={loading ? "Waiting for response…" : "Share your answer… (Enter to send, Shift+Enter for new line)"}
          className={`${INPUT} resize-none flex-1`}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-navy text-cream p-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-40 flex-shrink-0"
          aria-label="Send"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Write My Story button — only appears after all questions are answered */}
      {interviewComplete && (
        <button
          onClick={generateStory}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold/90 to-gold text-navy font-bold py-4 rounded-full hover:opacity-90 transition-opacity shadow-md text-base"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Write My Story
        </button>
      )}

      {!interviewComplete && userMessageCount > 0 && userMessageCount < TOTAL_QUESTIONS && (
        <p className="text-xs text-center text-navy/35">
          {TOTAL_QUESTIONS - userMessageCount} question{TOTAL_QUESTIONS - userMessageCount !== 1 ? "s" : ""} to go — you&rsquo;re doing great!
        </p>
      )}
    </div>
  );
}

// ── Main Share Page ────────────────────────────────────────────────────────────

export default function SharePage() {
  const [mode, setMode] = useState<"form" | "interview">("interview");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [honeypot, setHoneypot] = useState("");

  // Audio state
  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Video state
  const [videoMode, setVideoMode] = useState<"url" | "upload">("url");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set default language from browser
  useEffect(() => {
    const browserLang = navigator.language.split("-")[0];
    const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
    if (supported) {
      setForm(prev => ({ ...prev, original_language: supported.code }));
    }
  }, []);

  function set(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleUseStory(story: string) {
    setForm(prev => ({ ...prev, story_text: story }));
    setMode("form");
    // Scroll to form
    setTimeout(() => {
      document.getElementById("story_text")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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

  function clearVideo() {
    setVideoFile(null);
    setVideoProgress(0);
    setVideoUploading(false);
    if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) { setStatus("success"); return; }
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

    let video_url: string | null = form.video_url || null;
    if (videoMode === "upload" && videoFile) {
      setVideoUploading(true);
      setVideoProgress(0);
      videoProgressTimerRef.current = setInterval(() => {
        setVideoProgress((p) => (p < 90 ? +(p + Math.random() * 8).toFixed(1) : 90));
      }, 300);

      const ext = videoFile.name.split(".").pop() ?? "mp4";
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: vidUpload, error: vidErr } = await supabase.storage
        .from("story-videos")
        .upload(path, videoFile, { contentType: videoFile.type });

      if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);

      if (vidErr) {
        console.error("Video upload error:", vidErr);
      } else {
        setVideoProgress(100);
        const { data: vidUrl } = supabase.storage
          .from("story-videos")
          .getPublicUrl(vidUpload.path);
        video_url = vidUrl.publicUrl;
      }
      await new Promise((r) => setTimeout(r, 400));
      setVideoUploading(false);
    }

    const tags = form.tags.trim()
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const res = await fetch("/api/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        country: form.country,
        year_arrived: form.year_arrived ? parseInt(form.year_arrived, 10) : null,
        us_state: form.us_state || null,
        profession: form.profession || null,
        story_text: form.story_text,
        video_url,
        audio_url,
        tags: tags.length > 0 ? tags : null,
        original_language: form.original_language || "en",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("Story submit error:", body);
      setErrorMsg("Something went wrong submitting your story. Please try again.");
      setStatus("error");
    } else {
      const { id } = await res.json();
      if (id) {
        fetch("/api/translate-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: id }),
        }).catch(() => {/* non-critical */});
      }
      setStatus("success");
      setForm(EMPTY);
      clearAudio();
      clearVideo();
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
      <p className="text-navy/60 mb-2 text-lg">
        Your journey matters. Help us preserve it for future generations.
      </p>
      <p className="text-navy/50 mb-8 text-sm">
        Not sure how to start? Let our AI guide you — just answer a few simple questions and we&rsquo;ll write a beautiful story for you.
      </p>

      {/* Mode toggle */}
      <div className="flex bg-navy/5 rounded-xl p-1 gap-1 mb-8">
        <button
          type="button"
          onClick={() => setMode("interview")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            mode === "interview"
              ? "bg-white shadow-sm text-navy"
              : "text-navy/50 hover:text-navy"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Writes It For Me
          {mode === "interview" && (
            <span className="bg-gold/20 text-gold text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Recommended</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            mode === "form"
              ? "bg-white shadow-sm text-navy"
              : "text-navy/50 hover:text-navy"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          I&rsquo;ll Write It Myself
        </button>
      </div>

      {/* Story Language selector */}
      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-sm font-semibold text-navy" htmlFor="story_language">
          Story Language
        </label>
        <select
          id="story_language"
          value={form.original_language}
          onChange={set("original_language")}
          className={INPUT}
        >
          {SUPPORTED_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>
              {l.name} — {l.nativeName}
            </option>
          ))}
        </select>
        <p className="text-xs text-navy/40">
          {mode === "interview"
            ? "The AI assistant will interview you in this language"
            : "Select the language your story is written in"}
        </p>
      </div>

      {/* AI Interview panel */}
      {mode === "interview" && (
        <div className="bg-white rounded-2xl border border-navy/10 shadow-sm p-6 mb-8">
          <div className="flex items-start gap-3 mb-5 pb-5 border-b border-navy/8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/40 to-gold/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-navy">Your Personal Story Assistant</p>
              <p className="text-sm text-navy/55 mt-0.5 leading-relaxed">
                Don&rsquo;t worry about being a writer — just answer 8 simple questions like you&rsquo;re talking to a friend. We&rsquo;ll turn your words into a beautiful, publication-quality story that you can edit before sharing.
              </p>
            </div>
          </div>
          <AIInterview onUseStory={handleUseStory} language={form.original_language} />
        </div>
      )}

      {/* Submission form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-8 bg-white rounded-2xl border border-navy/10 shadow-sm p-8"
      >
        {/* Honeypot — invisible to users, catches bots */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
          <label htmlFor="hp_website">Website</label>
          <input
            id="hp_website"
            name="website"
            type="text"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {mode === "interview" && form.story_text && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-lg">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            AI-generated story loaded. Fill in your details below to submit.
          </div>
        )}

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
                  <option key={s} value={s}>{s}</option>
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
        <div className="flex flex-col gap-4">
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

        </div>

        {/* ── Audio ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">
              Audio <span className="font-normal text-navy/40">(optional)</span>
            </span>
            <div className="flex bg-navy/5 rounded-lg p-1 gap-0.5">
              {(["record", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setAudioMode(m); clearAudio(); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    audioMode === m ? "bg-white shadow-sm text-navy" : "text-navy/50 hover:text-navy"
                  }`}
                >
                  {m}
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
                  <svg className="w-6 h-6 text-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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

        {/* ── Video ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">
              Video <span className="font-normal text-navy/40">(optional)</span>
            </span>
            <div className="flex bg-navy/5 rounded-lg p-1 gap-0.5">
              {(["url", "upload"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setVideoMode(m); clearVideo(); setForm(prev => ({ ...prev, video_url: "" })); }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    videoMode === m ? "bg-white shadow-sm text-navy" : "text-navy/50 hover:text-navy"
                  }`}
                >
                  {m === "url" ? "URL" : "Upload File"}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-navy/10 rounded-xl p-4 bg-navy/[0.02]">
            {videoMode === "url" && (
              <div className="flex flex-col gap-1.5">
                <input
                  id="video_url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=…"
                  value={form.video_url}
                  onChange={set("video_url")}
                  className={INPUT}
                />
                <p className="text-xs text-navy/40">Paste a YouTube or Vimeo link</p>
              </div>
            )}

            {videoMode === "upload" && (
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="video_file"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-navy/15 rounded-lg px-6 py-5 cursor-pointer hover:border-navy/30 transition-colors"
                >
                  <svg className="w-6 h-6 text-navy/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  <span className="text-sm text-navy/50">
                    {videoFile ? videoFile.name : "Click to choose a video file"}
                  </span>
                  <span className="text-xs text-navy/30">MP4, MOV, AVI, WebM</span>
                </label>
                <input
                  id="video_file"
                  type="file"
                  accept={ACCEPTED_VIDEO}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideoFile(file);
                  }}
                />

                {videoFile && !videoUploading && videoProgress === 0 && (
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="self-start text-xs text-navy/50 hover:text-navy transition-colors underline underline-offset-2"
                  >
                    Remove file
                  </button>
                )}

                {(videoUploading || videoProgress > 0) && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-navy/50">
                      <span>{videoProgress < 100 ? "Uploading…" : "Upload complete"}</span>
                      <span>{Math.round(videoProgress)}%</span>
                    </div>
                    <div className="w-full bg-navy/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gold transition-all duration-300"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Tags ── */}
        <Field label="Tags" htmlFor="tags" hint="Comma-separated — e.g. family, career change, 1990s">
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
