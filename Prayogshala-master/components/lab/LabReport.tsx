'use client';
import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';

interface TitrationData {
  volumeDispensed: number;
  calculatedConcentration: number;
  endpointPH: number;
  pHData: Array<{ volume: number; pH: number }>;
}

interface Props {
  experimentId: string;
  data: TitrationData;
  onClose: () => void;
}

export default function LabReport({ experimentId, data, onClose }: Props) {
  const t = useT();
  const { currentUser } = useStore();
  const [generating, setGenerating] = useState(false);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const margin = 20;
      let y = margin;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PrayogShala', margin, 15);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Nepal Virtual Science Laboratory', margin, 23);
      doc.text('Lab Report', 210 - margin, 15, { align: 'right' });

      y = 50;
      doc.setTextColor(30, 30, 30);

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Acid-Base Titration', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Determination of HCl concentration using NaOH and phenolphthalein indicator', margin, y);
      y += 12;

      // Meta info box
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, 170, 28, 3, 3, 'FD');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.text(`Student: ${currentUser.name}`, margin + 5, y + 8);
      doc.text(`Grade: ${currentUser.grade}`, margin + 5, y + 16);
      doc.text(`Date: ${today}`, margin + 90, y + 8);
      doc.text('Subject: Chemistry', margin + 90, y + 16);
      y += 38;

      // Objective
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Objective', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const obj = doc.splitTextToSize(
        'To determine the concentration of the given hydrochloric acid (HCl) solution by titrating it against a standard sodium hydroxide (NaOH) solution using phenolphthalein as an indicator.',
        170
      );
      doc.text(obj, margin, y);
      y += obj.length * 5 + 8;

      // Apparatus
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Apparatus and Reagents', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const apparatus = [
        '• Burette (50 mL)',
        '• Conical flask (250 mL)',
        '• Pipette (25 mL)',
        '• Burette stand and clamp',
        '• NaOH solution (0.1 mol/L)',
        '• HCl solution (unknown concentration)',
        '• Phenolphthalein indicator',
        '• Distilled water',
      ];
      apparatus.forEach((item) => {
        doc.text(item, margin + 3, y);
        y += 5;
      });
      y += 5;

      // Observations
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Observations', margin, y);
      y += 8;

      // Table
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, y - 5, 170, 8, 'F');
      doc.text('Parameter', margin + 3, y);
      doc.text('Value', margin + 120, y);
      y += 5;

      const rows = [
        ['Volume of HCl taken', '25.0 mL'],
        ['Concentration of NaOH', '0.1 mol/L'],
        ['Volume of NaOH at endpoint', `${data.volumeDispensed.toFixed(2)} mL`],
        ['pH at endpoint', data.endpointPH.toFixed(2)],
        ['Indicator used', 'Phenolphthalein'],
        ['Colour change at endpoint', 'Colourless → Permanent pink'],
      ];

      rows.forEach((row, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
        doc.rect(margin, y - 4, 170, 7, 'F');
        doc.text(row[0], margin + 3, y);
        doc.text(row[1], margin + 120, y);
        y += 7;
      });
      y += 8;

      // Calculations
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Calculations', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const calcLines = [
        'Using M₁V₁ = M₂V₂ (Molarity equation):',
        `M(NaOH) × V(NaOH) = M(HCl) × V(HCl)`,
        `0.1 × ${data.volumeDispensed.toFixed(2)} = M(HCl) × 25.0`,
        `M(HCl) = (0.1 × ${data.volumeDispensed.toFixed(2)}) / 25.0`,
        `M(HCl) = ${data.calculatedConcentration.toFixed(4)} mol/L`,
      ];
      calcLines.forEach((line) => {
        doc.text(line, margin + 3, y);
        y += 6;
      });
      y += 5;

      // Result
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Result', margin, y);
      y += 6;
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(margin, y - 4, 170, 14, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(6, 95, 70);
      doc.text(
        `The concentration of the given HCl solution is ${data.calculatedConcentration.toFixed(4)} mol/L`,
        margin + 5,
        y + 4
      );
      y += 22;

      // Signature
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y + 10, margin + 60, y + 10);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Student Signature', margin, y + 16);

      // Footer
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 282, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('PrayogShala — Nepal\'s Virtual Science Laboratory', 105, 291, { align: 'center' });

      doc.save(`lab-report-titration-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{t('report.title')}</h2>
              <p className="text-blue-200 text-sm mt-0.5">Acid-Base Titration</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-blue-700 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 text-xs mb-1">{t('report.student')}</div>
              <div className="font-semibold">{currentUser.name}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 text-xs mb-1">{t('report.date')}</div>
              <div className="font-semibold">{today}</div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
            <h3 className="font-semibold text-blue-900">Results Summary</h3>
            <div className="flex justify-between">
              <span className="text-gray-600">Volume NaOH at endpoint</span>
              <span className="font-mono font-semibold">{data.volumeDispensed.toFixed(2)} mL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Calculated [HCl]</span>
              <span className="font-mono font-semibold text-green-700">{data.calculatedConcentration.toFixed(4)} mol/L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">pH at endpoint</span>
              <span className="font-mono font-semibold">{data.endpointPH.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-green-800">Conclusion</p>
            <p className="text-green-700 mt-1">
              The concentration of HCl is {data.calculatedConcentration.toFixed(4)} mol/L,
              determined using M₁V₁ = M₂V₂ with NaOH (0.1 mol/L, {data.volumeDispensed.toFixed(2)} mL).
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('close')}
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {generating ? t('report.generating') : t('report.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
