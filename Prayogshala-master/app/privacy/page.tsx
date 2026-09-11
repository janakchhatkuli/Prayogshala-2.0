'use client';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { useT } from '@/hooks/useTranslation';
import { SectionLabel } from '@/components/shared/Reveal';

const SECTIONS = [
  {
    id: 'scope',
    title: 'What this prototype is',
    body: [
      'PrayogShala is a prototype virtual science laboratory for students in Nepal. This build has no server-side accounts, no database and no third-party analytics. Everything described below happens inside your own browser.',
    ],
  },
  {
    id: 'data',
    title: 'What is stored, and where',
    body: [
      'The app keeps a small amount of state in your browser\'s localStorage under the key "prayogshala-storage". This includes: your chosen language; a demo session (name, email, role, grade, school) if you sign in with one of the hardcoded demo accounts; a list of experiments you have completed with a score and timestamp; a streak counter and badges; and a view log of routes you visited (path and time) capped at the last 200 entries.',
      'Messages submitted through the contact form are stored locally under "prayogshala:contact". They are not transmitted anywhere.',
      'A session flag ("prayogshala:booted") is stored in sessionStorage so the loading screen shows once per tab.',
    ],
  },
  {
    id: 'why',
    title: 'Why views are tracked',
    body: [
      'The view log exists to demonstrate learning-progress tracking: which labs a student opened, how often, and when. It is displayed back to you on the Dashboard. No one else can see it because it never leaves your device.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and fonts',
    body: [
      'The site sets no cookies. Web fonts are self-hosted through the framework\'s font pipeline, so no requests are made to font providers at runtime.',
    ],
  },
  {
    id: 'control',
    title: 'Your control',
    body: [
      'Signing out removes the demo session. Clearing your browser site data for this origin removes everything else. There is nothing to request from us, because we hold nothing.',
    ],
  },
  {
    id: 'production',
    title: 'If this becomes a real product',
    body: [
      'A production release with real accounts would require a full policy covering the legal basis for processing, retention periods, data location, school and guardian consent for minors, and a contact for data requests. This page would be replaced before any such launch.',
    ],
  },
];

export default function PrivacyPage() {
  const t = useT();
  const updated = '2026-09-11';
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-24 pt-28 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[320px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <SectionLabel>{t('privacy.label')}</SectionLabel>
            <h1 className="display mt-5 text-4xl text-fg sm:text-5xl">{t('privacy.title')}</h1>
            <p className="label mt-5 text-muted">{t('privacy.updated')} {updated}</p>
            <nav aria-label="Sections" className="mt-10 hidden lg:block">
              <ol className="space-y-2 border-l border-line">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="label -ml-px flex items-center gap-3 border-l border-transparent py-1 pl-4 text-muted transition-colors hover:border-accent hover:text-fg">
                      <span className="num text-muted-2">0{i + 1}</span>{s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article className="max-w-3xl">
            <p className="text-base leading-relaxed text-fg-2">{t('privacy.intro')}</p>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {SECTIONS.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-28 grid gap-4 py-8 sm:grid-cols-[4rem_1fr]">
                  <span className="num text-sm text-accent">0{i + 1}</span>
                  <div>
                    <h2 className="display text-2xl text-fg">{s.title}</h2>
                    {s.body.map((p, j) => <p key={j} className="mt-4 text-sm leading-relaxed text-muted">{p}</p>)}
                  </div>
                </section>
              ))}
            </div>
            <p className="label mt-8 text-muted-2">{t('privacy.langNote')}</p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
