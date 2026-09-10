'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';

type Layer = 0 | 1 | 2 | 3;

interface Organ {
  id: string;
  path: string;
  color: string;
  hoverColor: string;
  labelX: number;
  labelY: number;
  nameEn: string;
  nameNe: string;
  infoKey: 'heart' | 'liver' | 'lungs' | 'stomach' | 'intestine' | 'kidney' | 'bladder';
}

const ORGANS: Organ[] = [
  {
    id: 'heart', nameEn: 'Heart', nameNe: 'मुटु',
    path: 'M 300 185 C 290 170 270 168 270 185 C 270 198 300 215 300 215 C 300 215 330 198 330 185 C 330 168 310 170 300 185 Z',
    color: '#ef4444', hoverColor: '#dc2626', labelX: 300, labelY: 225,
    infoKey: 'heart',
  },
  {
    id: 'liver', nameEn: 'Liver', nameNe: 'कलेजो',
    path: 'M 270 230 Q 260 225 255 235 Q 250 250 260 262 Q 280 270 310 265 Q 330 260 325 245 Q 320 230 300 228 Z',
    color: '#b45309', hoverColor: '#92400e', labelX: 285, labelY: 280,
    infoKey: 'liver',
  },
  {
    id: 'lungs', nameEn: 'Lungs', nameNe: 'फोक्सो',
    path: 'M 265 188 Q 250 185 248 200 Q 246 215 258 220 Q 272 225 278 215 Q 282 205 275 195 Z M 335 188 Q 350 185 352 200 Q 354 215 342 220 Q 328 225 322 215 Q 318 205 325 195 Z',
    color: '#f97316', hoverColor: '#ea580c', labelX: 300, labelY: 175,
    infoKey: 'lungs',
  },
  {
    id: 'stomach', nameEn: 'Stomach', nameNe: 'पेट',
    path: 'M 275 268 Q 262 268 258 280 Q 254 295 265 305 Q 278 312 295 308 Q 308 304 310 290 Q 312 276 300 270 Z',
    color: '#8b5cf6', hoverColor: '#7c3aed', labelX: 258, labelY: 315,
    infoKey: 'stomach',
  },
  {
    id: 'intestine', nameEn: 'Small Intestine', nameNe: 'सानो आन्द्रा',
    path: 'M 295 305 Q 315 295 330 310 Q 345 325 335 342 Q 322 355 305 350 Q 288 345 285 330 Q 285 318 295 315 Z M 310 348 Q 330 348 340 360 Q 348 372 338 380 Q 325 385 308 380 Q 295 373 295 360 Z',
    color: '#6366f1', hoverColor: '#4f46e5', labelX: 345, labelY: 340,
    infoKey: 'intestine',
  },
  {
    id: 'kidney', nameEn: 'Kidneys', nameNe: 'मिर्गौला',
    path: 'M 248 295 Q 238 290 235 302 Q 232 315 240 322 Q 250 328 258 320 Q 265 313 260 300 Z M 352 295 Q 362 290 365 302 Q 368 315 360 322 Q 350 328 342 320 Q 335 313 340 300 Z',
    color: '#7c3aed', hoverColor: '#6d28d9', labelX: 240, labelY: 335,
    infoKey: 'kidney',
  },
  {
    id: 'bladder', nameEn: 'Urinary Bladder', nameNe: 'पिसाब थैली',
    path: 'M 288 372 Q 278 368 275 380 Q 272 392 282 400 Q 295 406 312 402 Q 324 396 322 383 Q 320 370 308 368 Z',
    color: '#0891b2', hoverColor: '#0e7490', labelX: 298, labelY: 414,
    infoKey: 'bladder',
  },
];

const QUIZ_ORGANS = ['heart', 'liver', 'lungs', 'stomach', 'intestine', 'kidney', 'bladder'];

