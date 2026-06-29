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

type UIStrings = {
  placeholder: string;
  placeholderRecording: string;
  placeholderWaiting: string;
  clickToTalk: string;
  recordingLabel: string;
  clickToStop: string;
  continueBtn: string;
  replay: string;
  startOver: string;
  progressText: (n: number) => string;
  progressLost: string;
  yesReset: string;
  cancelConfirm: string;
  recordingStatus: string;
  processingRecording: string;
  noSpeechDetected: string;
  noSoundLive: string;
};

const UI_STRINGS: Record<string, UIStrings> = {
  en: {
    placeholder: "Share your answer… (Enter to send, Shift+Enter for new line)",
    placeholderRecording: "Recording… click ⏹ to stop",
    placeholderWaiting: "Waiting for response…",
    clickToTalk: "Click to Talk",
    recordingLabel: "Recording…",
    clickToStop: "Click to Stop",
    continueBtn: "Continue",
    replay: "Replay",
    startOver: "Start Over",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} questions`,
    progressLost: "Progress will be lost.",
    yesReset: "Yes, reset",
    cancelConfirm: "Cancel",
    recordingStatus: "Recording…",
    processingRecording: "Processing recording…",
    noSpeechDetected: "We couldn't hear that clearly. Try recording again, or type your answer.",
    noSoundLive: "We're not hearing any sound. Check your microphone, or stop and type your answer instead.",
  },
  es: {
    placeholder: "Comparte tu respuesta… (Intro para enviar, Shift+Intro para nueva línea)",
    placeholderRecording: "Grabando… haz clic en ⏹ para parar",
    placeholderWaiting: "Esperando respuesta…",
    clickToTalk: "Clic para hablar",
    recordingLabel: "Grabando…",
    clickToStop: "Clic para parar",
    continueBtn: "Continuar",
    replay: "Reproducir",
    startOver: "Empezar de nuevo",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} preguntas`,
    progressLost: "Se perderá el progreso.",
    yesReset: "Sí, reiniciar",
    cancelConfirm: "Cancelar",
    recordingStatus: "Grabando…",
    processingRecording: "Procesando grabación…",
    noSpeechDetected: "No pudimos escucharte bien. Intenta grabar de nuevo o escribe tu respuesta.",
    noSoundLive: "No estamos escuchando ningún sonido. Comprueba tu micrófono o para y escribe tu respuesta.",
  },
  fr: {
    placeholder: "Partagez votre réponse… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)",
    placeholderRecording: "Enregistrement… cliquez sur ⏹ pour arrêter",
    placeholderWaiting: "En attente de réponse…",
    clickToTalk: "Cliquez pour parler",
    recordingLabel: "Enregistrement…",
    clickToStop: "Clic pour arrêter",
    continueBtn: "Continuer",
    replay: "Rejouer",
    startOver: "Recommencer",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} questions`,
    progressLost: "La progression sera perdue.",
    yesReset: "Oui, réinitialiser",
    cancelConfirm: "Annuler",
    recordingStatus: "Enregistrement…",
    processingRecording: "Traitement de l'enregistrement…",
    noSpeechDetected: "Nous n'avons pas pu vous entendre clairement. Réessayez d'enregistrer ou tapez votre réponse.",
    noSoundLive: "Nous n'entendons aucun son. Vérifiez votre microphone, ou arrêtez et tapez votre réponse.",
  },
  pt: {
    placeholder: "Compartilhe sua resposta… (Enter para enviar, Shift+Enter para nova linha)",
    placeholderRecording: "Gravando… clique em ⏹ para parar",
    placeholderWaiting: "Aguardando resposta…",
    clickToTalk: "Clique para falar",
    recordingLabel: "Gravando…",
    clickToStop: "Clique para parar",
    continueBtn: "Continuar",
    replay: "Reproduzir",
    startOver: "Recomeçar",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} perguntas`,
    progressLost: "O progresso será perdido.",
    yesReset: "Sim, reiniciar",
    cancelConfirm: "Cancelar",
    recordingStatus: "Gravando…",
    processingRecording: "Processando gravação…",
    noSpeechDetected: "Não conseguimos ouvi-lo bem. Tente gravar novamente ou escreva sua resposta.",
    noSoundLive: "Não estamos ouvindo nenhum som. Verifique seu microfone ou pare e escreva sua resposta.",
  },
  de: {
    placeholder: "Teile deine Antwort… (Eingabe zum Senden, Umschalt+Eingabe für neue Zeile)",
    placeholderRecording: "Aufnahme… klicke ⏹ zum Stoppen",
    placeholderWaiting: "Warte auf Antwort…",
    clickToTalk: "Klicken zum Reden",
    recordingLabel: "Aufnahme…",
    clickToStop: "Klicken stoppen",
    continueBtn: "Weiter",
    replay: "Wiederholen",
    startOver: "Neu starten",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} Fragen`,
    progressLost: "Fortschritt geht verloren.",
    yesReset: "Ja, zurücksetzen",
    cancelConfirm: "Abbrechen",
    recordingStatus: "Aufnahme…",
    processingRecording: "Aufnahme wird verarbeitet…",
    noSpeechDetected: "Wir konnten das nicht klar hören. Versuche es erneut aufzunehmen oder tippe deine Antwort.",
    noSoundLive: "Wir hören keinen Ton. Überprüfe dein Mikrofon, oder stoppe die Aufnahme und tippe deine Antwort.",
  },
  it: {
    placeholder: "Condividi la tua risposta… (Invio per inviare, Maiusc+Invio per nuova riga)",
    placeholderRecording: "Registrazione… clicca ⏹ per fermare",
    placeholderWaiting: "In attesa di risposta…",
    clickToTalk: "Clicca per parlare",
    recordingLabel: "Registrazione…",
    clickToStop: "Clicca per fermare",
    continueBtn: "Continua",
    replay: "Riproduci",
    startOver: "Ricomincia",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} domande`,
    progressLost: "Il progresso verrà perso.",
    yesReset: "Sì, ripristina",
    cancelConfirm: "Annulla",
    recordingStatus: "Registrazione…",
    processingRecording: "Elaborazione registrazione…",
    noSpeechDetected: "Non siamo riusciti a sentirti bene. Riprova a registrare o digita la tua risposta.",
    noSoundLive: "Non stiamo sentendo nessun suono. Controlla il microfono, oppure fermati e digita la tua risposta.",
  },
  zh: {
    placeholder: "分享您的回答…（Enter 发送，Shift+Enter 换行）",
    placeholderRecording: "录音中… 点击 ⏹ 停止",
    placeholderWaiting: "等待回应中…",
    clickToTalk: "点击说话",
    recordingLabel: "录音中…",
    clickToStop: "点击停止",
    continueBtn: "继续",
    replay: "重放",
    startOver: "重新开始",
    progressText: (n) => `第 ${n}/${TOTAL_QUESTIONS} 题`,
    progressLost: "进度将会丢失。",
    yesReset: "是，重置",
    cancelConfirm: "取消",
    recordingStatus: "录音中…",
    processingRecording: "处理录音中…",
    noSpeechDetected: "我们听不清楚。请重新录音，或直接输入您的回答。",
    noSoundLive: "我们没有听到任何声音。请检查您的麦克风，或停止录音并输入您的回答。",
  },
  ja: {
    placeholder: "回答を入力してください…（Enterで送信、Shift+Enterで改行）",
    placeholderRecording: "録音中… ⏹ をクリックして停止",
    placeholderWaiting: "応答を待っています…",
    clickToTalk: "クリックして話す",
    recordingLabel: "録音中…",
    clickToStop: "クリックして停止",
    continueBtn: "続ける",
    replay: "再生",
    startOver: "最初からやり直す",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} 問`,
    progressLost: "進捗が失われます。",
    yesReset: "はい、リセット",
    cancelConfirm: "キャンセル",
    recordingStatus: "録音中…",
    processingRecording: "録音を処理中…",
    noSpeechDetected: "はっきりと聞き取れませんでした。もう一度録音するか、回答を入力してください。",
    noSoundLive: "音が聞こえません。マイクを確認するか、停止して回答を入力してください。",
  },
  ko: {
    placeholder: "답변을 입력하세요…（Enter로 전송, Shift+Enter로 줄바꿈）",
    placeholderRecording: "녹음 중… ⏹ 클릭하여 중지",
    placeholderWaiting: "응답 기다리는 중…",
    clickToTalk: "클릭하여 말하기",
    recordingLabel: "녹음 중…",
    clickToStop: "클릭하여 중지",
    continueBtn: "계속",
    replay: "다시 듣기",
    startOver: "처음부터 다시",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} 질문`,
    progressLost: "진행 상황이 사라집니다.",
    yesReset: "예, 초기화",
    cancelConfirm: "취소",
    recordingStatus: "녹음 중…",
    processingRecording: "녹음 처리 중…",
    noSpeechDetected: "명확하게 들리지 않았습니다. 다시 녹음하거나 답변을 입력해 주세요.",
    noSoundLive: "소리가 들리지 않아요. 마이크를 확인하거나, 중지하고 답변을 입력해 주세요.",
  },
  ar: {
    placeholder: "شارك إجابتك… (Enter للإرسال، Shift+Enter لسطر جديد)",
    placeholderRecording: "جارٍ التسجيل… انقر على ⏹ للتوقف",
    placeholderWaiting: "في انتظار الرد…",
    clickToTalk: "انقر للتحدث",
    recordingLabel: "تسجيل…",
    clickToStop: "انقر للإيقاف",
    continueBtn: "متابعة",
    replay: "إعادة",
    startOver: "البدء من جديد",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} أسئلة`,
    progressLost: "سيُفقد التقدم.",
    yesReset: "نعم، إعادة ضبط",
    cancelConfirm: "إلغاء",
    recordingStatus: "تسجيل…",
    processingRecording: "معالجة التسجيل…",
    noSpeechDetected: "لم نتمكن من سماعك بوضوح. حاول التسجيل مرة أخرى أو اكتب إجابتك.",
    noSoundLive: "لا نسمع أي صوت. تحقق من الميكروفون، أو أوقف التسجيل واكتب إجابتك.",
  },
  hi: {
    placeholder: "अपना उत्तर साझा करें… (भेजने के लिए Enter, नई पंक्ति के लिए Shift+Enter)",
    placeholderRecording: "रिकॉर्डिंग… रोकने के लिए ⏹ क्लिक करें",
    placeholderWaiting: "प्रतिक्रिया की प्रतीक्षा…",
    clickToTalk: "बात करने के लिए क्लिक करें",
    recordingLabel: "रिकॉर्डिंग…",
    clickToStop: "रोकने के लिए क्लिक करें",
    continueBtn: "जारी रखें",
    replay: "दोबारा सुनें",
    startOver: "फिर से शुरू करें",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} प्रश्न`,
    progressLost: "प्रगति खो जाएगी।",
    yesReset: "हाँ, रीसेट करें",
    cancelConfirm: "रद्द करें",
    recordingStatus: "रिकॉर्डिंग…",
    processingRecording: "रिकॉर्डिंग प्रोसेस हो रही है…",
    noSpeechDetected: "हम आपको स्पष्ट रूप से नहीं सुन सके। दोबारा रिकॉर्ड करें या अपना उत्तर टाइप करें।",
    noSoundLive: "हमें कोई आवाज़ नहीं सुनाई दे रही। अपना माइक्रोफ़ोन जाँचें, या रोकें और अपना उत्तर टाइप करें।",
  },
  ru: {
    placeholder: "Поделитесь своим ответом… (Enter — отправить, Shift+Enter — новая строка)",
    placeholderRecording: "Запись… нажмите ⏹ для остановки",
    placeholderWaiting: "Ожидание ответа…",
    clickToTalk: "Нажмите говорить",
    recordingLabel: "Запись…",
    clickToStop: "Нажмите стоп",
    continueBtn: "Продолжить",
    replay: "Повтор",
    startOver: "Начать заново",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} вопросов`,
    progressLost: "Прогресс будет потерян.",
    yesReset: "Да, сбросить",
    cancelConfirm: "Отмена",
    recordingStatus: "Запись…",
    processingRecording: "Обработка записи…",
    noSpeechDetected: "Нам не удалось чётко расслышать. Попробуйте записать снова или напечатайте ответ.",
    noSoundLive: "Мы не слышим звука. Проверьте микрофон или остановите запись и напечатайте ответ.",
  },
  uk: {
    placeholder: "Поділіться своєю відповіддю… (Enter — надіслати, Shift+Enter — новий рядок)",
    placeholderRecording: "Запис… натисніть ⏹ для зупинки",
    placeholderWaiting: "Очікування відповіді…",
    clickToTalk: "Натисніть говорити",
    recordingLabel: "Запис…",
    clickToStop: "Натисніть зупинити",
    continueBtn: "Продовжити",
    replay: "Повтор",
    startOver: "Почати знову",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} питань`,
    progressLost: "Прогрес буде втрачено.",
    yesReset: "Так, скинути",
    cancelConfirm: "Скасувати",
    recordingStatus: "Запис…",
    processingRecording: "Обробка запису…",
    noSpeechDetected: "Нам не вдалося чітко почути. Спробуйте записати знову або надрукуйте відповідь.",
    noSoundLive: "Ми не чуємо жодного звуку. Перевірте мікрофон або зупиніть запис і надрукуйте відповідь.",
  },
  el: {
    placeholder: "Μοιραστείτε την απάντησή σας… (Enter για αποστολή, Shift+Enter για νέα γραμμή)",
    placeholderRecording: "Ηχογράφηση… κάντε κλικ στο ⏹ για διακοπή",
    placeholderWaiting: "Αναμονή για απάντηση…",
    clickToTalk: "Κάντε κλικ να μιλήσετε",
    recordingLabel: "Ηχογράφηση…",
    clickToStop: "Κλικ για διακοπή",
    continueBtn: "Συνέχεια",
    replay: "Επανάληψη",
    startOver: "Ξεκινήστε από την αρχή",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} ερωτήσεις`,
    progressLost: "Η πρόοδος θα χαθεί.",
    yesReset: "Ναι, επαναφορά",
    cancelConfirm: "Ακύρωση",
    recordingStatus: "Ηχογράφηση…",
    processingRecording: "Επεξεργασία ηχογράφησης…",
    noSpeechDetected: "Δεν μπορέσαμε να σας ακούσουμε καθαρά. Δοκιμάστε να ηχογραφήσετε ξανά ή πληκτρολογήστε την απάντησή σας.",
    noSoundLive: "Δεν ακούμε κανέναν ήχο. Ελέγξτε το μικρόφωνό σας ή σταματήστε και πληκτρολογήστε την απάντησή σας.",
  },
  vi: {
    placeholder: "Chia sẻ câu trả lời của bạn… (Enter để gửi, Shift+Enter để xuống dòng)",
    placeholderRecording: "Đang ghi âm… nhấn ⏹ để dừng",
    placeholderWaiting: "Đang chờ phản hồi…",
    clickToTalk: "Nhấn để nói",
    recordingLabel: "Đang ghi…",
    clickToStop: "Nhấn để dừng",
    continueBtn: "Tiếp tục",
    replay: "Phát lại",
    startOver: "Bắt đầu lại",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} câu hỏi`,
    progressLost: "Tiến trình sẽ bị mất.",
    yesReset: "Có, đặt lại",
    cancelConfirm: "Hủy",
    recordingStatus: "Đang ghi…",
    processingRecording: "Đang xử lý ghi âm…",
    noSpeechDetected: "Chúng tôi không nghe rõ. Hãy thử ghi âm lại hoặc nhập câu trả lời của bạn.",
    noSoundLive: "Chúng tôi không nghe thấy âm thanh. Kiểm tra micrô của bạn, hoặc dừng lại và nhập câu trả lời.",
  },
};

