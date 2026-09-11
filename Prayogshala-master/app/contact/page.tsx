'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { useT } from '@/hooks/useTranslation';
import { SectionLabel, SplitLines, Reveal } from '@/components/shared/Reveal';
import { IconArrowReturn, IconCheck, IconMail } from '@/components/icons';

const TOPICS = ['school', 'teacher', 'bug', 'other'] as const;

export default function ContactPage() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', topic: 'school', message: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setBusy(true);
    // Prototype: no backend. Keep a local copy so the dashboard-style demo has something to show.
    setTimeout(() => {
      try {
        const box = JSON.parse(localStorage.getItem('prayogshala:contact') ?? '[]');
        localStorage.setItem('prayogshala:contact', JSON.stringify([...box, { ...form, at: new Date().toISOString() }]));
      } catch { /* storage unavailable, ignore */ }
      setBusy(false);
      setSent(true);
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-24 pt-28 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionLabel>{t('contact.label')}</SectionLabel>
            <SplitLines as="h1" text={t('contact.title')} className="display mt-5 text-4xl text-fg sm:text-6xl" />
            <Reveal delay={0.2}><p className="mt-6 max-w-md text-sm leading-relaxed text-muted sm:text-base">{t('contact.subtitle')}</p></Reveal>

            <Reveal delay={0.3} className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              <div className="bg-surface p-6">
                <p className="label text-muted">{t('contact.emailLabel')}</p>
                <a href="mailto:hello@prayogshala.np" className="num mt-2 block text-fg hover:text-accent">hello@prayogshala.np</a>
              </div>
              <div className="bg-surface p-6">
                <p className="label text-muted">{t('contact.replyLabel')}</p>
                <p className="num mt-2 text-fg">{t('contact.replyValue')}</p>
              </div>
              <div className="bg-surface p-6">
                <p className="label text-muted">{t('contact.locationLabel')}</p>
                <p className="mt-2 text-sm text-fg">Kathmandu, Nepal</p>
              </div>
              <div className="bg-surface p-6">
                <p className="label text-muted">{t('contact.forLabel')}</p>
                <p className="mt-2 text-sm text-fg">{t('contact.forValue')}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            {sent ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="corner-marks rounded-lg border border-line bg-surface p-10 text-center">
                <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ok/15 text-ok"><IconCheck size={26} /></span>
                <h2 className="display mt-6 text-3xl text-fg">{t('contact.sentTitle')}</h2>
                <p className="mt-3 text-sm text-muted">{t('contact.sentBody')}</p>
                <div className="mt-8 flex justify-center gap-3">
                  <Link href="/lab" className="btn btn-accent btn-sm">{t('hero.cta')}</Link>
                  <button type="button" onClick={() => { setSent(false); setForm({ name: '', email: '', topic: 'school', message: '' }); setConsent(false); }} className="btn btn-ghost btn-sm">{t('contact.another')}</button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="rounded-lg border border-line bg-surface p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="label text-muted">{t('contact.name')}</span>
                    <input required className="field mt-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                  <label className="block"><span className="label text-muted">{t('login.email')}</span>
                    <input required type="email" className="field mt-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
                </div>
                <fieldset className="mt-5">
                  <legend className="label text-muted">{t('contact.topic')}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TOPICS.map(topic => (
                      <button key={topic} type="button" aria-pressed={form.topic === topic} onClick={() => setForm({ ...form, topic })}
                        className={`label inline-flex h-9 items-center rounded-md border px-3 transition-colors ${form.topic === topic ? 'border-fg bg-fg text-ink' : 'border-line-2 text-fg-2 hover:border-fg-2'}`}>
                        {t(`contact.topic.${topic}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-5 block"><span className="label text-muted">{t('contact.message')}</span>
                  <textarea required rows={6} maxLength={2000} className="field mt-2" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
                <label className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-muted">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
                  <span>{t('contact.consent')} <Link href="/privacy" className="underline hover:text-fg">{t('footer.privacy')}</Link>.</span>
                </label>
                <button type="submit" disabled={!consent || busy} className="btn btn-accent mt-6 w-full sm:w-auto">
                  {busy ? t('login.busy') : <><IconArrowReturn size={15} /> {t('contact.submit')}</>}
                </button>
                <p className="label mt-4 flex items-center gap-2 text-muted-2"><IconMail size={13} /> {t('contact.prototypeNote')}</p>
              </form>
            )}
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
