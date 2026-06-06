import type { GaitAnalysisResult } from '@/types/gait';

/** DOM capture function shape used by the PDF exporter. */
export type CaptureElement = (
  element: HTMLElement,
  options: {
    backgroundColor: string;
    scale: number;
    useCORS: boolean;
  },
) => Promise<HTMLCanvasElement>;

/** Options for exporting a result report to PDF. */
export interface ExportPdfReportOptions {
  /** DOM element containing the report layout. */
  element: HTMLElement;
  /** Analysis result used for filename metadata. */
  result: GaitAnalysisResult;
  /** Optional filename override. */
  fileName?: string;
}

/** Dependencies for PDF export, exposed for deterministic unit tests. */
export interface PdfExportDependencies {
  /** Capture a DOM element as a canvas. */
  captureElement: CaptureElement;
  /** Create a new jsPDF document. */
  createPdf: () => Promise<PdfDocument>;
}

/** Minimal jsPDF surface used by the exporter. */
export interface PdfDocument {
  /** PDF page size helpers. */
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  /** Add a raster image to the PDF page. */
  addImage: (
    imageData: string,
    format: 'PNG',
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  /** Save the generated PDF. */
  save: (fileName: string) => void;
}

const defaultDependencies: PdfExportDependencies = {
  captureElement: async (element, options) => {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(element, options);
  },
  createPdf: async () => {
    const { jsPDF } = await import('jspdf');
    return new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
  },
};

/** Export the provided report element as a single-page A4 PDF. */
export async function exportPdfReport(
  options: ExportPdfReportOptions,
  dependencies: PdfExportDependencies = defaultDependencies,
): Promise<void> {
  const canvas = await dependencies.captureElement(options.element, {
    backgroundColor: '#f8fafc',
    scale: 2,
    useCORS: true,
  });
  const pdf = await dependencies.createPdf();
  const imageData = canvas.toDataURL('image/png');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const imageWidth = canvas.width * scale;
  const imageHeight = canvas.height * scale;
  const x = (pageWidth - imageWidth) / 2;
  const y = margin;

  pdf.addImage(imageData, 'PNG', x, y, imageWidth, imageHeight);
  pdf.save(options.fileName ?? createReportFileName(options.result));
}

/** Create a de-identified report filename. */
export function createReportFileName(result: GaitAnalysisResult): string {
  return `gait-report-${result.assessmentId}.pdf`;
}
