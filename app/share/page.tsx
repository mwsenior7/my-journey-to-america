"use client"
export const dynamic = "force-dynamic"

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { US_STATES } from "@/lib/us-states";
import { COUNTRIES } from "@/lib/countries";

type FormState = {
  name: string;
  country: string;
  year_arrived: string;
  us_state: string;
  us_state_opt_out: boolean;
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
  us_state_opt_out: false,
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

type InterviewAudioBlob = { answerIndex: number; blob: Blob };
type InterviewAudioUrl = { answerIndex: number; url: string };

type AIInterviewState = {
  messages: Message[];
  phase: "interview" | "generating" | "done" | "age_check";
  editedStory: string;
  interviewComplete: boolean;
};

type SavedDraft = AIInterviewState & {
  form: FormState;
  mode: "form" | "interview";
  savedAt: number;
  autoResume?: boolean;
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

function CountryCombobox({
  id,
  value,
  onChange,
  hasError,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery((q) => (q === value ? q : value));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  function selectCountry(country: string) {
    onChange(country);
    setQuery(country);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlightedIndex]) {
        e.preventDefault();
        selectCountry(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          setHighlightedIndex(0);
          if (next.trim() === "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={`${INPUT}${hasError ? " border-red-400 focus:ring-red-400" : ""}`}
      />
      {open && filtered.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-navy/15 rounded-lg shadow-lg py-1"
        >
          {filtered.map((c, i) => (
            <li
              key={c}
              role="option"
              aria-selected={c === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCountry(c);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`px-4 py-2 text-sm cursor-pointer ${
                i === highlightedIndex ? "bg-gold/15 text-navy" : "text-navy/80"
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() !== "" && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-navy/15 rounded-lg shadow-lg py-2 px-4 text-sm text-navy/40">
          No matches
        </div>
      )}
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
  stop: string;
  startOver: string;
  progressText: (n: number) => string;
  progressLost: string;
  yesReset: string;
  cancelConfirm: string;
  recordingStatus: string;
  processingRecording: string;
  noSpeechDetected: string;
  noSoundLive: string;
  transcriptHint: string;
  preferNotToSay: string;
  mapNudge: string;
  ageGateTitle: string;
  ageGateBody: string;
  ageGateMonth: string;
  ageGateDay: string;
  ageGateYear: string;
  ageGateConfirm: string;
  ageGateContinue: string;
  ageGateSubmitting: string;
  ageGateError: string;
  ageGateBlockedTitle: string;
  ageGateBlockedBody: string;
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
    stop: "Stop",
    startOver: "Start Over",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} questions`,
    progressLost: "Progress will be lost.",
    yesReset: "Yes, reset",
    cancelConfirm: "Cancel",
    recordingStatus: "Recording…",
    processingRecording: "Processing recording…",
    noSpeechDetected: "We couldn't hear that clearly. Try recording again, or type your answer.",
    noSoundLive: "We're not hearing any sound. Check your microphone, or stop and type your answer instead.",
    transcriptHint: "Tap the text above to make changes, or press Continue.",
    preferNotToSay: "Prefer not to say",
    mapNudge: "Choosing a state adds your journey to the Journey Map.",
    ageGateTitle: "Before You Share",
    ageGateBody: "To help keep our community safe, please confirm your date of birth before sharing your story.",
    ageGateMonth: "Month",
    ageGateDay: "Day",
    ageGateYear: "Year",
    ageGateConfirm: "By continuing you confirm this information is accurate.",
    ageGateContinue: "Continue",
    ageGateSubmitting: "Checking…",
    ageGateError: "Please select a valid date of birth.",
    ageGateBlockedTitle: "Thanks for letting us know",
    ageGateBlockedBody: "You must be 13 or older to share a story here. We hope you'll come back and share when you're a bit older!",
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
    stop: "Detener",
    startOver: "Empezar de nuevo",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} preguntas`,
    progressLost: "Se perderá el progreso.",
    yesReset: "Sí, reiniciar",
    cancelConfirm: "Cancelar",
    recordingStatus: "Grabando…",
    processingRecording: "Procesando grabación…",
    noSpeechDetected: "No pudimos escucharte bien. Intenta grabar de nuevo o escribe tu respuesta.",
    noSoundLive: "No estamos escuchando ningún sonido. Comprueba tu micrófono o para y escribe tu respuesta.",
    transcriptHint: "Toca el texto de arriba para hacer cambios, o presiona Continuar.",
    preferNotToSay: "Prefiero no decirlo",
    mapNudge: "Elegir un estado añade tu viaje al Mapa del Viaje.",
    ageGateTitle: "Antes de compartir",
    ageGateBody: "Para ayudar a mantener segura nuestra comunidad, confirma tu fecha de nacimiento antes de compartir tu historia.",
    ageGateMonth: "Mes",
    ageGateDay: "Día",
    ageGateYear: "Año",
    ageGateConfirm: "Al continuar, confirmas que esta información es correcta.",
    ageGateContinue: "Continuar",
    ageGateSubmitting: "Comprobando…",
    ageGateError: "Selecciona una fecha de nacimiento válida.",
    ageGateBlockedTitle: "Gracias por decírnoslo",
    ageGateBlockedBody: "Debes tener 13 años o más para compartir una historia aquí. ¡Esperamos que vuelvas a compartir cuando seas un poco mayor!",
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
    stop: "Arrêter",
    startOver: "Recommencer",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} questions`,
    progressLost: "La progression sera perdue.",
    yesReset: "Oui, réinitialiser",
    cancelConfirm: "Annuler",
    recordingStatus: "Enregistrement…",
    processingRecording: "Traitement de l'enregistrement…",
    noSpeechDetected: "Nous n'avons pas pu vous entendre clairement. Réessayez d'enregistrer ou tapez votre réponse.",
    noSoundLive: "Nous n'entendons aucun son. Vérifiez votre microphone, ou arrêtez et tapez votre réponse.",
    transcriptHint: "Touchez le texte ci-dessus pour apporter des modifications, ou appuyez sur Continuer.",
    preferNotToSay: "Je préfère ne pas préciser",
    mapNudge: "Choisir un état ajoute votre parcours à la Carte du Voyage.",
    ageGateTitle: "Avant de partager",
    ageGateBody: "Pour aider à assurer la sécurité de notre communauté, veuillez confirmer votre date de naissance avant de partager votre histoire.",
    ageGateMonth: "Mois",
    ageGateDay: "Jour",
    ageGateYear: "Année",
    ageGateConfirm: "En continuant, vous confirmez que ces informations sont exactes.",
    ageGateContinue: "Continuer",
    ageGateSubmitting: "Vérification…",
    ageGateError: "Veuillez sélectionner une date de naissance valide.",
    ageGateBlockedTitle: "Merci de nous l'avoir dit",
    ageGateBlockedBody: "Vous devez avoir au moins 13 ans pour partager une histoire ici. Nous espérons que vous reviendrez partager votre histoire un peu plus tard !",
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
    stop: "Parar",
    startOver: "Recomeçar",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} perguntas`,
    progressLost: "O progresso será perdido.",
    yesReset: "Sim, reiniciar",
    cancelConfirm: "Cancelar",
    recordingStatus: "Gravando…",
    processingRecording: "Processando gravação…",
    noSpeechDetected: "Não conseguimos ouvi-lo bem. Tente gravar novamente ou escreva sua resposta.",
    noSoundLive: "Não estamos ouvindo nenhum som. Verifique seu microfone ou pare e escreva sua resposta.",
    transcriptHint: "Toque no texto acima para fazer alterações, ou pressione Continuar.",
    preferNotToSay: "Prefiro não dizer",
    mapNudge: "Escolher um estado adiciona sua jornada ao Mapa da Jornada.",
    ageGateTitle: "Antes de compartilhar",
    ageGateBody: "Para ajudar a manter nossa comunidade segura, confirme sua data de nascimento antes de compartilhar sua história.",
    ageGateMonth: "Mês",
    ageGateDay: "Dia",
    ageGateYear: "Ano",
    ageGateConfirm: "Ao continuar, você confirma que esta informação é precisa.",
    ageGateContinue: "Continuar",
    ageGateSubmitting: "Verificando…",
    ageGateError: "Selecione uma data de nascimento válida.",
    ageGateBlockedTitle: "Obrigado por nos avisar",
    ageGateBlockedBody: "Você precisa ter 13 anos ou mais para compartilhar uma história aqui. Esperamos que volte para compartilhar quando for um pouco mais velho!",
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
    stop: "Stoppen",
    startOver: "Neu starten",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} Fragen`,
    progressLost: "Fortschritt geht verloren.",
    yesReset: "Ja, zurücksetzen",
    cancelConfirm: "Abbrechen",
    recordingStatus: "Aufnahme…",
    processingRecording: "Aufnahme wird verarbeitet…",
    noSpeechDetected: "Wir konnten das nicht klar hören. Versuche es erneut aufzunehmen oder tippe deine Antwort.",
    noSoundLive: "Wir hören keinen Ton. Überprüfe dein Mikrofon, oder stoppe die Aufnahme und tippe deine Antwort.",
    transcriptHint: "Tippe auf den Text oben, um Änderungen vorzunehmen, oder drücke Weiter.",
    preferNotToSay: "Keine Angabe",
    mapNudge: "Die Auswahl eines Bundesstaats fügt deine Reise der Reisekarte hinzu.",
    ageGateTitle: "Bevor du teilst",
    ageGateBody: "Um unsere Community sicher zu halten, bestätige bitte dein Geburtsdatum, bevor du deine Geschichte teilst.",
    ageGateMonth: "Monat",
    ageGateDay: "Tag",
    ageGateYear: "Jahr",
    ageGateConfirm: "Mit dem Fortfahren bestätigst du, dass diese Angaben korrekt sind.",
    ageGateContinue: "Weiter",
    ageGateSubmitting: "Wird geprüft…",
    ageGateError: "Bitte wähle ein gültiges Geburtsdatum.",
    ageGateBlockedTitle: "Danke, dass du es uns mitgeteilt hast",
    ageGateBlockedBody: "Du musst mindestens 13 Jahre alt sein, um hier eine Geschichte zu teilen. Wir hoffen, du kommst zurück, wenn du etwas älter bist!",
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
    stop: "Ferma",
    startOver: "Ricomincia",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} domande`,
    progressLost: "Il progresso verrà perso.",
    yesReset: "Sì, ripristina",
    cancelConfirm: "Annulla",
    recordingStatus: "Registrazione…",
    processingRecording: "Elaborazione registrazione…",
    noSpeechDetected: "Non siamo riusciti a sentirti bene. Riprova a registrare o digita la tua risposta.",
    noSoundLive: "Non stiamo sentendo nessun suono. Controlla il microfono, oppure fermati e digita la tua risposta.",
    transcriptHint: "Tocca il testo sopra per apportare modifiche, oppure premi Continua.",
    preferNotToSay: "Preferisco non dirlo",
    mapNudge: "Scegliere uno stato aggiunge il tuo viaggio alla Mappa del Viaggio.",
    ageGateTitle: "Prima di condividere",
    ageGateBody: "Per aiutare a mantenere sicura la nostra community, conferma la tua data di nascita prima di condividere la tua storia.",
    ageGateMonth: "Mese",
    ageGateDay: "Giorno",
    ageGateYear: "Anno",
    ageGateConfirm: "Continuando, confermi che questi dati sono corretti.",
    ageGateContinue: "Continua",
    ageGateSubmitting: "Verifica in corso…",
    ageGateError: "Seleziona una data di nascita valida.",
    ageGateBlockedTitle: "Grazie per avercelo detto",
    ageGateBlockedBody: "Devi avere almeno 13 anni per condividere una storia qui. Speriamo che tu torni a condividere quando sarai un po' più grande!",
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
    stop: "停止",
    startOver: "重新开始",
    progressText: (n) => `第 ${n}/${TOTAL_QUESTIONS} 题`,
    progressLost: "进度将会丢失。",
    yesReset: "是，重置",
    cancelConfirm: "取消",
    recordingStatus: "录音中…",
    processingRecording: "处理录音中…",
    noSpeechDetected: "我们听不清楚。请重新录音，或直接输入您的回答。",
    noSoundLive: "我们没有听到任何声音。请检查您的麦克风，或停止录音并输入您的回答。",
    transcriptHint: "点按上方文字进行修改，或点击继续。",
    preferNotToSay: "不愿透露",
    mapNudge: "选择一个州会将您的旅程添加到旅程地图上。",
    ageGateTitle: "分享前",
    ageGateBody: "为了帮助保障社区安全，请在分享您的故事前确认您的出生日期。",
    ageGateMonth: "月",
    ageGateDay: "日",
    ageGateYear: "年",
    ageGateConfirm: "继续即表示您确认此信息准确无误。",
    ageGateContinue: "继续",
    ageGateSubmitting: "正在检查…",
    ageGateError: "请选择有效的出生日期。",
    ageGateBlockedTitle: "感谢您的告知",
    ageGateBlockedBody: "您必须年满13岁才能在此分享故事。希望您年长一些后再回来分享！",
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
    stop: "停止",
    startOver: "最初からやり直す",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} 問`,
    progressLost: "進捗が失われます。",
    yesReset: "はい、リセット",
    cancelConfirm: "キャンセル",
    recordingStatus: "録音中…",
    processingRecording: "録音を処理中…",
    noSpeechDetected: "はっきりと聞き取れませんでした。もう一度録音するか、回答を入力してください。",
    noSoundLive: "音が聞こえません。マイクを確認するか、停止して回答を入力してください。",
    transcriptHint: "上のテキストをタップして変更するか、続けるを押してください。",
    preferNotToSay: "回答しない",
    mapNudge: "州を選択すると、あなたの旅がジャーニーマップに追加されます。",
    ageGateTitle: "共有する前に",
    ageGateBody: "コミュニティの安全を守るため、ストーリーを共有する前に生年月日をご確認ください。",
    ageGateMonth: "月",
    ageGateDay: "日",
    ageGateYear: "年",
    ageGateConfirm: "続行することで、この情報が正確であることを確認したものとします。",
    ageGateContinue: "続ける",
    ageGateSubmitting: "確認中…",
    ageGateError: "有効な生年月日を選択してください。",
    ageGateBlockedTitle: "教えてくれてありがとうございます",
    ageGateBlockedBody: "ここでストーリーを共有するには13歳以上である必要があります。もう少し大きくなったら、またぜひ共有しに来てください！",
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
    stop: "정지",
    startOver: "처음부터 다시",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} 질문`,
    progressLost: "진행 상황이 사라집니다.",
    yesReset: "예, 초기화",
    cancelConfirm: "취소",
    recordingStatus: "녹음 중…",
    processingRecording: "녹음 처리 중…",
    noSpeechDetected: "명확하게 들리지 않았습니다. 다시 녹음하거나 답변을 입력해 주세요.",
    noSoundLive: "소리가 들리지 않아요. 마이크를 확인하거나, 중지하고 답변을 입력해 주세요.",
    transcriptHint: "위 텍스트를 탭하여 수정하거나 계속을 누르세요.",
    preferNotToSay: "밝히지 않음",
    mapNudge: "주를 선택하면 여정이 여정 지도에 추가됩니다.",
    ageGateTitle: "공유하기 전에",
    ageGateBody: "커뮤니티의 안전을 위해 이야기를 공유하기 전에 생년월일을 확인해 주세요.",
    ageGateMonth: "월",
    ageGateDay: "일",
    ageGateYear: "년",
    ageGateConfirm: "계속 진행하면 이 정보가 정확함을 확인하는 것입니다.",
    ageGateContinue: "계속",
    ageGateSubmitting: "확인 중…",
    ageGateError: "유효한 생년월일을 선택해 주세요.",
    ageGateBlockedTitle: "알려주셔서 감사합니다",
    ageGateBlockedBody: "여기에서 이야기를 공유하려면 13세 이상이어야 합니다. 조금 더 자란 후에 다시 와서 공유해 주시길 바랍니다!",
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
    stop: "إيقاف",
    startOver: "البدء من جديد",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} أسئلة`,
    progressLost: "سيُفقد التقدم.",
    yesReset: "نعم، إعادة ضبط",
    cancelConfirm: "إلغاء",
    recordingStatus: "تسجيل…",
    processingRecording: "معالجة التسجيل…",
    noSpeechDetected: "لم نتمكن من سماعك بوضوح. حاول التسجيل مرة أخرى أو اكتب إجابتك.",
    noSoundLive: "لا نسمع أي صوت. تحقق من الميكروفون، أو أوقف التسجيل واكتب إجابتك.",
    transcriptHint: "اضغط على النص أعلاه لإجراء تغييرات، أو اضغط على متابعة.",
    preferNotToSay: "أفضل عدم الإفصاح",
    mapNudge: "اختيار ولاية يضيف رحلتك إلى خريطة الرحلة.",
    ageGateTitle: "قبل المشاركة",
    ageGateBody: "للمساعدة في الحفاظ على أمان مجتمعنا، يُرجى تأكيد تاريخ ميلادك قبل مشاركة قصتك.",
    ageGateMonth: "الشهر",
    ageGateDay: "اليوم",
    ageGateYear: "السنة",
    ageGateConfirm: "بالمتابعة، فإنك تؤكد أن هذه المعلومات دقيقة.",
    ageGateContinue: "متابعة",
    ageGateSubmitting: "جارٍ التحقق…",
    ageGateError: "يرجى اختيار تاريخ ميلاد صحيح.",
    ageGateBlockedTitle: "شكرًا لإخبارنا",
    ageGateBlockedBody: "يجب أن يكون عمرك 13 عامًا أو أكثر لمشاركة قصة هنا. نأمل أن تعود لمشاركة قصتك عندما تكبر قليلاً!",
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
    stop: "रोकें",
    startOver: "फिर से शुरू करें",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} प्रश्न`,
    progressLost: "प्रगति खो जाएगी।",
    yesReset: "हाँ, रीसेट करें",
    cancelConfirm: "रद्द करें",
    recordingStatus: "रिकॉर्डिंग…",
    processingRecording: "रिकॉर्डिंग प्रोसेस हो रही है…",
    noSpeechDetected: "हम आपको स्पष्ट रूप से नहीं सुन सके। दोबारा रिकॉर्ड करें या अपना उत्तर टाइप करें।",
    noSoundLive: "हमें कोई आवाज़ नहीं सुनाई दे रही। अपना माइक्रोफ़ोन जाँचें, या रोकें और अपना उत्तर टाइप करें।",
    transcriptHint: "बदलाव करने के लिए ऊपर दिए गए टेक्स्ट पर टैप करें, या जारी रखें दबाएँ।",
    preferNotToSay: "बताना नहीं चाहते",
    mapNudge: "राज्य चुनने से आपकी यात्रा जर्नी मैप में जुड़ जाती है।",
    ageGateTitle: "साझा करने से पहले",
    ageGateBody: "हमारे समुदाय को सुरक्षित रखने में मदद के लिए, कृपया अपनी कहानी साझा करने से पहले अपनी जन्मतिथि की पुष्टि करें।",
    ageGateMonth: "महीना",
    ageGateDay: "दिन",
    ageGateYear: "वर्ष",
    ageGateConfirm: "जारी रखकर, आप पुष्टि करते हैं कि यह जानकारी सही है।",
    ageGateContinue: "जारी रखें",
    ageGateSubmitting: "जाँच हो रही है…",
    ageGateError: "कृपया एक मान्य जन्मतिथि चुनें।",
    ageGateBlockedTitle: "हमें बताने के लिए धन्यवाद",
    ageGateBlockedBody: "यहाँ कहानी साझा करने के लिए आपकी उम्र 13 वर्ष या उससे अधिक होनी चाहिए। हमें उम्मीद है कि आप थोड़े बड़े होने पर वापस आकर साझा करेंगे!",
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
    stop: "Стоп",
    startOver: "Начать заново",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} вопросов`,
    progressLost: "Прогресс будет потерян.",
    yesReset: "Да, сбросить",
    cancelConfirm: "Отмена",
    recordingStatus: "Запись…",
    processingRecording: "Обработка записи…",
    noSpeechDetected: "Нам не удалось чётко расслышать. Попробуйте записать снова или напечатайте ответ.",
    noSoundLive: "Мы не слышим звука. Проверьте микрофон или остановите запись и напечатайте ответ.",
    transcriptHint: "Нажмите на текст выше, чтобы внести изменения, или нажмите «Продолжить».",
    preferNotToSay: "Предпочитаю не указывать",
    mapNudge: "Выбор штата добавляет ваше путешествие на Карту путешествий.",
    ageGateTitle: "Прежде чем поделиться",
    ageGateBody: "Чтобы наше сообщество оставалось безопасным, подтвердите, пожалуйста, дату рождения перед публикацией своей истории.",
    ageGateMonth: "Месяц",
    ageGateDay: "День",
    ageGateYear: "Год",
    ageGateConfirm: "Продолжая, вы подтверждаете точность этих данных.",
    ageGateContinue: "Продолжить",
    ageGateSubmitting: "Проверка…",
    ageGateError: "Пожалуйста, выберите корректную дату рождения.",
    ageGateBlockedTitle: "Спасибо, что сообщили нам",
    ageGateBlockedBody: "Чтобы делиться историей здесь, вам должно быть не менее 13 лет. Надеемся, вы вернётесь, когда станете немного старше!",
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
    stop: "Зупинити",
    startOver: "Почати знову",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} питань`,
    progressLost: "Прогрес буде втрачено.",
    yesReset: "Так, скинути",
    cancelConfirm: "Скасувати",
    recordingStatus: "Запис…",
    processingRecording: "Обробка запису…",
    noSpeechDetected: "Нам не вдалося чітко почути. Спробуйте записати знову або надрукуйте відповідь.",
    noSoundLive: "Ми не чуємо жодного звуку. Перевірте мікрофон або зупиніть запис і надрукуйте відповідь.",
    transcriptHint: "Торкніться тексту вище, щоб внести зміни, або натисніть «Продовжити».",
    preferNotToSay: "Не бажаю вказувати",
    mapNudge: "Вибір штату додає вашу подорож на Карту подорожей.",
    ageGateTitle: "Перш ніж поділитися",
    ageGateBody: "Щоб наша спільнота залишалася безпечною, підтвердіть, будь ласка, дату народження перед публікацією своєї історії.",
    ageGateMonth: "Місяць",
    ageGateDay: "День",
    ageGateYear: "Рік",
    ageGateConfirm: "Продовжуючи, ви підтверджуєте точність цієї інформації.",
    ageGateContinue: "Продовжити",
    ageGateSubmitting: "Перевірка…",
    ageGateError: "Будь ласка, виберіть коректну дату народження.",
    ageGateBlockedTitle: "Дякуємо, що повідомили нам",
    ageGateBlockedBody: "Щоб ділитися історією тут, вам має бути щонайменше 13 років. Сподіваємося, ви повернетеся, коли станете трохи старшими!",
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
    stop: "Διακοπή",
    startOver: "Ξεκινήστε από την αρχή",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} ερωτήσεις`,
    progressLost: "Η πρόοδος θα χαθεί.",
    yesReset: "Ναι, επαναφορά",
    cancelConfirm: "Ακύρωση",
    recordingStatus: "Ηχογράφηση…",
    processingRecording: "Επεξεργασία ηχογράφησης…",
    noSpeechDetected: "Δεν μπορέσαμε να σας ακούσουμε καθαρά. Δοκιμάστε να ηχογραφήσετε ξανά ή πληκτρολογήστε την απάντησή σας.",
    noSoundLive: "Δεν ακούμε κανέναν ήχο. Ελέγξτε το μικρόφωνό σας ή σταματήστε και πληκτρολογήστε την απάντησή σας.",
    transcriptHint: "Πατήστε το κείμενο παραπάνω για να κάνετε αλλαγές, ή πατήστε Συνέχεια.",
    preferNotToSay: "Προτιμώ να μην απαντήσω",
    mapNudge: "Η επιλογή πολιτείας προσθέτει το ταξίδι σας στον Χάρτη Ταξιδιού.",
    ageGateTitle: "Πριν μοιραστείτε",
    ageGateBody: "Για να διατηρήσουμε την κοινότητά μας ασφαλή, επιβεβαιώστε την ημερομηνία γέννησής σας πριν μοιραστείτε την ιστορία σας.",
    ageGateMonth: "Μήνας",
    ageGateDay: "Ημέρα",
    ageGateYear: "Έτος",
    ageGateConfirm: "Συνεχίζοντας, επιβεβαιώνετε ότι αυτές οι πληροφορίες είναι ακριβείς.",
    ageGateContinue: "Συνέχεια",
    ageGateSubmitting: "Έλεγχος…",
    ageGateError: "Επιλέξτε μια έγκυρη ημερομηνία γέννησης.",
    ageGateBlockedTitle: "Σας ευχαριστούμε που μας ενημερώσατε",
    ageGateBlockedBody: "Πρέπει να είστε τουλάχιστον 13 ετών για να μοιραστείτε μια ιστορία εδώ. Ελπίζουμε να επιστρέψετε όταν είστε λίγο μεγαλύτεροι!",
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
    stop: "Dừng",
    startOver: "Bắt đầu lại",
    progressText: (n) => `${n}/${TOTAL_QUESTIONS} câu hỏi`,
    progressLost: "Tiến trình sẽ bị mất.",
    yesReset: "Có, đặt lại",
    cancelConfirm: "Hủy",
    recordingStatus: "Đang ghi…",
    processingRecording: "Đang xử lý ghi âm…",
    noSpeechDetected: "Chúng tôi không nghe rõ. Hãy thử ghi âm lại hoặc nhập câu trả lời của bạn.",
    noSoundLive: "Chúng tôi không nghe thấy âm thanh. Kiểm tra micrô của bạn, hoặc dừng lại và nhập câu trả lời.",
    transcriptHint: "Chạm vào văn bản ở trên để chỉnh sửa, hoặc nhấn Tiếp tục.",
    preferNotToSay: "Không muốn tiết lộ",
    mapNudge: "Chọn một bang sẽ thêm hành trình của bạn vào Bản đồ Hành trình.",
    ageGateTitle: "Trước khi chia sẻ",
    ageGateBody: "Để giúp cộng đồng của chúng tôi luôn an toàn, vui lòng xác nhận ngày sinh của bạn trước khi chia sẻ câu chuyện.",
    ageGateMonth: "Tháng",
    ageGateDay: "Ngày",
    ageGateYear: "Năm",
    ageGateConfirm: "Khi tiếp tục, bạn xác nhận thông tin này là chính xác.",
    ageGateContinue: "Tiếp tục",
    ageGateSubmitting: "Đang kiểm tra…",
    ageGateError: "Vui lòng chọn ngày sinh hợp lệ.",
    ageGateBlockedTitle: "Cảm ơn bạn đã cho chúng tôi biết",
    ageGateBlockedBody: "Bạn phải từ 13 tuổi trở lên để chia sẻ câu chuyện tại đây. Chúng tôi mong bạn quay lại chia sẻ khi lớn hơn một chút!",
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
  onAudioBlobsChange?: (blobs: InterviewAudioBlob[]) => void;
  onAudioUrlsChange?: (urls: InterviewAudioUrl[]) => void;
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
  const [phase, setPhase] = useState<"interview" | "generating" | "done" | "age_check">(
    initialState?.phase ?? "interview"
  );
  const [draftStory, setDraftStory] = useState("");
  const [editedStory, setEditedStory] = useState(initialState?.editedStory ?? "");
  const [interviewComplete, setInterviewComplete] = useState(
    initialState?.interviewComplete ?? false
  );
  const [startingAgeVerification, setStartingAgeVerification] = useState(false);
  const [ageVerificationError, setAgeVerificationError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
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
  const interviewAudioBlobsRef = useRef<InterviewAudioBlob[]>([]);
  const interviewAudioUrlsRef = useRef<InterviewAudioUrl[]>([]);
  const [editRecState, setEditRecState] = useState<"idle" | "recording" | "transcribing">("idle");
  const interviewRecStateRef = useRef(interviewRecState);
  useEffect(() => {
    interviewRecStateRef.current = interviewRecState;
  }, [interviewRecState]);
  const editRecStateRef = useRef(editRecState);
  useEffect(() => {
    editRecStateRef.current = editRecState;
  }, [editRecState]);
  const interviewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startOverGenerationRef = useRef(0);
  const ttsHasPlayedRef = useRef(false);
  const maxVolumeRef = useRef<number>(0);
  const hasDetectedSoundRef = useRef(false);
  const recordingElapsedRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [noSpeechMsg, setNoSpeechMsg] = useState("");
  const [showTranscriptHint, setShowTranscriptHint] = useState(false);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const speak = useCallback(async (text: string, index: number) => {
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
    setSpeakingIndex(null);
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
      if (interviewRecStateRef.current === "recording" || editRecStateRef.current === "recording") {
        URL.revokeObjectURL(url);
        return;
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      setSpeakingIndex(index);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsHasPlayedRef.current = true;
        setSpeakingIndex(prev => (prev === index ? null : prev));
      };
      audio.play().catch(() => {});
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (!controller.signal.aborted) setTtsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function stopSpeaking() {
    if (speakAbortRef.current) {
      speakAbortRef.current.abort();
      speakAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setTtsLoading(false);
    setSpeakingIndex(null);
  }

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    const lastIndex = messages.length - 1;
    if (lastIndex <= lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    // Echo cancellation is disabled for interview recordings so TTS audio
    // would bleed into the recording — skip auto-speak while recording.
    if (interviewRecStateRef.current === "recording" || editRecStateRef.current === "recording") return;
    speak(lastMsg.content, lastIndex);
  }, [messages, speak]);

  // Re-speak the current assistant message when language changes, and reset
  // the index guard so the incoming translated opening can also auto-speak.
  useEffect(() => {
    if (prevLangRef.current === language) return;
    prevLangRef.current = language;
    lastSpokenIndexRef.current = -1;
    let lastAssistantIndex = -1;
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      if (messages[idx].role === "assistant") {
        lastAssistantIndex = idx;
        break;
      }
    }
    if (lastAssistantIndex >= 0) speak(messages[lastAssistantIndex].content, lastAssistantIndex);
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
      setSpeakingIndex(null);
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
      setSpeakingIndex(null);
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

  function upsertAudioBlob(answerIndex: number, blob: Blob) {
    const existingIdx = interviewAudioBlobsRef.current.findIndex(e => e.answerIndex === answerIndex);
    interviewAudioBlobsRef.current =
      existingIdx >= 0
        ? interviewAudioBlobsRef.current.map((e, i) => (i === existingIdx ? { answerIndex, blob } : e))
        : [...interviewAudioBlobsRef.current, { answerIndex, blob }];
    onAudioBlobsChange?.(interviewAudioBlobsRef.current);
  }

  function upsertAudioUrl(answerIndex: number, url: string) {
    const existingIdx = interviewAudioUrlsRef.current.findIndex(e => e.answerIndex === answerIndex);
    interviewAudioUrlsRef.current =
      existingIdx >= 0
        ? interviewAudioUrlsRef.current.map((e, i) => (i === existingIdx ? { answerIndex, url } : e))
        : [...interviewAudioUrlsRef.current, { answerIndex, url }];
    onAudioUrlsChange?.(interviewAudioUrlsRef.current);
  }

  function removeAudioForAnswer(answerIndex: number) {
    interviewAudioBlobsRef.current = interviewAudioBlobsRef.current.filter(e => e.answerIndex !== answerIndex);
    onAudioBlobsChange?.(interviewAudioBlobsRef.current);
    interviewAudioUrlsRef.current = interviewAudioUrlsRef.current.filter(e => e.answerIndex !== answerIndex);
    onAudioUrlsChange?.(interviewAudioUrlsRef.current);
  }

  async function startInterviewRecording(editTarget?: { answerIndex: number }) {
    const recordingGeneration = startOverGenerationRef.current;
    if (speakAbortRef.current) {
      speakAbortRef.current.abort();
      speakAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setTtsLoading(false);
    setSpeakingIndex(null);
    const isEdit = !!editTarget;
    const answerIndex = editTarget ? editTarget.answerIndex : messages.filter(m => m.role === "user").length;
    setNoSpeechMsg("");
    maxVolumeRef.current = 0;
    hasDetectedSoundRef.current = false;
    recordingElapsedRef.current = 0;
    if (!isEdit) {
      setShowTranscriptHint(false);
      if (interviewAudioBlobUrl) {
        URL.revokeObjectURL(interviewAudioBlobUrl);
        setInterviewAudioBlobUrl(null);
      }
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
        upsertAudioBlob(answerIndex, blob);
        stream.getTracks().forEach((t) => t.stop());

        const url = URL.createObjectURL(blob);
        if (isEdit) {
          URL.revokeObjectURL(url);
        } else {
          setInterviewAudioBlobUrl(url);
        }

        // Client-side silence pre-check: RMS threshold of 3 (on a 0–128 scale).
        // Genuine silence keeps all samples near 128, giving RMS ~0–1. Quiet
        // background noise might reach ~2. Threshold 3 catches truly silent
        // recordings while letting even soft speech (typically RMS 10+) through.
        if (maxVolumeRef.current < 3) {
          setNoSpeechMsg(prev => (prev === ui.noSoundLive ? prev : ui.noSpeechDetected));
          if (isEdit) setEditRecState("idle");
          else setInterviewRecState("stopped");
          return;
        }

        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");
          if (language) fd.append("language", language);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (recordingGeneration !== startOverGenerationRef.current) {
            // Start Over ran while this transcription was in flight; discard the stale response.
          } else if (data.no_speech || !data.text) {
            setNoSpeechMsg(ui.noSpeechDetected);
          } else {
            setNoSpeechMsg("");
            if (isEdit) {
              setEditingText(data.text);
            } else {
              setInput(data.text);
              setShowTranscriptHint(true);
            }
            if (data.audio_url) {
              upsertAudioUrl(answerIndex, data.audio_url);
            }
          }
        } catch {
          // transcription failure is non-fatal — user can type manually
        } finally {
          if (isEdit) setEditRecState("idle");
          else setInterviewRecState("stopped");
        }
      };

      setInterviewRecordingSeconds(0);
      interviewTimerRef.current = setInterval(() => setInterviewRecordingSeconds(s => s + 1), 1000);
      mr.start(250);
      interviewRecorderRef.current = mr;
      if (isEdit) setEditRecState("recording");
      else setInterviewRecState("recording");
    } catch (err) {
      console.log("getUserMedia error:", err);
    }
  }

  function stopInterviewRecording() {
    if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    if (editRecState === "recording") setEditRecState("transcribing");
    else setInterviewRecState("transcribing");
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

  async function continueInterview(nextMessages: Message[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, phase: "interview", language }),
      });

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

      // A real-time age signal was detected mid-interview — stop asking
      // questions, preserve every answer already given, and route to a
      // Veriff age check instead of generating the next question.
      if (data.ageGate === "under_13") {
        setPhase("age_check");
        onSave?.({
          messages: nextMessages,
          phase: "age_check",
          editedStory,
          interviewComplete,
        });
        return;
      }

      const finalText: string = data.text ?? "";
      const updatedMessages: Message[] = [
        ...nextMessages,
        { role: "assistant", content: finalText },
      ];
      setMessages(updatedMessages);

      const answeredCount = nextMessages.filter(m => m.role === "user").length;
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
      setMessages([...nextMessages, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  // Resume-on-mount: if a draft was reloaded (e.g. returning from a Veriff
  // age check) whose last message is an unanswered user turn, the interview
  // never got to generate that next question — fetch it now instead of
  // sitting there silently.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (phase !== "interview") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    resumedRef.current = true;
    continueInterview(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startAgeVerification() {
    setStartingAgeVerification(true);
    setAgeVerificationError("");
    try {
      const res = await fetch("/api/veriff-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "interview_age_check" }),
      });
      const data = await res.json();
      if (data.alreadyVerified) {
        // Already confirmed 18+ by a prior verification — no need to redo it.
        setPhase("interview");
        onSave?.({ messages, phase: "interview", editedStory, interviewComplete });
        return;
      }
      if (!res.ok || !data.sessionUrl) {
        throw new Error(data.error ?? "Failed to start verification");
      }
      window.location.href = data.sessionUrl;
    } catch (err) {
      setAgeVerificationError(err instanceof Error ? err.message : "Something went wrong");
      setStartingAgeVerification(false);
    }
  }

  async function sendMessage(overrideText?: string) {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || loading) return;

    if (interviewRecState === "recording") stopInterviewRecording();
    if (interviewRecState === "stopped") clearInterviewRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeakingIndex(null);

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setShowTranscriptHint(false);

    await continueInterview(newMessages);
    inputRef.current?.focus({ preventScroll: true });
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

  function commitEdit(content: string, fallback: string) {
    if (editingIndex === null) return;
    const idx = editingIndex;
    const finalContent = content.trim() || fallback;
    setMessages(prev => [
      ...prev.map((m, i) => (i === idx ? { ...m, content: finalContent } : m)),
      { role: "assistant", content: "Got it — I've noted your updated answer and will use it when writing your story." },
    ]);
    setEditingIndex(null);
    setEditingText("");
  }

  function saveEdit() {
    if (editingIndex === null) return;
    commitEdit(editingText, messagesRef.current[editingIndex].content);
  }

  function deleteAnswer() {
    if (editingIndex === null) return;
    const answerIndex = messagesRef.current.slice(0, editingIndex).filter(m => m.role === "user").length;
    removeAudioForAnswer(answerIndex);
    commitEdit("(skipped)", "(skipped)");
  }

  function startOver() {
    startOverGenerationRef.current += 1;
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
    setSpeakingIndex(null);
    ttsHasPlayedRef.current = false;
    lastSpokenIndexRef.current = -1;
    const freshMessages: Message[] = [{ role: "assistant", content: OPENING_MESSAGE }];
    setMessages(freshMessages);
    setInput("");
    setShowTranscriptHint(false);
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
  const displayQuestion = Math.min(userMessageCount + 1, TOTAL_QUESTIONS);

  if (phase === "age_check") {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-navy/10 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">🪪</div>
          <h2 className="text-xl font-bold text-navy mb-3">Just a Quick Check</h2>
          <p className="text-navy/60 leading-relaxed mb-2">
            We need to verify your age before continuing.
          </p>
          <p className="text-navy/40 text-sm mb-8 leading-relaxed">
            Your answers so far are saved — once this is confirmed, you'll pick up right where you left off.
          </p>
          {ageVerificationError && (
            <p className="text-red-500 text-sm mb-4">{ageVerificationError}</p>
          )}
          <button
            type="button"
            onClick={startAgeVerification}
            disabled={startingAgeVerification}
            className="w-full bg-gold text-navy font-semibold py-3 px-6 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {startingAgeVerification ? "Starting verification…" : "Verify My Age"}
          </button>
          <p className="text-xs text-navy/40 mt-6">
            Powered by Veriff · Your data is encrypted and secure
          </p>
        </div>
      </div>
    );
  }

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
          {ui.progressText(displayQuestion)}
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
                {editRecState === "recording" && (
                  <div className="flex items-center gap-2 text-xs text-red-500 font-semibold px-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                    {ui.recordingStatus}
                  </div>
                )}
                {editRecState === "transcribing" && (
                  <div className="flex items-center gap-2 text-xs text-navy/50 px-1">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {ui.processingRecording}
                  </div>
                )}
                <div className="flex gap-2 justify-between items-center">
                  <button
                    type="button"
                    onClick={deleteAnswer}
                    disabled={editRecState !== "idle"}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40"
                  >
                    Delete answer
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        editRecState === "recording"
                          ? stopInterviewRecording()
                          : startInterviewRecording({ answerIndex: messages.slice(0, i).filter(m => m.role === "user").length })
                      }
                      disabled={editRecState === "transcribing"}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gold/40 text-gold bg-gold/8 hover:bg-gold/15 transition-colors disabled:opacity-40"
                    >
                      {editRecState === "recording" ? "⏹ Stop" : "🎤 Re-record"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={editRecState !== "idle"}
                      className="text-xs px-3 py-1.5 rounded-lg border border-navy/20 text-navy/60 hover:text-navy/80 transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={editRecState !== "idle"}
                      className="text-xs px-3 py-1.5 rounded-lg bg-navy text-cream hover:bg-navy/90 transition-colors disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : msg.role === "user" ? (
              <div className="flex flex-col items-end gap-1 max-w-[82%]">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-navy text-cream rounded-tr-sm">
                  {msg.content}
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(i, msg.content)}
                  className="flex items-center gap-1.5 border border-navy/25 text-navy bg-white hover:bg-navy/5 transition-colors rounded-lg px-3 py-1.5 text-xs"
                  aria-label="Edit this answer"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit answer
                </button>
              </div>
            ) : (
              <div className="max-w-[82%] flex flex-col gap-1">
                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap bg-white border border-navy/8 text-navy/80 rounded-tl-sm shadow-sm">
                  {msg.content}
                </div>
                <button
                  type="button"
                  onClick={() => (i === speakingIndex ? stopSpeaking() : speak(msg.content, i))}
                  disabled={ttsLoading || interviewRecState === "recording" || editRecState === "recording"}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gold border border-gold/40 bg-gold/8 hover:bg-gold/15 transition-colors px-2.5 py-1 rounded-full self-start disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={i === speakingIndex ? "Stop reading" : "Read aloud"}
                >
                  {ttsLoading ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Loading…
                    </>
                  ) : i === speakingIndex ? (
                    <>⏹ {ui.stop}</>
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
              <audio controls src={interviewAudioBlobUrl} preload="metadata" onPlay={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } if (typeof window !== "undefined") window.speechSynthesis?.cancel(); setSpeakingIndex(null); }} className="h-8 flex-1 min-w-0" />
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
              if (showTranscriptHint && e.target.value === "") setShowTranscriptHint(false);
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
                onClick={() => startInterviewRecording()}
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
              sendMessage('(skipped)');
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
            onClick={() => sendMessage()}
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
        {showTranscriptHint && (
          <p className="text-xs text-navy/50 px-1">{ui.transcriptHint}</p>
        )}
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

type AgeStatus = {
  attested: boolean;
  ageBand: string | null;
  requiresVerification: boolean;
  verified: boolean;
};

function AgeAttestationPanel({
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

export default function SharePage() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [ageStatus, setAgeStatus] = useState<AgeStatus | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/share");
      return;
    }
    fetch("/api/age-status")
      .then((r) => r.json())
      .then((data) => {
        setAgeStatus({
          attested: !!data.attested,
          ageBand: data.ageBand ?? null,
          requiresVerification: !!data.requiresVerification,
          verified: !!data.verified,
        });
      })
      .catch(() => {
        // If check fails, allow through to avoid blocking legitimate users
        setAgeStatus({ attested: true, ageBand: null, requiresVerification: false, verified: false });
      });
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!ageStatus) return;
    if (ageStatus.attested && ageStatus.requiresVerification && !ageStatus.verified) {
      router.push("/verify");
    }
  }, [ageStatus, router]);

  const [mode, setMode] = useState<"form" | "interview">("interview");
  const [form, setForm] = useState<FormState>(EMPTY);
  const ui = getUIStrings(form.original_language);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [highlightUseStory, setHighlightUseStory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; country?: string; story?: string; us_state?: string }>({});

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

  const [interviewAudioBlobs, setInterviewAudioBlobs] = useState<InterviewAudioBlob[]>([]);
  const [interviewAudioUrls, setInterviewAudioUrls] = useState<InterviewAudioUrl[]>([]);

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
    if (!savedDraft?.autoResume) return;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed.autoResume;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(parsed));
      }
    } catch {
      // ignore storage errors
    }

    continueDraft();
  }, [savedDraft]);

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

  if (!ageStatus) {
    return null;
  }

  if (!ageStatus.attested) {
    return (
      <AgeAttestationPanel
        ui={ui}
        onAttested={(ageBand) =>
          setAgeStatus({ attested: true, ageBand, requiresVerification: false, verified: false })
        }
      />
    );
  }

  if (ageStatus.requiresVerification && !ageStatus.verified) {
    return null;
  }

  function handleInterviewAudioBlobs(blobs: InterviewAudioBlob[]) {
    setInterviewAudioBlobs(blobs);
  }

  function handleInterviewAudioUrls(urls: InterviewAudioUrl[]) {
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

    const errors: { name?: string; country?: string; story?: string; us_state?: string } = {};
    if (!form.name.trim()) errors.name = "Please enter your name";
    if (!form.country.trim() || !COUNTRIES.includes(form.country)) {
      errors.country = "Please select your country of origin from the list";
    }
    if (!form.us_state_opt_out && !form.us_state.trim()) {
      errors.us_state = `Please select a state, or check "${ui.preferNotToSay}"`;
    }
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
      else if (errors.us_state) document.getElementById("us_state")?.focus();
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

    let interview_audio_urls: string[] = [];
    if (interviewAudioBlobs.length > 0) {
      const sortedAudio = [...interviewAudioBlobs].sort((a, b) => a.answerIndex - b.answerIndex);
      const uploadResults = await Promise.all(
        sortedAudio.map(async ({ blob }, idx) => {
          const path = `interview/${Date.now()}_${Math.random().toString(36).slice(2)}_${idx}.webm`;
          const { data: upload, error: uploadErr } = await supabase.storage
            .from("story-audio")
            .upload(path, blob, { contentType: "audio/webm" });
          if (uploadErr || !upload) return null;
          const { data: urlData } = supabase.storage
            .from("story-audio")
            .getPublicUrl(upload.path);
          return urlData.publicUrl;
        })
      );
      interview_audio_urls = uploadResults.filter((u): u is string => !!u);
    }

    const res = await fetch("/api/submit-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        country: form.country,
        year_arrived: form.year_arrived ? parseInt(form.year_arrived, 10) : null,
        us_state: form.us_state_opt_out ? null : (form.us_state || null),
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
              <CountryCombobox
                id="country"
                value={form.country}
                onChange={(v) => {
                  setForm(prev => ({ ...prev, country: v }));
                  setFieldErrors(prev => ({ ...prev, country: undefined }));
                }}
                hasError={!!fieldErrors.country}
                placeholder="Where did you come from?"
              />
              {fieldErrors.country && <p className="text-xs text-red-500">{fieldErrors.country}</p>}
            </Field>

            <Field label="US State You Settled In" htmlFor="us_state" hint={ui.mapNudge}>
              <select
                id="us_state"
                value={form.us_state}
                disabled={form.us_state_opt_out}
                onChange={e => {
                  set("us_state")(e);
                  setFieldErrors(prev => ({ ...prev, us_state: undefined }));
                  if (e.target.value) setForm(prev => ({ ...prev, us_state_opt_out: false }));
                }}
                className={`${INPUT}${form.us_state_opt_out ? " opacity-50 cursor-not-allowed bg-navy/5" : ""}${fieldErrors.us_state ? " border-red-400 focus:ring-red-400" : ""}`}
              >
                <option value="" disabled>Select a state…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 mt-2 text-sm font-medium text-navy/80 bg-navy/5 border border-navy/10 rounded-lg px-3 py-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.us_state_opt_out}
                  onChange={e => {
                    const checked = e.target.checked;
                    setForm(prev => ({ ...prev, us_state_opt_out: checked, us_state: checked ? "" : prev.us_state }));
                    if (checked) setFieldErrors(prev => ({ ...prev, us_state: undefined }));
                  }}
                  className="w-4 h-4 rounded border-navy/30 accent-gold focus:ring-2 focus:ring-gold"
                />
                {ui.preferNotToSay}
              </label>
              {fieldErrors.us_state && <p className="text-xs text-red-500">{fieldErrors.us_state}</p>}
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
