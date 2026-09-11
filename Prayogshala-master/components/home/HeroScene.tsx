'use client';
import { motion } from 'framer-motion';

/**
 * Animated bench illustration: burette dripping NaOH into a flask at the
 * phenolphthalein endpoint, with live readouts. Pure SVG, no raster assets.
 */
export default function HeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 520" className={className} role="img" aria-label="Virtual titration bench with burette, flask and digital readouts" fill="none">
      <defs>
        <linearGradient id="hs-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id="hs-liquid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" stopOpacity=".55" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id="hs-pink" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff8ab8" stopOpacity=".55" />
          <stop offset="1" stopColor="#f0468f" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id="hs-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#3a3a3f" />
          <stop offset=".5" stopColor="#8a8a8f" />
          <stop offset="1" stopColor="#3a3a3f" />
        </linearGradient>
        <linearGradient id="hs-bench" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#161618" />
        </linearGradient>
        <filter id="hs-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="hs-flask-clip">
          <path d="M296 292 L262 400 Q258 412 270 412 H430 Q442 412 438 400 L404 292 Z" />
        </clipPath>
      </defs>

      {/* Backdrop grid */}
      <g stroke="#2a2a2e" strokeWidth="1">
        {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={i * 53.3} y1="0" x2={i * 53.3} y2="520" />)}
        {Array.from({ length: 11 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 52} x2="640" y2={i * 52} />)}
      </g>

      {/* Bench */}
      <rect x="40" y="412" width="560" height="70" rx="3" fill="url(#hs-bench)" />
      <rect x="40" y="412" width="560" height="4" fill="#fe5b2a" opacity=".9" />
      <text x="52" y="466" fill="#5f5f66" fontFamily="var(--font-jetbrains)" fontSize="10" letterSpacing="2">BENCH 01 / TITRATION / 25 C</text>

      {/* Stand */}
      <rect x="180" y="404" width="220" height="10" rx="2" fill="url(#hs-steel)" />
      <rect x="246" y="60" width="9" height="350" rx="2" fill="url(#hs-steel)" />
      <rect x="250" y="150" width="86" height="7" rx="2" fill="url(#hs-steel)" />
      <rect x="326" y="140" width="34" height="26" rx="4" fill="#3a3a3f" stroke="#5f5f66" />
      <circle cx="343" cy="153" r="5" fill="#fe5b2a" />

      {/* Burette */}
      <g>
        <rect x="336" y="62" width="14" height="142" rx="3" fill="url(#hs-glass)" stroke="#8a8a8f" strokeWidth="1.2" />
        <motion.rect x="337.5" y="72" width="11" rx="2" fill="url(#hs-liquid)"
          initial={{ height: 128 }} animate={{ height: [128, 112, 128] }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <line x1="350" y1={76 + i * 14} x2={i % 4 === 0 ? 360 : 356} y2={76 + i * 14} stroke="#8a8a8f" strokeWidth="1" />
            {i % 4 === 0 && <text x="364" y={79 + i * 14} fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="8">{i * 5}</text>}
          </g>
        ))}
        {/* stopcock */}
        <rect x="330" y="204" width="26" height="8" rx="3" fill="#5f5f66" />
        <rect x="339" y="198" width="8" height="20" rx="2" fill="#fe5b2a" />
        <path d="M343 218 L339 236 L347 236 Z" fill="url(#hs-glass)" stroke="#8a8a8f" strokeWidth="1" />
        {/* drops */}
        <g className="hero-drop"><ellipse cx="343" cy="242" rx="2.4" ry="3.6" fill="#93c5fd" /></g>
        <g className="hero-drop hero-drop-2"><ellipse cx="343" cy="242" rx="2.2" ry="3.2" fill="#93c5fd" /></g>
      </g>

      {/* Flask */}
      <g>
        <g clipPath="url(#hs-flask-clip)">
          <motion.rect x="250" width="200" height="140" fill="url(#hs-pink)"
            initial={{ y: 360 }} animate={{ y: [360, 356, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.path d="M250 362 Q280 356 310 362 T370 362 T430 362 T490 362 V420 H250 Z" fill="#ff9dc4" opacity=".35"
            animate={{ x: [0, -40, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
          {[290, 330, 370, 400].map((x, i) => (
            <circle key={x} cx={x} cy="405" r={2 + (i % 2)} fill="#ffffff" opacity=".5" className="bubble" style={{ animationDelay: `${i * 0.8}s` }} />
          ))}
        </g>
        <path d="M296 292 L262 400 Q258 412 270 412 H430 Q442 412 438 400 L404 292 Z" fill="url(#hs-glass)" stroke="#c9c9c6" strokeWidth="1.4" />
        <rect x="316" y="232" width="68" height="62" rx="3" fill="url(#hs-glass)" stroke="#c9c9c6" strokeWidth="1.4" />
        <rect x="312" y="228" width="76" height="6" rx="2" fill="#8a8a8f" />
        <text x="350" y="396" textAnchor="middle" fill="#0f0f10" fontFamily="var(--font-jetbrains)" fontSize="10" fontWeight="600" opacity=".8">25.0 mL</text>
      </g>

      {/* Reagent bottles */}
      <g>
        <rect x="90" y="330" width="60" height="82" rx="4" fill="#1f1f21" stroke="#3a3a3f" />
        <rect x="104" y="314" width="32" height="18" rx="2" fill="#3a3a3f" />
        <rect x="96" y="356" width="48" height="26" fill="#f2f2f0" />
        <text x="120" y="368" textAnchor="middle" fill="#0f0f10" fontFamily="var(--font-jetbrains)" fontSize="9" fontWeight="700">HCl</text>
        <text x="120" y="378" textAnchor="middle" fill="#5f5f66" fontFamily="var(--font-jetbrains)" fontSize="7">0.1 mol/L</text>
        <rect x="164" y="360" width="34" height="52" rx="3" fill="#1f1f21" stroke="#3a3a3f" />
        <rect x="174" y="350" width="14" height="12" rx="1.5" fill="#f0468f" />
        <rect x="168" y="380" width="26" height="14" fill="#f2f2f0" />
        <text x="181" y="390" textAnchor="middle" fill="#0f0f10" fontFamily="var(--font-jetbrains)" fontSize="6.5" fontWeight="700">PhPh</text>
      </g>

      {/* Readout: pH */}
      <g transform="translate(456 232)">
        <rect width="150" height="82" rx="6" fill="#0f0f10" stroke="#3a3a3f" />
        <rect x="0" y="0" width="150" height="3" fill="#fe5b2a" />
        <text x="14" y="24" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="9" letterSpacing="1.5">PH METER</text>
        <text x="14" y="58" fill="#4ade80" fontFamily="var(--font-jetbrains)" fontSize="30" fontWeight="600" filter="url(#hs-glow)">7.02</text>
        <text x="14" y="72" fill="#5f5f66" fontFamily="var(--font-jetbrains)" fontSize="8" letterSpacing="1.5">ENDPOINT REACHED</text>
        <motion.circle cx="134" cy="16" r="4" fill="#4ade80" animate={{ opacity: [1, .3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
      </g>

      {/* Readout: volume */}
      <g transform="translate(456 326)">
        <rect width="150" height="60" rx="6" fill="#0f0f10" stroke="#3a3a3f" />
        <text x="14" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="9" letterSpacing="1.5">NAOH DELIVERED</text>
        <text x="14" y="48" fill="#f2f2f0" fontFamily="var(--font-jetbrains)" fontSize="24" fontWeight="600">25.00<tspan fill="#8a8a8f" fontSize="11"> mL</tspan></text>
      </g>

      {/* Titration curve mini */}
      <g transform="translate(40 60)">
        <rect width="170" height="110" rx="6" fill="#0f0f10" stroke="#3a3a3f" />
        <text x="12" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="9" letterSpacing="1.5">PH / VOLUME</text>
        {[40, 60, 80].map(y => <line key={y} x1="12" x2="158" y1={y} y2={y} stroke="#2a2a2e" />)}
        <motion.path d="M12 92 C50 90 70 86 84 72 C88 60 90 44 96 38 C110 30 140 30 158 30" stroke="#fe5b2a" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, delay: .6, ease: 'easeInOut' }} />
        <line x1="90" x2="90" y1="26" y2="96" stroke="#5f5f66" strokeDasharray="2 3" />
        <circle cx="90" cy="54" r="3.5" fill="#fe5b2a" stroke="#0f0f10" strokeWidth="1.5" />
      </g>

      {/* Callout */}
      <g transform="translate(40 200)">
        <text x="0" y="0" fill="#5f5f66" fontFamily="var(--font-jetbrains)" fontSize="9" letterSpacing="2">// STEP 05</text>
        <text x="0" y="18" fill="#c9c9c6" fontFamily="var(--font-inter)" fontSize="11">First persistent pink.</text>
        <text x="0" y="33" fill="#c9c9c6" fontFamily="var(--font-inter)" fontSize="11">Close the stopcock.</text>
      </g>
    </svg>
  );
}
