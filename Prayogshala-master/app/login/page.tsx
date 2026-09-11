'use client';
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/shared/Header';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import { authenticate, DEMO_ACCOUNTS } from '@/lib/auth';
import { SectionLabel } from '@/components/shared/Reveal';
import { LogoMark, IconLock, IconMail, IconArrowReturn, IconEye } from '@/components/icons';

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}

function LoginInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const login = useStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next') ?? '/dashboard';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    // Small artificial delay so the state change reads as a request.
    setTimeout(() => {
      const account = authenticate(email, password);
      if (!account) { setError(t('login.error')); setBusy(false); return; }
      const { password: _pw, ...rest } = account;
      void _pw;
      login(rest);
      router.push(next);
    }, 450);
  };

  const fill = (i: number) => { setEmail(DEMO_ACCOUNTS[i].email); setPassword(DEMO_ACCOUNTS[i].password); setError(''); };

  return (
    <div className="min-h-screen bg-ink">
      <Header />
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        {/* Left: brand panel */}
        <div className="relative hidden overflow-hidden bg-accent lg:block">
          <div className="absolute inset-0 plus-dots opacity-30" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between p-14 pt-32 text-ink">
            <div>
              <p className="display text-6xl">// {t('login.panelTitle')}</p>
              <p className="mt-6 max-w-md text-base leading-relaxed text-ink/80">{t('login.panelSubtitle')}</p>
            </div>
            <ol className="space-y-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/80">
              <li>// {t('login.point1')}</li>
              <li>// {t('login.point2')}</li>
              <li>// {t('login.point3')}</li>
            </ol>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center px-5 pb-16 pt-28 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
            <LogoMark size={34} className="text-fg" />
            <SectionLabel className="mt-8">{t('login.label')}</SectionLabel>
            <h1 className="display mt-4 text-4xl text-fg sm:text-5xl">{t('login.title')}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t('login.subtitle')}</p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <label className="block">
                <span className="label text-muted">{t('login.email')}</span>
                <div className="relative mt-2">
                  <IconMail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
                  <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="field pl-10" placeholder="student@prayogshala.np" />
                </div>
              </label>
              <label className="block">
                <span className="label text-muted">{t('login.password')}</span>
                <div className="relative mt-2">
                  <IconLock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
                  <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="field pl-10 pr-11" placeholder="••••••••" />
                  <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-fg"><IconEye size={16} /></button>
                </div>
              </label>
              {error && <p role="alert" className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-accent w-full">
                {busy ? t('login.busy') : <><IconArrowReturn size={15} /> {t('login.submit')}</>}
              </button>
            </form>

            <div className="mt-8 rounded-lg border border-line bg-surface p-4">
              <p className="label text-muted">{t('login.demoTitle')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((a, i) => (
                  <button key={a.email} type="button" onClick={() => fill(i)} className="rounded-md border border-line bg-ink p-3 text-left transition-colors hover:border-line-2">
                    <p className="label text-accent">{a.role === 'teacher' ? t('login.roleTeacher') : t('login.roleStudent')}</p>
                    <p className="num mt-1 truncate text-xs text-fg">{a.email}</p>
                    <p className="num text-xs text-muted">{a.password}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-2">{t('login.demoNote')}</p>
            </div>

            <p className="mt-6 text-xs text-muted-2">
              {t('login.privacyLead')} <Link href="/privacy" className="underline hover:text-fg">{t('footer.privacy')}</Link>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
