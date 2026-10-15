import type { SavedVocabularyItem } from '../types';

export function exportVocabularyToPdf(words: SavedVocabularyItem[]): void {
  if (!words || words.length === 0) {
    alert('No saved vocabulary words to download.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download your vocabulary as PDF.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SpeakReady AI - My Saved Vocabulary</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      background: #ffffff;
      padding: 0;
    }
    .header {
      border-bottom: 2.5px solid #047857;
      padding-bottom: 14px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .logo-title {
      font-size: 24px;
      font-weight: 800;
      color: #047857;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 13px;
      color: #4b5563;
      margin-top: 3px;
    }
    .meta-info {
      text-align: right;
      font-size: 12px;
      color: #6b7280;
    }
    .stats-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 12px;
      margin-top: 4px;
      border: 1px solid #a7f3d0;
    }
    .vocab-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .vocab-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 16px;
      background: #fafafa;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .word-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 6px;
    }
    .word-text {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }
    .pronunciation {
      font-size: 13px;
      color: #6b7280;
      font-family: monospace;
    }
    .pos-tag {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: #e5e7eb;
      color: #374151;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .meaning-box {
      background: #ffffff;
      border-left: 3.5px solid #059669;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 13.5px;
    }
    .meaning-label {
      font-weight: 700;
      color: #047857;
      margin-bottom: 2px;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meaning-content {
      color: #1f2937;
      font-weight: 500;
    }
    .examples-box {
      margin-top: 8px;
    }
    .examples-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #4b5563;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .example-item {
      font-size: 12.5px;
      color: #374151;
      font-style: italic;
      padding: 4px 8px;
      background: #ffffff;
      border-radius: 4px;
      margin-bottom: 4px;
      border-left: 2px solid #9ca3af;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
      font-size: 12px;
      color: #4b5563;
    }
    .tip-box {
      background: #fef3c7;
      color: #92400e;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 6px;
    }
    .synonyms-span {
      color: #047857;
      font-weight: 500;
    }
    .footer {
      margin-top: 28px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-title">SpeakReady AI</div>
      <div class="subtitle">Personal Saved Vocabulary &amp; Expression Bank</div>
    </div>
    <div class="meta-info">
      <div>Generated on: <strong>${currentDate}</strong></div>
      <div class="stats-badge">${words.length} Vocabulary ${words.length === 1 ? 'Word' : 'Words'} Saved</div>
    </div>
  </div>

  <div class="vocab-list">
    ${words
      .map(
        (item, index) => `
      <div class="vocab-item">
        <div class="word-row">
          <span style="font-size: 13px; color: #9ca3af; font-weight: 600;">#${index + 1}</span>
          <span class="word-text">${item.word}</span>
          ${item.pronunciation ? `<span class="pronunciation">/${item.pronunciation}/</span>` : ''}
          ${item.part_of_speech ? `<span class="pos-tag">${item.part_of_speech}</span>` : ''}
        </div>

        <div class="meaning-box">
          <div class="meaning-label">Meaning / Definition</div>
          <div class="meaning-content">${item.meaning}</div>
        </div>

        ${
          item.examples && item.examples.length > 0
            ? `
          <div class="examples-box">
            <div class="examples-label">Example ${item.examples.length === 1 ? 'Sentence' : 'Sentences'}:</div>
            ${item.examples.map(ex => `<div class="example-item">"${ex}"</div>`).join('')}
          </div>
        `
            : ''
        }

        ${
          item.synonyms && item.synonyms.length > 0
            ? `
          <div class="meta-row">
            <span><strong>Synonyms:</strong> <span class="synonyms-span">${item.synonyms.join(', ')}</span></span>
          </div>
        `
            : ''
        }

        ${
          item.usage_tip
            ? `
          <div class="tip-box">
            💡 <strong>Usage Tip:</strong> ${item.usage_tip}
          </div>
        `
            : ''
        }
      </div>
    `
      )
      .join('')}
  </div>

  <div class="footer">
    Downloaded from SpeakReady AI — Daily Speaking, Pronunciation &amp; Vocabulary Practice
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
