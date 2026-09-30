import { getDetailedFeedback, metrics, type EvaluationMode } from "@/lib/evaluation";

type ReportInput = {
  teacherName: string;
  classSubject: string;
  mode: EvaluationMode;
  scores: number[];
  total: number;
  tier: string;
  verdict: string;
  recordId?: string;
};

const clean = (value: string) => value.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

export async function downloadEvaluationReport(input: ReportInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const feedback = getDetailedFeedback(input.scores);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const navy: [number, number, number] = [24, 45, 66];
  const teal: [number, number, number] = [16, 124, 132];
  const pale: [number, number, number] = [239, 247, 248];
  const grey: [number, number, number] = [88, 105, 120];

  const header = (label: string) => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EquiTeach", margin, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("OBJECTIVE TEACHER EVALUATION", margin, 17);
    doc.text(label.toUpperCase(), pageWidth - margin, 15, { align: "right" });
  };
  const sectionTitle = (title: string, y: number) => {
    doc.setTextColor(...teal);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...teal);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
  };
  const paragraph = (text: string, x: number, y: number, width: number, size = 9, color = grey) => {
    doc.setTextColor(...color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    doc.text(lines, x, y);
    return y + lines.length * (size * 0.42) + 2;
  };

  header("Evaluation report");
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(clean(input.teacherName), margin, 41);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...grey);
  doc.text(clean(input.classSubject), margin, 48);
  doc.text(input.mode === "in_service" ? "In-service review" : "Recruitment evaluation", margin, 54);
  doc.text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), pageWidth - margin, 48, { align: "right" });

  doc.setFillColor(...pale);
  doc.roundedRect(margin, 64, contentWidth, 36, 3, 3, "F");
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(input.total), margin + 8, 85);
  doc.setFontSize(9);
  doc.text("/ 50", margin + 24, 85);
  doc.setTextColor(...navy);
  doc.setFontSize(12);
  doc.text(clean(input.tier), margin + 47, 78);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(clean(input.verdict), margin + 47, 86);

  sectionTitle("Behavior profile", 113);
  let y = 123;
  metrics.forEach((metric, index) => {
    const score = input.scores[index] ?? 0;
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * (contentWidth / 2 + 3);
    const cellWidth = contentWidth / 2 - 3;
    const cellY = y + row * 17;
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(clean(metric.name), x, cellY);
    doc.text(`${score}/5`, x + cellWidth, cellY, { align: "right" });
    doc.setFillColor(220, 229, 233);
    doc.roundedRect(x, cellY + 4, cellWidth, 2.4, 1, 1, "F");
    doc.setFillColor(...teal);
    doc.roundedRect(x, cellY + 4, cellWidth * score / 5, 2.4, 1, 1, "F");
  });

  y = 220;
  sectionTitle("Overall feedback", y);
  y = paragraph(feedback.summary, margin, y + 9, contentWidth);
  if (input.recordId) {
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.text(`Record ${input.recordId}`, margin, 285);
  }
  doc.text("Page 1 of 2", pageWidth - margin, 285, { align: "right" });

  doc.addPage();
  header("Coaching recommendations");
  y = 36;
  sectionTitle("Priority improvement areas", y);
  y += 10;
  feedback.improvements.forEach((area, index) => {
    doc.setFillColor(...pale);
    doc.roundedRect(margin, y - 5, contentWidth, 42, 3, 3, "F");
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${clean(area.metric.name)}  |  ${area.score}/5`, margin + 6, y + 2);
    let itemY = paragraph(`Observed: ${area.observedGap}`, margin + 6, y + 9, contentWidth - 12, 8);
    itemY = paragraph(`Next lesson: ${area.nextStep}`, margin + 6, itemY, contentWidth - 12, 8, navy);
    paragraph(area.evidenceToLookFor, margin + 6, itemY, contentWidth - 12, 8);
    y += 47;
  });

  sectionTitle("Four-step practice cycle", y + 2);
  y += 12;
  feedback.practicePlan.forEach((step) => {
    y = paragraph(`• ${step}`, margin + 3, y, contentWidth - 3, 8.5, navy);
  });
  sectionTitle("Next review", y + 4);
  paragraph(feedback.reviewPrompt, margin, y + 13, contentWidth, 9, navy);
  doc.setFontSize(7);
  doc.setTextColor(...grey);
  doc.text("Generated by EquiTeach - evidence-based classroom observation", margin, 285);
  doc.text("Page 2 of 2", pageWidth - margin, 285, { align: "right" });

  const filename = `${input.teacherName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "teacher"}-evaluation.pdf`;
  doc.save(filename);
}