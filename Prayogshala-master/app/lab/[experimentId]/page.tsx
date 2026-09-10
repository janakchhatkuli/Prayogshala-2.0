import { notFound } from 'next/navigation';
import Header from '@/components/shared/Header';
import ExperimentRunner from '@/components/lab/ExperimentRunner';
import { EXPERIMENTS, getExperiment } from '@/lib/experiments';

export default async function ExperimentPage(props: PageProps<'/lab/[experimentId]'>) {
  const { experimentId } = await props.params;

  const experiment = getExperiment(experimentId);
  if (!experiment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <ExperimentRunner experimentId={experiment.id} />
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return EXPERIMENTS.map(({ id }) => ({ experimentId: id }));
}