function getUIStrings(lang: string): UIStrings {
  return UI_STRINGS[lang] ?? UI_STRINGS["en"];
}

function AIInterview({
  onUseStory,
  language,
  highlightUseStory,
  initialState,
  onSave,
  onAudioBlobsChange,
  onAudioUrlsChange,
}: {
  onUseStory: (story: string) => void;
  language: string;
  highlightUseStory?: boolean;
  initialState?: AIInterviewState | null;
  onSave?: (state: AIInterviewState) => void;
  onAudioBlobsChange?: (blobs: Blob[]) => void;
  onAudioUrlsChange?: (urls: string[]) => void;
}) {
  const ui = getUIStrings(language);

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
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenIndexRef = useRef(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakAbortRef = useRef<AbortController | null>(null);
  const prevLangRef = useRef(language);
  const [interviewRecState, setInterviewRecState] = useState<"idle" | "recording" | "transcribing" | "stopped">("idle");
  const [interviewAudioBlobUrl, setInterviewAudioBlobUrl] = useState<string | null>(null);
  const [interviewRecordingSeconds, setInterviewRecordingSeconds] = useState(0);
  const interviewRecorderRef = useRef<MediaRecorder | null>(null);
  const interviewChunksRef = useRef<Blob[]>([]);
  const interviewAudioBlobsRef = useRef<Blob[]>([]);
  const interviewAudioUrlsRef = useRef<string[]>([]);
  const interviewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsHasPlayedRef = useRef(false);
  const maxVolumeRef = useRef<number>(0);
  const hasDetectedSoundRef = useRef(false);
  const recordingElapsedRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [noSpeechMsg, setNoSpeechMsg] = useState("");

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (phase === "done" && editedStory) {
      onSave?.({ messages, phase, editedStory, interviewComplete });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedStory]);

  const speak = useCallback(async (text: string) => {
    if (typeof window === "undefined") return;
    if (speakAbortRef.current) {
      speakAbortRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const controller = new AbortController();
    speakAbortRef.current = controller;
    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsHasPlayedRef.current = true;
      };
      audio.play().catch(() => {});
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (!controller.signal.aborted) setTtsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      audioContextRef.current?.close();
    };
  }, []);

  // Abort in-flight TTS and kill audio/countdowns when the component unmounts
  // so a navigating-away-and-back cycle doesn't layer two overlapping spoken questions.
  useEffect(() => {
    return () => {
      speakAbortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const stopAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") stopAudio();
    };
    window.addEventListener("pagehide", stopAudio);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopAudio();
      window.removeEventListener("pagehide", stopAudio);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function startInterviewRecording() {
    console.log("mic button clicked");
    setNoSpeechMsg("");
    maxVolumeRef.current = 0;
    hasDetectedSoundRef.current = false;
    recordingElapsedRef.current = 0;
    if (interviewAudioBlobUrl) {
      URL.revokeObjectURL(interviewAudioBlobUrl);
      setInterviewAudioBlobUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
      });

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);
      volumeIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSq = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const dev = dataArray[i] - 128;
          sumSq += dev * dev;
        }
        const rms = Math.sqrt(sumSq / dataArray.length);
        if (rms > maxVolumeRef.current) maxVolumeRef.current = rms;
        recordingElapsedRef.current += 100;
        if (rms >= 3 && !hasDetectedSoundRef.current) {
          hasDetectedSoundRef.current = true;
          setNoSpeechMsg(prev => (prev === ui.noSoundLive ? "" : prev));
        }
        if (recordingElapsedRef.current >= 2500 && !hasDetectedSoundRef.current) {
          setNoSpeechMsg(prev => (prev === ui.noSoundLive ? prev : ui.noSoundLive));
        }
      }, 100);

      interviewChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) interviewChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        if (volumeIntervalRef.current) {
          clearInterval(volumeIntervalRef.current);
          volumeIntervalRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        const blob = new Blob(interviewChunksRef.current, { type: mimeType });
        interviewAudioBlobsRef.current = [...interviewAudioBlobsRef.current, blob];
        onAudioBlobsChange?.(interviewAudioBlobsRef.current);
        stream.getTracks().forEach((t) => t.stop());

        const url = URL.createObjectURL(blob);
        setInterviewAudioBlobUrl(url);

        // Client-side silence pre-check: RMS threshold of 3 (on a 0–128 scale).
        // Genuine silence keeps all samples near 128, giving RMS ~0–1. Quiet
        // background noise might reach ~2. Threshold 3 catches truly silent
        // recordings while letting even soft speech (typically RMS 10+) through.
        if (maxVolumeRef.current < 3) {
          setNoSpeechMsg(prev => (prev === ui.noSoundLive ? prev : ui.noSpeechDetected));
          setInterviewRecState("stopped");
          return;
        }

        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          if (language) fd.append("language", language);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data.no_speech || !data.text) {
            setNoSpeechMsg(ui.noSpeechDetected);
          } else {
            setNoSpeechMsg("");
            setInput(data.text);
            if (data.audio_url) {
              interviewAudioUrlsRef.current = [...interviewAudioUrlsRef.current, data.audio_url];
              onAudioUrlsChange?.(interviewAudioUrlsRef.current);
            }
          }
        } catch {
          // transcription failure is non-fatal — user can type manually
        } finally {
          setInterviewRecState("stopped");
        }
      };

      setInterviewRecordingSeconds(0);
      interviewTimerRef.current = setInterval(() => setInterviewRecordingSeconds(s => s + 1), 1000);
      mr.start(250);
      interviewRecorderRef.current = mr;
      setInterviewRecState("recording");
    } catch (err) {
      console.log("getUserMedia error:", err);
    }
  }

  function stopInterviewRecording() {
    if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    setInterviewRecState("transcribing");
    interviewRecorderRef.current?.stop();
  }

  function clearInterviewRecording() {
    if (interviewAudioBlobUrl) URL.revokeObjectURL(interviewAudioBlobUrl);
    setInterviewAudioBlobUrl(null);
    setInterviewRecordingSeconds(0);
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
    if (interviewRecState === "stopped") clearInterviewRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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
    // Stop any in-flight TTS audio and cancel countdown
    if (speakAbortRef.current) {
      speakAbortRef.current.abort();
      speakAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    ttsHasPlayedRef.current = false;
    const freshMessages: Message[] = [{ role: "assistant", content: OPENING_MESSAGE }];
    setMessages(freshMessages);
    setInput("");
    setInterviewComplete(false);
    setPhase("interview");
    setDraftStory("");
    setEditedStory("");
    setEditingIndex(null);
    setEditingText("");
    setShowStartOverConfirm(false);
    interviewAudioBlobsRef.current = [];
    onAudioBlobsChange?.([]);
    interviewAudioUrlsRef.current = [];
    onAudioUrlsChange?.([]);
    clearInterviewRecording();
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
          {ui.progressText(progress)}
        </span>
        {!showStartOverConfirm && (
          <button
            type="button"
            onClick={() => setShowStartOverConfirm(true)}
            className="text-xs text-navy/35 hover:text-navy/60 transition-colors underline underline-offset-2 flex-shrink-0"
            aria-label="Start over — reset interview to question 1"
          >
            {ui.startOver}
          </button>
        )}
        {showStartOverConfirm && (
          <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label="Confirm start over">
            <span className="text-xs text-navy/60 whitespace-nowrap">{ui.progressLost}</span>
            <button
              type="button"
              onClick={startOver}
              className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors whitespace-nowrap"
              aria-label="Yes, start over and lose my progress"
            >
              {ui.yesReset}
            </button>
            <button
              type="button"
              onClick={() => setShowStartOverConfirm(false)}
              className="text-xs text-navy/40 hover:text-navy/60 transition-colors whitespace-nowrap"
              aria-label="Cancel — keep my progress"
            >
              {ui.cancelConfirm}
            </button>
          </div>
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
                  disabled={ttsLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/40 bg-gold/8 hover:bg-gold/15 transition-colors px-2.5 py-1 rounded-full self-start disabled:opacity-60"
                  aria-label="Read aloud"
                >
                  {ttsLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Loading…
                    </>
                  ) : (
                    <>🔊 {ui.replay}</>
                  )}
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
        {interviewRecState === "recording" && (
          <div className="flex items-center gap-2 text-xs text-red-500 font-semibold px-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            {ui.recordingStatus}
          </div>
        )}
        {interviewRecState === "transcribing" && (
          <div className="flex items-center gap-2 text-xs text-navy/50 px-1">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {ui.processingRecording}
          </div>
        )}
        {noSpeechMsg && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {noSpeechMsg}
          </div>
        )}
        {interviewAudioBlobUrl && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-navy/50 px-1">Recorded: {interviewRecordingSeconds} second{interviewRecordingSeconds !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2 bg-navy/5 rounded-lg px-2 py-1.5">
              <audio controls src={interviewAudioBlobUrl} preload="metadata" onPlay={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }} className="h-8 flex-1 min-w-0" />
              <button
                type="button"
                onClick={clearInterviewRecording}
                className="text-navy/40 hover:text-navy/70 transition-colors flex-shrink-0 text-sm leading-none"
                title="Clear recording"
                aria-label="Clear recording"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              if (noSpeechMsg) setNoSpeechMsg("");
              setInput(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={2}
            placeholder={
              interviewRecState === "recording"
                ? ui.placeholderRecording
                : loading
                ? ui.placeholderWaiting
                : ui.placeholder
            }
            className={`${INPUT} resize-none flex-1${interviewRecState === "recording" ? " border-red-300 focus:ring-red-300" : ""}`}
          />
          {interviewRecState === "recording" ? (
            <button
              type="button"
              onClick={stopInterviewRecording}
              className="bg-red-500 text-white px-3 py-2 rounded-xl hover:bg-red-600 transition-colors flex-shrink-0"
              aria-label="Recording — click to stop"
              title="Recording — click to stop"
            >
              <span className="flex flex-col items-center gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block flex-shrink-0" aria-hidden="true" />
                  {ui.recordingLabel}
                </span>
                <span className="text-[10px] font-semibold animate-pulse">{ui.clickToStop}</span>
              </span>
            </button>
          ) : interviewRecState === "transcribing" ? (
            <div className="p-3 flex-shrink-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-navy/30 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={startInterviewRecording}
                disabled={loading}
                className="bg-navy/10 text-navy px-3 py-2 rounded-xl hover:bg-navy/20 transition-colors disabled:opacity-40 flex flex-col items-center gap-0.5"
                aria-label="Click to talk"
                title="Click to talk"
              >
                <span className="text-base leading-none">🎤</span>
                <span className="text-[10px] font-semibold whitespace-nowrap">{ui.clickToTalk}</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (input.trim() && !window.confirm('Skip this question? Your current answer will be lost.')) return;
              setInput('(skipped)');
              setTimeout(() => sendMessage(), 0);
            }}
            disabled={loading || interviewRecState === "transcribing" || interviewComplete}
            className="bg-gray-100 text-gray-500 px-3 py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-40 flex-shrink-0 text-xs font-semibold whitespace-nowrap"
            aria-label="Skip this question"
            title="Skip this question"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim() || interviewRecState === "transcribing"}
            className="bg-navy text-cream px-4 py-3 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-40 flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold"
            aria-label="Continue"
            title="Continue"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {ui.continueBtn}
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
  const [interviewAudioUrls, setInterviewAudioUrls] = useState<string[]>([]);

  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [recState, setRecState] = useState<"idle" | "recording" | "stopped">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function handleInterviewAudioUrls(urls: string[]) {
    setInterviewAudioUrls(urls);
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
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      setRecState("recording");
    } catch {
      setErrorMsg("Microphone access was denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    setRecState("stopped");
  }

  function clearAudio() {
    if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setAudioFile(null);
    setRecordingSeconds(0);
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

    const interview_audio_urls: string[] = interviewAudioUrls;

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
        interview_audio_urls,
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
              onAudioUrlsChange={handleInterviewAudioUrls}
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
                    <p className="text-xs text-navy/50">Recorded: {recordingSeconds} second{recordingSeconds !== 1 ? "s" : ""}</p>
                    <audio controls src={audioBlobUrl} preload="metadata" onPlay={() => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }} className="w-full h-10" />
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
