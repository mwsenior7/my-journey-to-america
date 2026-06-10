"use client"
export const dynamic = "force-dynamic"

import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { US_STATES } from "@/lib/us-states";

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

const DRAFT_KEY = "mjtoa_share_draft";

const OPENING_MESSAGE =
  "Welcome — I'm so glad you're here to share your story! These stories matter so much. Let's start at the very beginning: where were you born, and what was life like there growing up?";

type Message = { role: "user" | "assistant"; content: string };

type AIInterviewState = {
  messages: Message[];
  phase: "interview" | "generating" | "done";
  editedStory: string;
  interviewComplete: boolean;
};

type SavedDraft = AIInterviewState & {
  form: FormState;
  mode: "form" | "interview";
  savedAt: number;
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

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

const TOTAL_QUESTIONS = 8;

const LANG_TO_BCP47: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-BR",
  de: "de-DE",
  it: "it-IT",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  ar: "ar-SA",
  hi: "hi-IN",
  ru: "ru-RU",
  uk: "uk-UA",
  el: "el-GR",
  vi: "vi-VN",
  tl: "fil-PH",
};

function AIInterview({
  onUseStory,
  language,
  highlightUseStory,
  initialState,
  onSave,
  onAudioBlobsChange,
}: {
  onUseStory: (story: string) => void;
  language: string;
  highlightUseStory?: boolean;
  initialState?: AIInterviewState | null;
  onSave?: (state: AIInterviewState) => void;
  onAudioBlobsChange?: (blobs: Blob[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(
    initialState?.messages ?? [{ role: "assistant", content: OPENING_MESSAGE }]
  );

  // If there's no initial state and a non-English language is selected,
  // request a translated opening message from the server so the assistant
  // greets users in the chosen language rather than always showing the
  // English `OPENING_MESSAGE` defined above.
  useEffect(() => {
    async function ensureOpeningInLang() {
      if (initialState?.messages) return;
      if (!language || language === "en") {
        setMessages([{ role: "assistant", content: OPENING_MESSAGE }]);
        return;
      }
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: OPENING_MESSAGE, source: "en", target: language }),
        });
        const data = await res.json();
        if (res.ok && data.translated) {
          setMessages([{ role: "assistant", content: data.translated }]);
        }
      } catch {
        // fallback to English opening message on any failure
      }
    }
    ensureOpeningInLang();
  }, [language, initialState]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"interview" | "generating" | "done">(
    initialState?.phase ?? "interview"
  );
  const [draftStory, setDraftStory] = useState("");
  const [editedStory, setEditedStory] = useState(initialState?.editedStory ?? "");
  const [interviewComplete, setInterviewComplete] = useState(
    initialState?.interviewComplete ?? false
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [debugVoices, setDebugVoices] = useState<SpeechSynthesisVoice[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenIndexRef = useRef(-1);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const prevLangRef = useRef(language);
  const [interviewRecState, setInterviewRecState] = useState<"idle" | "recording">("idle");
  const [srNotAvailable, setSrNotAvailable] = useState(false);
  const interviewRecorderRef = useRef<MediaRecorder | null>(null);
  const interviewChunksRef = useRef<Blob[]>([]);
  const interviewAudioBlobsRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    function load() {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        voicesRef.current = v;
        setDebugVoices(v);
        console.log("Available voices:", v.map(x => x.lang + " " + x.name));
      }
    }
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (phase === "done" && editedStory) {
      onSave?.({ messages, phase, editedStory, interviewComplete });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedStory]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const bcp47 = LANG_TO_BCP47[language] ?? "en-US";

    function doSpeak(voices: SpeechSynthesisVoice[]) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcp47; // always set regardless of voice found
      // 1. exact lang match (e.g. v.lang === "fr-FR")
      let match = voices.find(v => v.lang === bcp47);
      // 2. any voice whose lang starts with the 2-letter code (e.g. "fr-CA")
      if (!match) match = voices.find(v => v.lang.startsWith(language));
      // 3. voice whose name contains the BCP-47 code (e.g. "Google français (fr-FR)")
      if (!match) match = voices.find(v => v.name.includes(bcp47));
      if (match) utterance.voice = match;
      window.speechSynthesis.speak(utterance);
    }

    if (voicesRef.current.length > 0) {
      doSpeak(voicesRef.current);
    } else {
      // Voices haven't loaded yet — wait for onvoiceschanged then speak
      window.speechSynthesis.onvoiceschanged = () => {
        const v = window.speechSynthesis.getVoices();
        voicesRef.current = v;
        console.log("[TTS] voices (deferred):", v.map(x => `${x.name} (${x.lang})`).join(", "));
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak(v);
      };
    }
  }, [language]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    const lastIndex = messages.length - 1;
    if (lastIndex <= lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    speak(lastMsg.content);
  }, [messages, speak]);

  // Re-speak the current assistant message when language changes, and reset
  // the index guard so the incoming translated opening can also auto-speak.
  useEffect(() => {
    if (prevLangRef.current === language) return;
    prevLangRef.current = language;
    lastSpokenIndexRef.current = -1;
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) speak(lastAssistant.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, speak]);

  useEffect(() => {
    return () => {
      interviewRecorderRef.current?.stop();
      recognitionRef.current?.stop();
    };
  }, []);

  async function startInterviewRecording() {
    console.log("mic button clicked");

    if (typeof window === "undefined") {
      console.log("[SR] skipping — window not defined (SSR context)");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    console.log("[SR] SpeechRecognition available:", !!SR, "| webkitSpeechRecognition:", !!w.webkitSpeechRecognition);

    if (!SR) {
      setSrNotAvailable(true);
      return;
    }
    setSrNotAvailable(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      interviewChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) interviewChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(interviewChunksRef.current, { type: mimeType });
        interviewAudioBlobsRef.current = [...interviewAudioBlobsRef.current, blob];
        onAudioBlobsChange?.(interviewAudioBlobsRef.current);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(250);
      interviewRecorderRef.current = mr;

      // Initialise SpeechRecognition entirely inside the click handler so it
      // is never constructed outside a user-gesture context.
      const recognition = new SR();
      recognition.lang = LANG_TO_BCP47[language] ?? "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => console.log("[SR] started, lang:", recognition.lang);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => console.log("[SR] error:", e.error, e.message);
      recognition.onend = () => {
        console.log("[SR] ended, recorder state:", interviewRecorderRef.current?.state);
        // Chrome stops recognition after silence — restart while still recording
        if (typeof window !== "undefined" && interviewRecorderRef.current?.state === "recording") {
          try { recognition.start(); } catch { /* ignore duplicate-start error */ }
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        console.log("[SR] transcript:", transcript);
        setInput(transcript);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setInterviewRecState("recording");
    } catch (err) {
      console.log("[SR] getUserMedia error:", err);
    }
  }

  function stopInterviewRecording() {
    interviewRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterviewRecState("idle");
  }

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

    if (interviewRecState === "recording") stopInterviewRecording();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();

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
      const nowComplete =
        finalText.includes("I have everything I need to write your story") ||
        answeredCount >= TOTAL_QUESTIONS;
      if (nowComplete) {
        setInterviewComplete(true);
      }

      onSave?.({
        messages: updatedMessages,
        phase: "interview",
        editedStory,
        interviewComplete: nowComplete || interviewComplete,
      });
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

    onSave?.({ messages, phase: "done", editedStory: finalStory, interviewComplete: true });
  }

  function startEdit(index: number, content: string) {
    setEditingIndex(index);
    setEditingText(content);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const updated = messages.map((m, i) =>
      i === editingIndex ? { ...m, content: editingText.trim() || m.content } : m
    );
    setMessages([
      ...updated,
      { role: "assistant", content: "Got it — I've noted your updated answer and will use it when writing your story." },
    ]);
    setEditingIndex(null);
    setEditingText("");
  }

  function startOver() {
    const freshMessages: Message[] = [{ role: "assistant", content: OPENING_MESSAGE }];
    setMessages(freshMessages);
    setInput("");
    setInterviewComplete(false);
    setPhase("interview");
    setDraftStory("");
    setEditedStory("");
    setEditingIndex(null);
    setEditingText("");
    interviewAudioBlobsRef.current = [];
    onAudioBlobsChange?.([]);
    onSave?.({ messages: freshMessages, phase: "interview", editedStory: "", interviewComplete: false });
  }

  const userMessageCount = messages.filter(m => m.role === "user").length;
  const progress = Math.min(userMessageCount, TOTAL_QUESTIONS);
  const progressPct = Math.round((progress / TOTAL_QUESTIONS) * 100);

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
              id="use-this-story-btn"
              onClick={() => onUseStory(editedStory)}
              className={`w-full bg-navy text-cream font-bold py-4 rounded-full hover:bg-navy/90 transition-colors flex items-center justify-center gap-2 text-base shadow-sm${highlightUseStory ? " ring-2 ring-gold ring-offset-2 shadow-[0_0_14px_rgba(201,168,76,0.55)]" : ""}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Use This Story — Fill In My Details
            </button>
            {highlightUseStory && (
              <p className="text-sm text-center text-gold font-semibold">
                👆 Click here first to add your story to the form
              </p>
            )}
            <p className="text-xs text-center text-navy/40">
              You&rsquo;ll still be able to edit everything before submitting
            </p>
            <button
              onClick={startOver}
              className="text-sm text-navy/40 hover:text-navy/60 transition-colors underline underline-offset-2 text-center"
            >
              Start over with new answers
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 py-1 flex-shrink-0">
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
        {userMessageCount > 0 && (
          <button
            type="button"
            onClick={startOver}
            className="text-xs text-navy/35 hover:text-navy/60 transition-colors underline underline-offset-2 flex-shrink-0"
          >
            Start Over
          </button>
        )}
      </div>

      <div ref={chatContainerRef} className="flex flex-col gap-4 overflow-y-auto pr-1" style={{ maxHeight: "320px" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {msg.role === "user" && editingIndex === i ? (
              <div className="flex flex-col gap-2 max-w-[82%]">
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  rows={3}
                  className={`${INPUT} resize-none text-sm`}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs px-3 py-1.5 rounded-lg border border-navy/20 text-navy/60 hover:text-navy/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="text-xs px-3 py-1.5 rounded-lg bg-navy text-cream hover:bg-navy/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : msg.role === "user" ? (
              <div className="flex flex-col items-end gap-1 max-w-[82%]">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-navy text-cream rounded-tr-sm">
                  {msg.content}
                </div>
                {!loading && editingIndex === null && (
                  <button
                    type="button"
                    onClick={() => startEdit(i, msg.content)}
                    className="flex items-center gap-1 text-xs text-navy/35 hover:text-navy/60 transition-colors px-1"
                    aria-label="Edit this answer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            ) : (
              <div className="max-w-[82%] flex flex-col gap-1">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-white border border-navy/8 text-navy/80 rounded-tl-sm shadow-sm">
                  {msg.content}
                </div>
                <button
                  type="button"
                  onClick={() => speak(msg.content)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/40 bg-gold/8 hover:bg-gold/15 transition-colors px-2.5 py-1 rounded-full self-start"
                  aria-label="Read aloud"
                >
                  🔊 Replay
                </button>
              </div>
            )}
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

      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {srNotAvailable && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            Speech recognition not available in this browser — please type your answer
          </p>
        )}
        {interviewRecState === "recording" && (
          <div className="flex items-center gap-2 text-xs text-red-500 font-semibold px-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            Recording… speak your answer
          </div>
        )}
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
            placeholder={
              interviewRecState === "recording"
                ? "Listening… speak your answer"
                : loading
                ? "Waiting for response…"
                : "Share your answer… (Enter to send, Shift+Enter for new line)"
            }
            className={`${INPUT} resize-none flex-1${interviewRecState === "recording" ? " border-red-300 focus:ring-red-300" : ""}`}
          />
          {interviewRecState === "idle" ? (
            <button
              type="button"
              onClick={startInterviewRecording}
              disabled={loading}
              className="bg-navy/10 text-navy p-3 rounded-xl hover:bg-navy/20 transition-colors disabled:opacity-40 flex-shrink-0 text-base leading-none"
              aria-label="Record answer"
              title="Record your answer"
            >
              🎤
            </button>
          ) : (
            <button
              type="button"
              onClick={stopInterviewRecording}
              className="bg-red-500 text-white p-3 rounded-xl hover:bg-red-600 transition-colors flex-shrink-0 text-base leading-none"
              aria-label="Stop recording"
              title="Stop recording"
            >
              ⏹
            </button>
          )}
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
      </div>

      <div className="flex-shrink-0">
        {interviewComplete ? (
          <button
            onClick={generateStory}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold/90 to-gold text-navy font-bold py-4 rounded-full hover:opacity-90 transition-opacity shadow-md text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Write My Story
          </button>
        ) : userMessageCount > 0 && userMessageCount < TOTAL_QUESTIONS ? (
          <p className="text-xs text-center text-navy/35">
            {TOTAL_QUESTIONS - userMessageCount} question{TOTAL_QUESTIONS - userMessageCount !== 1 ? "s" : ""} to go — you&rsquo;re doing great!
          </p>
        ) : null}
      </div>

      {process.env.NODE_ENV === "development" && debugVoices.length > 0 && (
        <details className="mt-2 text-[10px] text-navy/40 border border-navy/10 rounded-lg p-2">
          <summary className="cursor-pointer font-mono">🔊 TTS debug — {debugVoices.length} voices</summary>
          <ul className="mt-1 max-h-32 overflow-y-auto font-mono space-y-0.5">
            {debugVoices.map(v => (
              <li key={v.name}>{v.lang} — {v.name}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function SharePage() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/share");
    }
  }, [isLoaded, isSignedIn, router]);

  const [mode, setMode] = useState<"form" | "interview">("interview");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [highlightUseStory, setHighlightUseStory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; country?: string; story?: string }>({});

  const [savedDraft, setSavedDraft] = useState<SavedDraft | null>(null);
  const [isUsingDraft, setIsUsingDraft] = useState(false);
  const [draftKey, setDraftKey] = useState(0);
  const [draftInterviewState, setDraftInterviewState] = useState<AIInterviewState | null>(null);
  const interviewStateRef = useRef<AIInterviewState>({
    messages: [{ role: "assistant", content: OPENING_MESSAGE }],
    phase: "interview",
    editedStory: "",
    interviewComplete: false,
  });

  const [interviewAudioBlobs, setInterviewAudioBlobs] = useState<Blob[]>([]);

  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [videoMode, setVideoMode] = useState<"url" | "upload">("url");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string | null>(null);
  const videoProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const browserLang = navigator.language.split("-")[0];
    const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
    if (supported) {
      setForm(prev => ({ ...prev, original_language: supported.code }));
    }

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraft;
        const hasContent =
          parsed.messages.filter((m: Message) => m.role === "user").length > 0 ||
          !!parsed.editedStory ||
          !!parsed.form.name ||
          !!parsed.form.story_text;
        if (hasContent) setSavedDraft(parsed);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  useEffect(() => {
    const hasFormContent = !!(form.name || form.story_text || form.country);
    const iState = interviewStateRef.current;
    const hasInterviewContent =
      iState.messages.filter(m => m.role === "user").length > 0 || !!iState.editedStory;

    if (!hasFormContent && !hasInterviewContent) return;

    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...iState, form, mode, savedAt: Date.now() })
      );
    } catch {
      // ignore storage errors
    }
  }, [form, mode]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  function handleInterviewAudioBlobs(blobs: Blob[]) {
    setInterviewAudioBlobs(blobs);
  }

  function handleInterviewSave(state: AIInterviewState) {
    interviewStateRef.current = state;
    const hasInterviewContent =
      state.messages.filter(m => m.role === "user").length > 0 || !!state.editedStory;
    const hasFormContent = !!(form.name || form.story_text || form.country);

    if (!hasInterviewContent && !hasFormContent) {
      localStorage.removeItem(DRAFT_KEY);
      setIsUsingDraft(false);
      return;
    }

    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...state, form, mode, savedAt: Date.now() })
      );
    } catch {
      // ignore storage errors
    }
  }

  function continueDraft() {
    if (!savedDraft) return;
    setForm(savedDraft.form);
    setMode(savedDraft.mode);
    const iState: AIInterviewState = {
      messages: savedDraft.messages,
      phase: savedDraft.phase,
      editedStory: savedDraft.editedStory,
      interviewComplete: savedDraft.interviewComplete,
    };
    setDraftInterviewState(iState);
    interviewStateRef.current = iState;
    setDraftKey(k => k + 1);
    setIsUsingDraft(true);
    setSavedDraft(null);
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setSavedDraft(null);
    setIsUsingDraft(false);
    setDraftInterviewState(null);
    interviewStateRef.current = {
      messages: [{ role: "assistant", content: OPENING_MESSAGE }],
      phase: "interview",
      editedStory: "",
      interviewComplete: false,
    };
    setDraftKey(k => k + 1);
    setForm(EMPTY);
    setMode("interview");
    setInterviewAudioBlobs([]);
  }

  function set(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleUseStory(story: string) {
    setForm(prev => ({ ...prev, story_text: story }));
    setMode("form");
    setHighlightUseStory(false);
    setFieldErrors(prev => ({ ...prev, story: undefined }));
    setTimeout(() => {
      document.getElementById("story_text")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(250); // collect chunks every 250 ms so no data is lost on stop
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
    setVideoUploadedUrl(null);
    if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) { setStatus("success"); return; }

    const errors: { name?: string; country?: string; story?: string } = {};
    if (!form.name.trim()) errors.name = "Please enter your name";
    if (!form.country.trim()) errors.country = "Please enter your country of origin";
    if (!form.story_text.trim()) {
      if (mode === "interview") {
        setHighlightUseStory(true);
        setTimeout(() => {
          document.getElementById("use-this-story-btn")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return;
      }
      errors.story = "Please tell us your story";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.name) document.getElementById("name")?.focus();
      else if (errors.country) document.getElementById("country")?.focus();
      else if (errors.story) document.getElementById("story_text")?.focus();
      return;
    }
    setFieldErrors({});

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

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("story-audio")
          .getPublicUrl(upload.path);
        audio_url = urlData.publicUrl;
      }
    }

    let video_url: string | null = form.video_url || null;
    if (videoMode === "upload" && videoUploadedUrl) {
      video_url = videoUploadedUrl;
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
        clerk_user_id: userId ?? null,
      }),
    });

    if (!res.ok) {
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
      // Upload interview audio recordings (fire and forget)
      if (interviewAudioBlobs.length > 0) {
        const storyIdForPath = id ?? `${Date.now()}`;
        Promise.all(
          interviewAudioBlobs.map((blob, idx) =>
            supabase.storage
              .from("story-audio")
              .upload(`interview/${storyIdForPath}_${idx}.webm`, blob, { contentType: "audio/webm" })
          )
        ).catch(() => {/* non-critical */});
      }
      localStorage.removeItem(DRAFT_KEY);
      setIsUsingDraft(false);
      setDraftInterviewState(null);
      interviewStateRef.current = {
        messages: [{ role: "assistant", content: OPENING_MESSAGE }],
        phase: "interview",
        editedStory: "",
        interviewComplete: false,
      };
      setStatus("success");
      setForm(EMPTY);
      clearAudio();
      clearVideo();
      setInterviewAudioBlobs([]);
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
          onClick={() => {
            setStatus("idle");
            setDraftKey(k => k + 1);
          }}
          className="bg-navy text-cream font-semibold px-8 py-3 rounded-full hover:bg-navy/90 transition-colors"
        >
          Share Another Story
        </button>
      </div>
    );
  }

  const draftAnswerCount = savedDraft?.messages.filter(m => m.role === "user").length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {savedDraft && (
        <div className="mb-6 bg-gold/10 border border-gold/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm">You have a saved draft</p>
            <p className="text-xs text-navy/50 mt-0.5">
              Saved {formatRelativeTime(savedDraft.savedAt)}
              {draftAnswerCount > 0 && ` · ${draftAnswerCount} question${draftAnswerCount !== 1 ? "s" : ""} answered`}
              {savedDraft.editedStory && " · story generated"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={clearDraft}
              className="text-sm px-4 py-2 rounded-full border border-navy/20 text-navy/60 hover:text-navy hover:border-navy/40 transition-colors"
            >
              Start Fresh
            </button>
            <button
              type="button"
              onClick={continueDraft}
              className="text-sm px-4 py-2 rounded-full bg-navy text-cream hover:bg-navy/90 transition-colors font-semibold"
            >
              Continue Draft
            </button>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-bold text-navy mb-2">Share Your Story</h1>
      <p className="text-navy/60 mb-2 text-lg">
        Your journey matters. Help us preserve it for future generations.
      </p>
      <p className="text-navy/50 mb-8 text-sm">
        Not sure how to start? Let our AI guide you — just answer a few simple questions and we&rsquo;ll write a beautiful story for you.
      </p>

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

      {mode === "interview" && (
        <>
          {isUsingDraft && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={clearDraft}
                className="text-xs text-navy/40 hover:text-navy/60 transition-colors underline underline-offset-2"
              >
                Clear draft &amp; start fresh
              </button>
            </div>
          )}
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
            <AIInterview
              key={draftKey}
              onUseStory={handleUseStory}
              language={form.original_language}
              highlightUseStory={highlightUseStory}
              initialState={draftInterviewState}
              onSave={handleInterviewSave}
              onAudioBlobsChange={handleInterviewAudioBlobs}
            />
          </div>
        </>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-8 bg-white rounded-2xl border border-navy/10 shadow-sm p-8"
      >
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

        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Full Name" htmlFor="name" required>
              <input
                id="name"
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={e => { set("name")(e); setFieldErrors(prev => ({ ...prev, name: undefined })); }}
                className={`${INPUT}${fieldErrors.name ? " border-red-400 focus:ring-red-400" : ""}`}
              />
              {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
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
                onChange={e => { set("country")(e); setFieldErrors(prev => ({ ...prev, country: undefined })); }}
                className={`${INPUT}${fieldErrors.country ? " border-red-400 focus:ring-red-400" : ""}`}
              />
              {fieldErrors.country && <p className="text-xs text-red-500">{fieldErrors.country}</p>}
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

        <div className="flex flex-col gap-4">
          <Field label="Your Story" htmlFor="story_text" required>
            <textarea
              id="story_text"
              rows={9}
              placeholder="Tell us about your journey — why you came, what it was like to arrive, and how your life has changed…"
              value={form.story_text}
              onChange={e => { set("story_text")(e); setFieldErrors(prev => ({ ...prev, story: undefined })); }}
              className={`${INPUT} resize-none${fieldErrors.story ? " border-red-400 focus:ring-red-400" : ""}`}
            />
            {fieldErrors.story && <p className="text-xs text-red-500">{fieldErrors.story}</p>}
          </Field>
        </div>

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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setVideoFile(file);
                    setVideoUploadedUrl(null);
                    setVideoUploading(true);
                    setVideoProgress(0);

                    videoProgressTimerRef.current = setInterval(() => {
                      setVideoProgress((p) => (p < 90 ? +(p + Math.random() * 8).toFixed(1) : 90));
                    }, 300);

                    const ext = file.name.split(".").pop() ?? "mp4";
                    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                    const { data: vidUpload, error: vidErr } = await supabase.storage
                      .from("story-videos")
                      .upload(path, file, { contentType: file.type });

                    if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);

                    if (vidErr) {
                      setVideoUploading(false);
                      setVideoProgress(0);
                    } else {
                      setVideoProgress(100);
                      const { data: vidUrl } = supabase.storage
                        .from("story-videos")
                        .getPublicUrl(vidUpload.path);
                      setVideoUploadedUrl(vidUrl.publicUrl);
                      await new Promise((r) => setTimeout(r, 400));
                      setVideoUploading(false);
                    }
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
          disabled={status === "loading" || videoUploading}
          className="bg-navy text-cream font-semibold py-3 rounded-full hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {videoUploading
            ? "Uploading video… please wait"
            : status === "loading"
            ? "Submitting…"
            : "Submit Your Story"}
        </button>
      </form>
    </div>
  );
}