export default function FrogAnatomyLab() {
  const t = useT();
  const { completeExperiment } = useStore();
  const locale = useStore((s) => s.locale);

  const [layer, setLayer]           = useState<Layer>(0);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);
  const [quizMode, setQuizMode]     = useState(false);
  const [quizOrgan, setQuizOrgan]   = useState<string>(QUIZ_ORGANS[0]);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizScore, setQuizScore]   = useState({ correct: 0, total: 0 });
  const [explored, setExplored]     = useState<string[]>([]);
  const [isDone, setIsDone]         = useState(false);
  const quizTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (quizTimer.current !== null) clearTimeout(quizTimer.current);
  }, []);

  const selectedOrgan = ORGANS.find((o) => o.id === selected);

  const LAYER_LABELS = [
    t('frog.layer.external'),
    t('frog.layer.skin'),
    t('frog.layer.muscles'),
    t('frog.layer.organs'),
  ];

  const handleLayerNext = () => {
    if (layer < 3) setLayer((l) => (l + 1) as Layer);
  };

  const stopQuiz = () => {
    if (quizTimer.current !== null) clearTimeout(quizTimer.current);
    quizTimer.current = null;
    setQuizMode(false);
    setQuizResult(null);
    setSelected(null);
    setHovered(null);
  };

  const startQuiz = () => {
    stopQuiz();
    const randomOrgan = QUIZ_ORGANS[Math.floor(Math.random() * QUIZ_ORGANS.length)];
    setQuizOrgan(randomOrgan);
    setQuizScore({ correct: 0, total: 0 });
    setQuizMode(true);
    setLayer(3);
  };

  const handleQuizAnswer = (organId: string) => {
    // Lock synchronously so rapid clicks cannot score or schedule twice.
    if (!quizMode || quizTimer.current !== null) return;
    const correct = organId === quizOrgan;
    setQuizResult(correct ? 'correct' : 'wrong');
    setQuizScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    quizTimer.current = setTimeout(() => {
      if (correct) {
        const next = QUIZ_ORGANS[Math.floor(Math.random() * QUIZ_ORGANS.length)];
        setQuizOrgan(next);
      }
      setQuizResult(null);
      quizTimer.current = null;
    }, 1200);
  };

  const handleOrganSelect = (organId: string) => {
    if (quizMode) {
      handleQuizAnswer(organId);
      return;
    }
    setSelected(selected === organId ? null : organId);
    if (explored.includes(organId)) return;
    const nextExplored = [...explored, organId];
    setExplored(nextExplored);
    if (nextExplored.length === ORGANS.length && !isDone) {
      completeExperiment('frog-anatomy', 100);
      setIsDone(true);
    }
  };

  const resetLab = () => {
    stopQuiz();
    setLayer(0);
    setQuizOrgan(QUIZ_ORGANS[0]);
    setQuizScore({ correct: 0, total: 0 });
    setExplored([]);
    setIsDone(false);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-64px)] lg:overflow-hidden">

      {/* ===================== FROG SVG ===================== */}
      <div className="relative min-w-0 shrink-0 lg:flex-1 lg:min-h-0 bg-gradient-to-b from-emerald-950 to-green-900 overflow-hidden">

        <Link href="/lab" className="absolute top-3 left-3 z-10 flex items-center gap-1 text-xs text-emerald-400 hover:text-white bg-emerald-900/80 rounded-full px-2.5 py-1.5 backdrop-blur">
          <ChevronLeft className="h-3 w-3" /> Back
        </Link>

        {/* Layer indicator */}
        <div className="absolute top-14 inset-x-3 z-10 flex flex-wrap justify-center items-center gap-2">
          {LAYER_LABELS.map((label, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${layer === i ? 'bg-emerald-500 text-white' : layer > i ? 'bg-emerald-900/60 text-emerald-500' : 'bg-emerald-900/40 text-emerald-700'}`}>
              {layer > i && <span>✓</span>}
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Frog SVG */}
        <svg viewBox="160 120 280 340" role="group" aria-label={t('frog.title')} className="block w-full h-[460px] sm:h-[520px] lg:h-full pt-28 pb-4">
          {/* === LAYER 0: External view === */}
          <g opacity={layer >= 0 ? 1 : 0}>
            {/* Frog body silhouette */}
            <ellipse cx="300" cy="300" rx="95" ry="120" fill={layer < 1 ? '#4ade80' : 'none'} />
            {/* Head */}
            <ellipse cx="300" cy="195" rx="65" ry="55" fill={layer < 1 ? '#4ade80' : 'none'} />
            {/* Eyes */}
            <circle cx="268" cy="170" r="16" fill={layer < 1 ? '#86efac' : 'none'} />
            <circle cx="332" cy="170" r="16" fill={layer < 1 ? '#86efac' : 'none'} />
            <circle cx="270" cy="170" r="9" fill="#1f2937" />
            <circle cx="334" cy="170" r="9" fill="#1f2937" />
            <circle cx="268" cy="168" r="3" fill="white" />
            <circle cx="332" cy="168" r="3" fill="white" />
            {/* Skin spots */}
            {layer < 1 && [
              [288, 230, 8], [315, 245, 6], [275, 270, 7], [325, 280, 5],
              [290, 315, 9], [320, 320, 6], [278, 350, 7],
            ].map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill="#22c55e" />
            ))}
            {/* Legs */}
            {layer < 1 && (
              <>
                <path d="M 205 310 Q 185 330 180 350 Q 175 370 190 375 Q 200 377 205 360 Q 208 345 215 335 Z" fill="#4ade80" />
                <path d="M 395 310 Q 415 330 420 350 Q 425 370 410 375 Q 400 377 395 360 Q 392 345 385 335 Z" fill="#4ade80" />
                <path d="M 210 380 Q 180 395 168 410 Q 162 420 175 422 Q 185 423 195 410 Q 205 398 215 392 Z" fill="#4ade80" />
                <path d="M 390 380 Q 420 395 432 410 Q 438 420 425 422 Q 415 423 405 410 Q 395 398 385 392 Z" fill="#4ade80" />
              </>
            )}
          </g>

          {/* === LAYER 1: Skin removed - muscles === */}
          {layer >= 1 && (
            <g>
              {/* Body outline */}
              <ellipse cx="300" cy="300" rx="95" ry="120" fill={layer === 1 ? '#f87171' : 'rgba(248,113,113,0.15)'} stroke="#dc2626" strokeWidth={layer === 1 ? 2 : 1} />
              <ellipse cx="300" cy="195" rx="65" ry="55" fill={layer === 1 ? '#fca5a5' : 'rgba(252,165,165,0.15)'} stroke="#dc2626" strokeWidth={layer === 1 ? 2 : 1} />
              {/* Muscle fibers */}
              {layer === 1 && [220, 240, 260, 280, 300, 320, 340, 360, 380].map((y, i) => (
                <line key={i} x1="215" y1={y} x2="385" y2={y} stroke="#b91c1c" strokeWidth="1.5" opacity="0.4" />
              ))}
              {layer === 1 && [235, 255, 275, 295, 315, 335, 355, 375].map((x, i) => (
                <line key={`v${i}`} x1={x} y1="185" x2={x} y2="415" stroke="#b91c1c" strokeWidth="1" opacity="0.3" />
              ))}
              <text x="300" y="310" textAnchor="middle" fontSize="10" fill={layer === 1 ? '#dc2626' : 'transparent'} fontWeight="600">Rectus Abdominis</text>
            </g>
          )}

          {/* === LAYER 2+: Internal organs === */}
          {layer >= 2 && ORGANS.map((organ) => {
            const isHovered   = !quizMode && hovered === organ.id;
            const isSelected  = !quizMode && selected === organ.id;
            const fill = isSelected || isHovered
              ? organ.hoverColor
              : organ.color;

            return (
              <g key={organ.id}
                role="button"
                tabIndex={0}
                aria-label={locale === 'ne' ? organ.nameNe : organ.nameEn}
                aria-pressed={quizMode ? undefined : isSelected}
                aria-disabled={quizMode && quizResult !== null}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                onMouseEnter={() => !quizMode && setHovered(organ.id)}
                onMouseLeave={() => !quizMode && setHovered(null)}
                onClick={() => handleOrganSelect(organ.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!event.repeat) handleOrganSelect(organ.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <motion.path
                  d={organ.path}
                  fill={fill}
                  stroke={isSelected ? 'white' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isSelected ? 2 : 1}
                  animate={{ scale: isHovered ? 1.05 : 1 }}
                  style={{ transformOrigin: `${organ.labelX}px ${organ.labelY}px` }}
                />
                {/* Organ label on hover */}
                {(isHovered || isSelected) && !quizMode && (
                  <g>
                    <rect x={organ.labelX - 40} y={organ.labelY - 12} width="80" height="22" rx="5" fill="rgba(0,0,0,0.75)" />
                    <text x={organ.labelX} y={organ.labelY + 4} textAnchor="middle" fontSize="9.5" fill="white" fontWeight="600">
                      {locale === 'ne' ? organ.nameNe : organ.nameEn}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Frog outline (always visible) */}
          <ellipse cx="300" cy="300" rx="95" ry="120" fill="none" stroke={layer < 2 ? 'transparent' : 'rgba(52,211,153,0.3)'} strokeWidth="1.5" />
          <ellipse cx="300" cy="195" rx="65" ry="55" fill="none" stroke={layer < 2 ? 'transparent' : 'rgba(52,211,153,0.3)'} strokeWidth="1.5" />

          {/* Eyes always visible */}
          <circle cx="270" cy="170" r="9" fill="#1f2937" />
          <circle cx="334" cy="170" r="9" fill="#1f2937" />
          <circle cx="268" cy="168" r="3" fill="white" />
          <circle cx="332" cy="168" r="3" fill="white" />
        </svg>

        {/* Organ info card */}
        <AnimatePresence>
          {selected && selectedOrgan && !quizMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="status"
              className="relative mx-auto mb-4 lg:absolute lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:mb-0 w-72 max-w-[calc(100%-2rem)] bg-gray-900/95 backdrop-blur-sm rounded-2xl p-4 border border-emerald-800/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-white">{selectedOrgan.nameEn}</div>
                  <div className="text-emerald-400 text-sm">{selectedOrgan.nameNe}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label={locale === 'ne' ? 'जानकारी बन्द गर्नुहोस्' : 'Close organ information'} className="text-gray-500 hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                {t(`frog.info.${selectedOrgan.infoKey}` as keyof ReturnType<typeof useT>)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz result feedback */}
        <AnimatePresence>
          {quizResult && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              role="status"
              className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center rounded-2xl p-5 shadow-2xl ${quizResult === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              <div className="text-4xl mb-1">{quizResult === 'correct' ? '✓' : '✗'}</div>
              <div className="text-white font-bold text-xl">
                {quizResult === 'correct' ? t('frog.quiz.correct') : t('frog.quiz.wrong')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===================== CONTROLS ===================== */}
      <div className="lg:w-80 min-h-0 shrink-0 bg-gray-900 text-white border-t lg:border-t-0 lg:border-l border-gray-700 lg:overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-base">{t('frog.title')}</h2>
          <p className="text-gray-400 text-xs mt-0.5">{t('frog.subtitle')}</p>
          <p role="status" className="text-emerald-400 text-xs mt-3">
            {locale === 'ne' ? 'अध्ययन गरिएका अङ्गहरू' : 'Organs explored'}: {explored.length}/{ORGANS.length}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {locale === 'ne' ? 'पूरा गर्न अन्वेषण मोडमा सबै सात अङ्गहरू चयन गरी अध्ययन गर्नुहोस्।' : 'To complete, select and study all seven organs in exploration mode.'}
          </p>
          <button onClick={resetLab} className="mt-3 rounded-xl bg-gray-800 px-3 py-2 text-xs hover:bg-gray-700">
            {locale === 'ne' ? 'फेरि सुरु गर्नुहोस्' : 'Reset lab'}
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Layer navigation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dissection Layers</h3>
            <div className="space-y-2">
              {LAYER_LABELS.map((label, i) => (
                <div key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${layer === i ? 'bg-emerald-800 border border-emerald-600' : layer > i ? 'bg-gray-800/50' : 'bg-gray-800/30'}`}>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${layer > i ? 'bg-emerald-500 text-white' : layer === i ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-500'}`}>
                    {layer > i ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${layer >= i ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setLayer((l) => Math.max(0, l - 1) as Layer); setSelected(null); }}
                disabled={layer === 0 || quizMode}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors">
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={handleLayerNext}
                disabled={layer === 3 || quizMode}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors">
                {layer < 2 ? t('frog.next.layer') : layer === 2 ? t('frog.layer.organs') : 'Done'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Organ list (visible from layer 2+) */}
          {layer >= 2 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {quizMode
                  ? (locale === 'ne' ? 'उत्तर चयन गर्नुहोस्' : 'Select an answer')
                  : (locale === 'ne' ? 'अध्ययन गर्न अङ्ग चयन गर्नुहोस्' : 'Select an organ to explore')}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {ORGANS.map((organ) => (
                  <button
                    key={organ.id}
                    onClick={() => handleOrganSelect(organ.id)}
                    disabled={quizMode && quizResult !== null}
                    aria-pressed={quizMode ? undefined : selected === organ.id}
                    className={`text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed ${!quizMode && selected === organ.id ? 'ring-2 ring-white text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                    style={{ backgroundColor: !quizMode && selected === organ.id ? organ.color : undefined }}>
                    <div>{locale === 'ne' ? organ.nameNe : organ.nameEn}</div>
                    <div className="text-[10px] opacity-60">{locale === 'ne' ? organ.nameEn : organ.nameNe}</div>
                    {!quizMode && explored.includes(organ.id) && (
                      <div className="text-[10px] text-emerald-400 mt-1">{locale === 'ne' ? 'अध्ययन गरियो' : 'Explored'}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quiz mode */}
          {layer >= 2 && (
            <div>
              {!quizMode ? (
                <button onClick={startQuiz}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors">
                  <HelpCircle className="h-4 w-4" /> {t('frog.quiz.mode')}
                </button>
              ) : (
                <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-amber-400">Quiz Mode</h3>
                    <button onClick={stopQuiz} aria-label={locale === 'ne' ? 'प्रश्नोत्तर बन्द गर्नुहोस्' : 'Exit quiz'}
                      className="text-gray-500 hover:text-gray-300"><X className="h-4 w-4" /></button>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{locale === 'ne' ? 'चित्र वा सूचीबाट यो अङ्ग चयन गर्नुहोस्:' : 'Select this organ in the diagram or list:'}</p>
                  <div aria-live="polite" className="text-amber-400 font-bold text-lg mb-1">
                    {ORGANS.find((o) => o.id === quizOrgan)?.[locale === 'ne' ? 'nameNe' : 'nameEn']}
                  </div>
                  <div className="text-gray-500 text-xs mt-3">
                    Score: {quizScore.correct}/{quizScore.total}
                    {quizScore.total > 0 && ` (${Math.round((quizScore.correct / quizScore.total) * 100)}%)`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completion */}
          {isDone && (
            <div role="status" className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">🐸</div>
              <div className="text-emerald-400 font-semibold text-sm">{t('completed.title')}</div>
              <div className="text-emerald-600 text-xs mt-1">{t('completed.subtitle')}</div>
              <p className="text-gray-300 text-xs mt-2 leading-relaxed">
                {locale === 'ne'
                  ? 'सातै अङ्गको अध्ययन पूरा भयो। मुटुले रगत पम्प गर्छ, फोक्सोले ग्यास आदानप्रदान गर्छ, कलेजो, पेट र आन्द्राले पाचनमा सहयोग गर्छन्, र मिर्गौला तथा पिसाब थैलीले फोहोर निष्कासनमा सहयोग गर्छन्।'
                  : 'All seven organs explored. The heart pumps blood; lungs exchange gases; the liver, stomach and intestine support digestion; kidneys and bladder support waste removal.'}
              </p>
            </div>
          )}

          {/* Ethical note */}
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
            <p className="text-xs text-gray-500 leading-relaxed">
              🌱 <strong className="text-gray-400">Ethical Alternative:</strong> This virtual dissection preserves animal life while providing the same educational value as physical dissection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
