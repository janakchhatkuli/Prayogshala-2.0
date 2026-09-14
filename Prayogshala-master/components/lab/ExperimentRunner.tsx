'use client';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { getExperiment, type ExperimentId } from '@/lib/experiments';
import { useT } from '@/hooks/useTranslation';

function LoadingExperiment() {
  const t = useT();
  return <div role="status" className="mx-auto flex min-h-80 max-w-7xl items-center justify-center gap-3 px-4 label text-muted">
    <span aria-hidden="true" className="h-2 w-2 bg-accent blink" />
    {t('loading')}
  </div>;
}

const LABS = {
  'titration-acid-base': dynamic(() => import('@/components/experiments/titration/TitrationLab'), { ssr: false, loading: LoadingExperiment }),
  'ohms-law': dynamic(() => import('@/components/experiments/ohms-law/OhmsLawLab'), { ssr: false, loading: LoadingExperiment }),
  'simple-pendulum': dynamic(() => import('@/components/experiments/pendulum/PendulumLab'), { ssr: false, loading: LoadingExperiment }),
  filtration: dynamic(() => import('@/components/experiments/filtration/FiltrationLab'), { ssr: false, loading: LoadingExperiment }),
  'microscope-cells': dynamic(() => import('@/components/experiments/microscope/MicroscopeLab'), { ssr: false, loading: LoadingExperiment }),
  osmosis: dynamic(() => import('@/components/experiments/osmosis/OsmosisLab'), { ssr: false, loading: LoadingExperiment }),
  'frog-anatomy': dynamic(() => import('@/components/experiments/frog-anatomy/FrogAnatomyLab'), { ssr: false, loading: LoadingExperiment }),
  'hookes-law': dynamic(() => import('@/components/experiments/hookes-law/HookesLawLab'), { ssr: false, loading: LoadingExperiment }),
  refraction: dynamic(() => import('@/components/experiments/refraction/RefractionLab'), { ssr: false, loading: LoadingExperiment }),
  electrolysis: dynamic(() => import('@/components/experiments/electrolysis/ElectrolysisLab'), { ssr: false, loading: LoadingExperiment }),
  photosynthesis: dynamic(() => import('@/components/experiments/photosynthesis/PhotosynthesisLab'), { ssr: false, loading: LoadingExperiment }),
  'human-body': dynamic(() => import('@/components/experiments/human-body/HumanBodyLab'), { ssr: false, loading: LoadingExperiment }),
} satisfies Record<ExperimentId, ComponentType>;

interface Props {
  experimentId: ExperimentId;
}

export default function ExperimentRunner({ experimentId }: Props) {
  const Lab = LABS[experimentId];
  return <div lang={getExperiment(experimentId)?.panelLanguage === 'en' ? 'en' : undefined}><Lab /></div>;
}
