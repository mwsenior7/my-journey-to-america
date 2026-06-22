"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StoryTranslator from "@/components/StoryTranslator";
import type { StoryTranslation } from "@/lib/supabase";

const ACCEPTED_VIDEO = ".mp4,.mov,.avi,.webm,video/mp4,video/quicktime,video/x-msvideo,video/webm";

type ReactionCounts = { honored: number; inspired: number; relatable: number; moved: number };

type MoreStory = { id: string; author_name: string; country_of_origin: string; us_state: string | null; year_of_arrival: number | null; profession: string | null; story_text: string };

const SUPABASE_URL = "https://hesfbleyhuzlsqdjbciu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LuEFLmPs0_HQX1tP3El2SQ_uMSG_uxg";

const REACTIONS: { key: keyof ReactionCounts; emoji: string; label: string }[] = [
  { key: "honored", emoji: "🕊️", label: "Honored" },
  { key: "inspired", emoji: "💪", label: "Inspired" },
  { key: "relatable", emoji: "🤝", label: "Relatable" },
  { key: "moved", emoji: "😢", label: "Moved" },
];

type Props = {
  storyId: string;
  authorName: string;
  countryOfOrigin: string;
  usState: string | null;
  yearOfArrival: number | null;
  profession: string | null;
  tags: string[] | null;
  initialText: string;
  initialAudioUrl: string | null;
  initialVideoUrl: string | null;
  isAuthor: boolean;
  originalLang: string;
  translations: Pick<StoryTranslation, "language_code" | "story_text">[];
  readCount: number;
};

function getVideoContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    webm: "video/webm",
  };
  return map[ext] ?? "video/mp4";
}

function VideoEmbed({ url }: { url: string }) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/);
  if (yt) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt[1]}`}
        className="w-full aspect-video rounded-xl border border-navy/10"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeo[1]}`}
        className="w-full aspect-video rounded-xl border border-navy/10"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video
      src={url}
      controls
      className="w-full aspect-video rounded-xl border border-navy/10"
    />
  );
}

