'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, ArrowRight, BookOpen, BarChart3, Globe, Award } from 'lucide-react';
import { EXPERIMENTS } from '@/lib/experiments';
import ExperimentCard from '@/components/lab/ExperimentCard';
import { useT } from '@/hooks/useTranslation';
import Header from '@/components/shared/Header';

const FEATURES = [
  { icon: BarChart3, titleKey: 'feat.1.title' as const, descKey: 'feat.1.desc' as const, color: 'text-blue-600', bg: 'bg-blue-100' },
  { icon: BookOpen, titleKey: 'feat.2.title' as const, descKey: 'feat.2.desc' as const, color: 'text-purple-600', bg: 'bg-purple-100' },
  { icon: Award, titleKey: 'feat.3.title' as const, descKey: 'feat.3.desc' as const, color: 'text-amber-600', bg: 'bg-amber-100' },
  { icon: Globe, titleKey: 'feat.4.title' as const, descKey: 'feat.4.desc' as const, color: 'text-green-600', bg: 'bg-green-100' },
];

export default function HomePage() {
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute -top-10 -right-10 w-96 h-96 text-white/5" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="60" r="40" opacity="0.3"/>
            <circle cx="60" cy="140" r="25" opacity="0.2"/>
            <circle cx="150" cy="150" r="30" opacity="0.15"/>
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                <span>🇳🇵</span>
                <span>{t('hero.badge')}</span>
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl mb-6" style={{ fontFamily: '"Noto Sans Devanagari", "Noto Sans", sans-serif' }}>
                {t('hero.title').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </h1>
              <p className="text-lg text-blue-100 mb-8 max-w-md leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/lab"
                  className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
                >
                  {t('hero.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#experiments"
                  className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  {t('hero.cta2')}
                </a>
              </div>
            </motion.div>

            {/* Hero Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="hidden lg:flex justify-center"
            >
              <HeroIllustration />
            </motion.div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/20 pt-12">
            {[
              { value: EXPERIMENTS.length, label: t('hero.stat1') },
              { value: '100%', label: 'Free Forever' },
              { value: 'SEE +2', label: 'Curriculum' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiments */}
      <section id="experiments" className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{t('experiments.title')}</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t('experiments.subtitle')}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {EXPERIMENTS.slice(0, 3).map((exp, index) => <ExperimentCard key={exp.id} experiment={exp} index={index} />)}
          </div>
          <div className="mt-8 text-center">
            <Link href="/lab" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
              {t('experiments.viewAll', { count: EXPERIMENTS.length })}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">{t('features.title')}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, titleKey, descKey, color, bg }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
              >
                <div className={`mb-4 inline-flex rounded-xl ${bg} p-3`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-gray-900">PrayogShala</span>
            <span>— Built for Nepali students</span>
          </div>
          <div>
            Physics • Chemistry • Biology | Classes 9–12
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 380 340" className="w-full max-w-md drop-shadow-2xl" fill="none">
      {/* Lab bench */}
      <rect x="20" y="260" width="340" height="60" rx="4" fill="#d4c9b0" />
      <rect x="20" y="255" width="340" height="10" rx="2" fill="#c9bca0" />

      {/* Burette stand */}
      <rect x="185" y="60" width="6" height="200" rx="3" fill="#9ca3af" />
      <rect x="140" y="256" width="96" height="6" rx="3" fill="#9ca3af" />
      <rect x="155" y="120" width="40" height="4" rx="2" fill="#9ca3af" />

      {/* Burette */}
      <rect x="178" y="65" width="20" height="160" rx="3" fill="rgba(200,230,255,0.35)" stroke="#93c5fd" strokeWidth="1.5"/>
      {/* NaOH liquid in burette */}
      <rect x="179.5" y="66" width="17" height="120" rx="2" fill="rgba(147,197,253,0.5)"/>
      {/* Burette markings */}
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1="192" y1={80 + i*22} x2="198" y2={80 + i*22} stroke="#60a5fa" strokeWidth="1"/>
      ))}
      {/* Stopcock */}
      <rect x="174" y="220" width="28" height="8" rx="3" fill="#6b7280" />
      <circle cx="188" cy="224" r="4" fill="#4b5563" />

      {/* NaOH drops falling */}
      <ellipse cx="188" cy="240" rx="2.5" ry="4" fill="#60a5fa" opacity="0.8"/>
      <ellipse cx="188" cy="252" rx="2" ry="3" fill="#60a5fa" opacity="0.4"/>

      {/* White tile */}
      <rect x="148" y="255" width="80" height="8" rx="1" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>

      {/* Conical flask */}
      <path d="M168 225 L158 252 L218 252 L208 225 Z" fill="rgba(220,50,120,0.3)" stroke="#93c5fd" strokeWidth="1.5"/>
      <rect x="183" y="195" width="10" height="32" rx="2" fill="rgba(200,230,255,0.3)" stroke="#93c5fd" strokeWidth="1.5"/>
      {/* Flask liquid (pink = endpoint reached) */}
      <path d="M163 248 L158 252 L218 252 L213 248 Z" fill="rgba(236,72,153,0.6)"/>

      {/* ENDPOINT label */}
      <rect x="225" y="225" width="90" height="24" rx="4" fill="rgba(236,72,153,0.15)" stroke="rgba(236,72,153,0.4)" strokeWidth="1"/>
      <text x="270" y="241" textAnchor="middle" fontSize="9" fill="#be185d" fontWeight="600">✓ ENDPOINT</text>

      {/* HCl beaker on shelf */}
      <rect x="60" y="210" width="36" height="44" rx="2" fill="rgba(200,230,255,0.4)" stroke="#93c5fd" strokeWidth="1.5"/>
      <rect x="62" y="235" width="32" height="17" rx="1" fill="rgba(147,197,253,0.3)"/>
      <text x="78" y="228" textAnchor="middle" fontSize="8" fill="#1e40af" fontWeight="600">HCl</text>
      <text x="78" y="238" textAnchor="middle" fontSize="7" fill="#3b82f6">0.1M</text>

      {/* Phenolphthalein bottle */}
      <rect x="108" y="218" width="22" height="36" rx="3" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5"/>
      <rect x="112" y="212" width="14" height="8" rx="1" fill="#f9a8d4"/>
      <text x="119" y="233" textAnchor="middle" fontSize="6" fill="#9d174d" fontWeight="600">PhPh</text>
      <circle cx="119" cy="244" r="5" fill="rgba(236,72,153,0.4)"/>

      {/* pH display */}
      <rect x="270" y="180" width="80" height="60" rx="6" fill="#1e293b" />
      <rect x="274" y="184" width="72" height="52" rx="4" fill="#0f172a" />
      <text x="310" y="200" textAnchor="middle" fontSize="8" fill="#64748b">pH</text>
      <text x="310" y="220" textAnchor="middle" fontSize="20" fill="#34d399" fontWeight="700" fontFamily="monospace">7.02</text>
      <text x="310" y="232" textAnchor="middle" fontSize="7" fill="#64748b">ENDPOINT</text>

      {/* Volume display */}
      <rect x="270" y="248" width="80" height="36" rx="4" fill="#1e293b"/>
      <text x="310" y="261" textAnchor="middle" fontSize="7" fill="#64748b">Volume</text>
      <text x="310" y="276" textAnchor="middle" fontSize="13" fill="#60a5fa" fontWeight="700" fontFamily="monospace">25.0 mL</text>

      {/* Decorative bubbles */}
      {[[50,80,6],[320,100,4],[340,200,5],[50,180,3]].map(([x,y,r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.2)" />
      ))}
    </svg>
  );
}
