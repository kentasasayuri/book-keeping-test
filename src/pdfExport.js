import { jsPDF } from 'jspdf';
import mplusRegularUrl from './assets/fonts/MPLUS1p-Regular.ttf?url';
import mplusBoldUrl from './assets/fonts/MPLUS1p-Bold.ttf?url';

const FONT_FAMILY = 'MPLUS1p';

const cachedFonts = {
  regular: null,
  bold: null
};

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return globalThis.btoa(binary);
}

async function fetchFontBase64(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`フォント取得に失敗しました: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

async function registerJapaneseFont(doc) {
  if (!cachedFonts.regular) {
    cachedFonts.regular = await fetchFontBase64(mplusRegularUrl);
  }

  doc.addFileToVFS('MPLUS1p-Regular.ttf', cachedFonts.regular);
  doc.addFont('MPLUS1p-Regular.ttf', FONT_FAMILY, 'normal');

  let hasBold = false;

  try {
    if (!cachedFonts.bold) {
      cachedFonts.bold = await fetchFontBase64(mplusBoldUrl);
    }

    doc.addFileToVFS('MPLUS1p-Bold.ttf', cachedFonts.bold);
    doc.addFont('MPLUS1p-Bold.ttf', FONT_FAMILY, 'bold');
    hasBold = true;
  } catch (boldError) {
    // eslint-disable-next-line no-console
    console.warn('日本語太字フォントの読み込みに失敗したため、通常フォントで代用します。', boldError);
  }

  doc.setFont(FONT_FAMILY, 'normal');

  return {
    family: FONT_FAMILY,
    hasBold
  };
}

function createWriter(doc, fontProfile) {
  const marginX = 40;
  const marginY = 40;
  const lineGap = 6;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;

  let cursorY = marginY;

  function ensureSpace(required = 18) {
    if (cursorY + required > pageHeight - marginY) {
      doc.addPage();
      cursorY = marginY;
    }
  }

  function addText(text, options = {}) {
    const {
      size = 11,
      indent = 0,
      spacing = 4,
      bold = false,
      after = lineGap,
      maxWidth = contentWidth - indent
    } = options;

    const style = bold && fontProfile.hasBold ? 'bold' : 'normal';

    doc.setFont(fontProfile.family, style);
    doc.setFontSize(size);

    String(text)
      .split('\n')
      .forEach((paragraph) => {
        const lines = doc.splitTextToSize(paragraph || ' ', maxWidth);

        lines.forEach((line) => {
          ensureSpace(size + spacing);
          doc.text(line, marginX + indent, cursorY);
          cursorY += size + spacing;
        });
      });

    cursorY += after;
  }

  function addDivider() {
    ensureSpace(14);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 12;
  }

  function addBullets(items, options = {}) {
    items.forEach((item) => {
      addText(`・${item}`, options);
    });
  }

  return {
    addText,
    addDivider,
    addBullets
  };
}

function formatLinksForCopy(links) {
  return links.map((link) => `${link.title}\n${link.url}`);
}

async function exportResultPdf({ result }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const fontProfile = await registerJapaneseFont(doc);
  const writer = createWriter(doc, fontProfile);

  writer.addText('日商簿記3級 ネット試験模擬 結果レポート', { size: 16, bold: true });
  writer.addText(`作成日時: ${new Date().toLocaleString('ja-JP')}`);
  writer.addText(`合否: ${result.passed ? '合格' : '不合格'}`, { bold: true });
  writer.addText(`総合得点: ${result.totalScore} / 100`, { bold: true });

  writer.addText(`第1問: ${result.sectionScores.q1} / 45`);
  writer.addText(`第2問: ${result.sectionScores.q2} / 20`);
  writer.addText(`第3問: ${result.sectionScores.q3} / 35`);
  writer.addDivider();

  if (result.analysis) {
    writer.addText('復習分析', { size: 14, bold: true });
    writer.addText(result.analysis.summary);

    (result.analysis.sectionInsights ?? []).forEach((insight) => {
      writer.addText(
        `${insight.label}: ${insight.score}/${insight.maxScore}（${insight.accuracy}%） [${insight.status}]`,
        {
          indent: 8
        }
      );
    });

    writer.addText('強み', { bold: true });
    writer.addBullets(result.analysis.strengths ?? [], { indent: 8 });

    writer.addText('弱点', { bold: true });
    writer.addBullets(result.analysis.weaknesses ?? [], { indent: 8 });

    writer.addText('次回までの優先アクション', { bold: true });
    writer.addBullets(result.analysis.recommendations ?? [], { indent: 8 });

    writer.addText(
      `復習動画: ${result.analysis.channel?.name ?? ''} ${result.analysis.channel?.url ?? ''}`,
      { bold: true }
    );
    writer.addBullets(formatLinksForCopy(result.analysis.reviewLinks ?? []), { indent: 8 });

    writer.addDivider();
  }

  writer.addText('詳細解答・解説', { size: 14, bold: true });

  result.detailItems.forEach((item, index) => {
    writer.addText(`${index + 1}. ${item.sectionLabel} (${item.score}/${item.maxScore}点)`, {
      size: 12,
      bold: true
    });
    writer.addText(`問題: ${item.questionText}`, { indent: 8 });
    writer.addText(`あなたの解答: ${item.userAnswerText}`, { indent: 8 });
    writer.addText(`正答: ${item.correctAnswerText}`, { indent: 8 });
    writer.addText(`解説: ${item.explanation}`, { indent: 8 });
    writer.addDivider();
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`boki3-net-exam-result-${timestamp}.pdf`);
}

export { exportResultPdf };