export default function StoryPageClient({
  storyId,
  authorName,
  countryOfOrigin,
  usState,
  yearOfArrival,
  profession,
  tags,
  initialText,
  initialAudioUrl,
  initialVideoUrl,
  isAuthor,
  originalLang,
  translations,
  readCount,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [currentText, setCurrentText] = useState(initialText);
  const [draftText, setDraftText] = useState(initialText);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(initialAudioUrl);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(initialVideoUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);

  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({ honored: 0, inspired: 0, relatable: 0, moved: 0 });
  const [activeReaction, setActiveReaction] = useState<keyof ReactionCounts | null>(null);
  const [reactingTo, setReactingTo] = useState<keyof ReactionCounts | null>(null);

  // Audio state
  const [audioMode, setAudioMode] = useState<"record" | "upload">("upload");
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [moreStories, setMoreStories] = useState<MoreStory[]>([]);
  const [moreStoryReactions, setMoreStoryReactions] = useState<Record<string, ReactionCounts>>({});
  const [moreStoryActiveReactions, setMoreStoryActiveReactions] = useState<Record<string, keyof ReactionCounts | null>>({});
  const [moreStoryReactingTo, setMoreStoryReactingTo] = useState<Record<string, keyof ReactionCounts | null>>({});

  const [reportState, setReportState] = useState<"idle" | "open" | "submitting" | "done">("idle");
  const [reportReason, setReportReason] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [reportEmail, setReportEmail] = useState("");

  useEffect(() => {
    fetch(`/api/stories/${storyId}/view`, { method: "POST" });
    fetch(`/api/stories/${storyId}/reactions`)
      .then((r) => r.json())
      .then((d) => { if (d && 'honored' in d) setReactionCounts(d); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadMoreStories() {
      const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
      const base = `${SUPABASE_URL}/rest/v1/stories`;

      const sameParams = new URLSearchParams({
        select: "id,author_name,country_of_origin,us_state,year_of_arrival,profession,story_text",
        status: "eq.approved",
        country_of_origin: `eq.${countryOfOrigin}`,
        id: `neq.${storyId}`,
        order: "created_at.desc",
        limit: "3",
      });
      const sameRes = await fetch(`${base}?${sameParams}`, { headers }).catch(() => null);
      const same: MoreStory[] = sameRes?.ok ? await sameRes.json() : [];

      let stories = same;
      if (same.length < 3) {
        const needed = 3 - same.length;
        const otherParams = new URLSearchParams({
          select: "id,author_name,country_of_origin,us_state,year_of_arrival,profession,story_text",
          status: "eq.approved",
          country_of_origin: `neq.${countryOfOrigin}`,
          order: "created_at.desc",
          limit: String(needed),
        });
        const otherRes = await fetch(`${base}?${otherParams}`, { headers }).catch(() => null);
        const others: MoreStory[] = otherRes?.ok ? await otherRes.json() : [];
        stories = [...same, ...others];
      }
      setMoreStories(stories);

      const rxnResults = await Promise.all(
        stories.map((s) =>
          fetch(`/api/stories/${s.id}/reactions`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      const rxnMap: Record<string, ReactionCounts> = {};
      stories.forEach((s, i) => {
        if (rxnResults[i] && "honored" in rxnResults[i]) rxnMap[s.id] = rxnResults[i];
      });
      setMoreStoryReactions(rxnMap);
    }
    loadMoreStories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, countryOfOrigin]);

  // Video state
  const [videoMode, setVideoMode] = useState<"url" | "upload">("url");
  const [videoUrlDraft, setVideoUrlDraft] = useState(initialVideoUrl ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string | null>(null);
  const videoProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function enterEditMode() {
    setDraftText(currentText);
    setAudioMode("upload");
    setRecState("idle");
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setAudioFile(null);
    setVideoMode("url");
    setVideoUrlDraft(currentVideoUrl ?? "");
    setVideoFile(null);
    setVideoProgress(0);
    setVideoUploading(false);
    setVideoUploadedUrl(null);
    setError(null);
    setShowTranslationPanel(false);
    setEditMode(true);
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
      setError("Microphone access was denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecState("stopped");
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    let newAudioUrl = currentAudioUrl;
    const mediaToUpload: Blob | File | null = audioBlob ?? audioFile;

    if (mediaToUpload) {
      const isRecorded = !!audioBlob;
      const ext = isRecorded ? "webm" : (audioFile!.name.split(".").pop() ?? "audio");
      const contentType = isRecorded ? "audio/webm" : audioFile!.type || "audio/mpeg";

      const signRes = await fetch("/api/stories/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "story-audio", filename: `audio.${ext}` }),
      });
      if (!signRes.ok) {
        setError("Failed to upload audio. Please try again.");
        setSaving(false);
        return;
      }
      const { signedUrl, publicUrl } = await signRes.json();

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: mediaToUpload,
      });
      if (!uploadRes.ok) {
        setError("Failed to upload audio. Please try again.");
        setSaving(false);
        return;
      }
      newAudioUrl = publicUrl;
    }

    let newVideoUrl = videoMode === "upload" ? videoUploadedUrl : (videoUrlDraft.trim() || null);

    try {
      const res = await fetch("/api/stories/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          story_text: draftText,
          audio_url: newAudioUrl,
          video_url: newVideoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setCurrentText(draftText);
      setCurrentAudioUrl(newAudioUrl);
      setCurrentVideoUrl(newVideoUrl);
      setEditMode(false);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearAudio();
    clearVideo();
    setEditMode(false);
    setError(null);
  };

  const handleReact = async (key: keyof ReactionCounts) => {
    if (reactingTo) return;
    console.log(`[Reaction] Clicked: ${key}, storyId: ${storyId}, url: /api/stories/${storyId}/react`);
    setReactingTo(key);
    try {
      const res = await fetch(`/api/stories/${storyId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: key }),
      });
      const data = await res.json();
      if (data && 'honored' in data) {
        setReactionCounts(data);
        setActiveReaction(key);
      }
    } catch (err) {
      console.error(`[Reaction] Error:`, err);
    } finally {
      setReactingTo(null);
    }
  };

  const handleMoreStoryReact = async (sid: string, key: keyof ReactionCounts) => {
    if (moreStoryReactingTo[sid]) return;
    setMoreStoryReactingTo((prev) => ({ ...prev, [sid]: key }));
    try {
      const res = await fetch(`/api/stories/${sid}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: key }),
      });
      const data = await res.json();
      if (data && "honored" in data) {
        setMoreStoryReactions((prev) => ({ ...prev, [sid]: data }));
        setMoreStoryActiveReactions((prev) => ({ ...prev, [sid]: key }));
      }
    } catch {
      // silent
    } finally {
      setMoreStoryReactingTo((prev) => ({ ...prev, [sid]: null }));
    }
  };

  async function handleReport() {
    if (!reportReason) return;
    setReportState("submitting");
    try {
      await fetch("/api/report-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          reporter_email: reportEmail.trim() || undefined,
          reason: reportReason,
          comment: reportComment.trim() || undefined,
          story_excerpt: currentText.slice(0, 300),
        }),
      });
      setReportState("done");
    } catch {
      setReportState("idle");
    }
  }

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/50">
            <span className="font-medium text-navy/70">{countryOfOrigin}</span>
            {usState && <><span>·</span><span>{usState}</span></>}
            {yearOfArrival && <><span>·</span><span>{yearOfArrival}</span></>}
            {profession && <><span>·</span><span>{profession}</span></>}
          </div>
          {!editMode && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTranslationPanel((open) => !open)}
                className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold border border-navy/20 bg-white text-navy px-4 py-2 rounded-lg hover:border-navy/40 hover:text-navy transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5h12M9 3v2m7 14h3m0 0l-2-2m2 2l-2 2M12 15l4-4m0 0l4-4m-4 4H4" />
                </svg>
                Translate
              </button>
              {isAuthor && (
                <button
                  onClick={enterEditMode}
                  className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold bg-gold text-navy px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit My Story
                </button>
              )}
            </div>
          )}
        </div>

        <h1 className="text-4xl font-extrabold text-navy leading-tight mb-2">
          {authorName}
        </h1>

        {readCount > 0 && (
          <p className="text-sm font-medium mt-2" style={{ color: "#C9A84C" }}>
            👁 {readCount} {readCount === 1 ? "person has" : "people have"} read this story
          </p>
        )}

        {(() => {
          const totalReactions = reactionCounts.honored + reactionCounts.inspired + reactionCounts.relatable + reactionCounts.moved;
          return totalReactions > 0 ? (
            <p className="text-sm font-medium mt-4" style={{ color: "#C9A84C" }}>
              ❤️ {totalReactions} {totalReactions === 1 ? "person reacted" : "people reacted"} to this story
            </p>
          ) : null;
        })()}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/browse?q=${encodeURIComponent(tag)}`}
                className="text-xs bg-gold/10 text-navy/60 font-medium px-3 py-1 rounded-full hover:bg-gold/20 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Story content or edit form */}
      {editMode ? (
        <div className="mb-12 flex flex-col gap-6">
          {/* Story text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy">Your Story</label>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full min-h-[400px] p-4 text-[1.0625rem] leading-[1.9] text-navy/80 border border-navy/20 rounded-xl resize-y focus:outline-none focus:border-gold/60 bg-white"
            />
          </div>

          {/* Audio */}
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

            {currentAudioUrl && !audioBlob && !audioFile && (
              <div className="text-xs text-navy/50 flex items-center gap-2">
                <span>Current audio:</span>
                <audio controls src={currentAudioUrl} className="h-8 flex-1" />
              </div>
            )}

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
                    htmlFor="edit_audio_file"
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
                    id="edit_audio_file"
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

          {/* Video */}
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
                    onClick={() => { setVideoMode(m); clearVideo(); }}
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
                    type="url"
                    placeholder="https://youtube.com/watch?v=…"
                    value={videoUrlDraft}
                    onChange={(e) => setVideoUrlDraft(e.target.value)}
                    className="border border-navy/20 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold w-full bg-white"
                  />
                  <p className="text-xs text-navy/40">Paste a YouTube or Vimeo link</p>
                </div>
              )}

              {videoMode === "upload" && (
                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="edit_video_file"
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
                    id="edit_video_file"
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

                      const signRes = await fetch("/api/stories/upload-sign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ bucket: "story-videos", filename: file.name }),
                      });

                      if (!signRes.ok) {
                        if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);
                        setVideoUploading(false);
                        setVideoProgress(0);
                        setError("Failed to upload video. Please try again.");
                        return;
                      }

                      const { signedUrl, publicUrl } = await signRes.json();

                      const uploadRes = await fetch(signedUrl, {
                        method: "PUT",
                        headers: { "Content-Type": getVideoContentType(file) },
                        body: file,
                      });

                      if (videoProgressTimerRef.current) clearInterval(videoProgressTimerRef.current);

                      if (!uploadRes.ok) {
                        setVideoUploading(false);
                        setVideoProgress(0);
                        setError("Failed to upload video. Please try again.");
                      } else {
                        setVideoProgress(100);
                        setVideoUploadedUrl(publicUrl);
                        await new Promise((r) => setTimeout(r, 400));
                        setVideoUploading(false);
                      }
                    }}
                  />

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

                  {videoFile && !videoUploading && videoProgress === 0 && (
                    <button
                      type="button"
                      onClick={clearVideo}
                      className="self-start text-xs text-navy/50 hover:text-navy transition-colors underline underline-offset-2"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || videoUploading}
              className="px-5 py-2.5 bg-navy text-cream rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : videoUploading ? "Uploading video…" : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2.5 border border-navy/20 text-navy/60 rounded-lg text-sm font-semibold hover:border-navy/40 hover:text-navy transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-12">
          <StoryTranslator
            originalText={currentText}
            originalLang={originalLang}
            translations={translations}
            showControls={showTranslationPanel}
          />
        </div>
      )}

      {/* Reactions */}
      {!editMode && (
        <div className="mb-10">
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(({ key, emoji, label }) => {
              const isActive = activeReaction === key;
              const isLoading = reactingTo === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleReact(key)}
                  disabled={!!reactingTo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-60"
                  style={{
                    border: "1px solid #C9A84C",
                    background: isActive ? "#C9A84C" : "#0A1628",
                    color: isActive ? "#0A1628" : "#F5F0E8",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: isActive ? "#0A1628" : "#C9A84C22",
                      color: isActive ? "#C9A84C" : "#C9A84C",
                    }}
                  >
                    {reactionCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Audio */}
      {currentAudioUrl && !editMode && (
        <div className="mb-10">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">
            Audio Recording
          </p>
          <audio controls src={currentAudioUrl} className="w-full" />
        </div>
      )}

      {/* Video */}
      {currentVideoUrl && !editMode && (
        <div className="mb-10">
          <p className="text-xs font-semibold text-navy/40 uppercase tracking-widest mb-3">
            Video
          </p>
          <VideoEmbed url={currentVideoUrl} />
        </div>
      )}

      {/* More Stories */}
      {!editMode && moreStories.length > 0 && (
        <div className="mt-16 pt-12 border-t border-navy/10">
          <h2 className="text-2xl font-bold text-navy mb-10">More stories you might enjoy</h2>
          <div className="flex flex-col">
            {moreStories.map((s, i) => {
              const counts = moreStoryReactions[s.id] ?? { honored: 0, inspired: 0, relatable: 0, moved: 0 };
              const activeRxn = moreStoryActiveReactions[s.id] ?? null;
              const reactingToKey = moreStoryReactingTo[s.id] ?? null;
              return (
                <div key={s.id}>
                  {i > 0 && (
                    <div className="flex items-center gap-4 my-12">
                      <div className="flex-1 border-t border-navy/10" />
                      <span className="text-xs text-navy/30 font-medium tracking-wide">Continue reading ↓</span>
                      <div className="flex-1 border-t border-navy/10" />
                    </div>
                  )}
                  <article>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-navy/50 mb-2">
                      <span className="font-medium text-navy/70">{s.country_of_origin}</span>
                      {s.us_state && <><span>·</span><span>{s.us_state}</span></>}
                      {s.year_of_arrival && <><span>·</span><span>{s.year_of_arrival}</span></>}
                      {s.profession && <><span>·</span><span>{s.profession}</span></>}
                    </div>
                    <h3 className="text-2xl font-bold text-navy mb-5">{s.author_name}</h3>
                    <div className="text-[1.0625rem] leading-[1.9] text-navy/80 whitespace-pre-wrap mb-6">
                      {s.story_text}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {REACTIONS.map(({ key, emoji, label }) => {
                        const isActive = activeRxn === key;
                        const isLoading = reactingToKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleMoreStoryReact(s.id, key)}
                            disabled={!!reactingToKey}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-60"
                            style={{
                              border: "1px solid #C9A84C",
                              background: isActive ? "#C9A84C" : "#0A1628",
                              color: isActive ? "#0A1628" : "#F5F0E8",
                              opacity: isLoading ? 0.7 : 1,
                            }}
                          >
                            <span>{emoji}</span>
                            <span>{label}</span>
                            <span
                              className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                              style={{
                                background: isActive ? "#0A1628" : "#C9A84C22",
                                color: isActive ? "#C9A84C" : "#C9A84C",
                              }}
                            >
                              {counts[key]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Report this story */}
      {!editMode && (
        <div className="mt-16 pt-8 border-t border-navy/10">
          {reportState === "idle" && (
            <button
              type="button"
              onClick={() => setReportState("open")}
              className="text-xs text-navy/30 hover:text-navy/50 transition-colors"
            >
              Report this story
            </button>
          )}
          {reportState === "open" && (
            <div className="max-w-md">
              <p className="text-sm font-semibold text-navy mb-3">Report a concern</p>
              <select
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm text-navy mb-3"
              >
                <option value="">Select a reason...</option>
                <option value="Offensive or hateful content">Offensive or hateful content</option>
                <option value="Privacy concern">Privacy concern</option>
                <option value="Inaccurate information">Inaccurate information</option>
                <option value="Spam or fake story">Spam or fake story</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                value={reportComment}
                onChange={e => setReportComment(e.target.value)}
                placeholder="Additional details (optional)"
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm text-navy mb-3 h-20 resize-none"
              />
              <input
                type="email"
                value={reportEmail}
                onChange={e => setReportEmail(e.target.value)}
                placeholder="Your email (optional — for updates)"
                className="w-full border border-navy/20 rounded-lg px-3 py-2 text-sm text-navy mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={!reportReason}
                  className="px-4 py-2 bg-navy text-cream text-sm font-semibold rounded-lg disabled:opacity-40"
                >
                  Submit report
                </button>
                <button
                  type="button"
                  onClick={() => setReportState("idle")}
                  className="px-4 py-2 text-sm text-navy/50 hover:text-navy"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {reportState === "submitting" && (
            <p className="text-xs text-navy/40">Submitting report...</p>
          )}
          {reportState === "done" && (
            <p className="text-xs text-navy/50">Thank you — your report has been received.</p>
          )}
        </div>
      )}
    </>
  );
}
