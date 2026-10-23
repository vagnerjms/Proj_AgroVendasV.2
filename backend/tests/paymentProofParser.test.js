/**
 * Cobertura do paymentProofParser (PDF texto mockado).
 */
jest.mock('pdf-parse', () =>
  jest.fn(async () => ({
    text: 'Comprovante PIX\nValor: R$ 500,00\nData: 10/03/2026\nE2E: TXIDABC123456'
  }))
);

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parse, parseMoneyBr, detectMethod } = require('../services/paymentProofParser.service');

describe('paymentProofParser.parse', () => {
  let tmpPdf;

  beforeAll(() => {
    tmpPdf = path.join(os.tmpdir(), `cp-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPdf, Buffer.from('%PDF-1.4 mock'));
  });

  afterAll(() => {
    try { fs.unlinkSync(tmpPdf); } catch (e) { /* ignore */ }
  });

  test('parse PDF texto sugere valor data e PIX', async () => {
    const r = await parse(tmpPdf, 'comprovante.pdf', { remainingBalance: 1000 });
    expect(r.source).toBe('text_pdf');
    expect(r.confidence).toBe('high');
    expect(r.suggested.paidAmount).toBe(500);
    expect(r.suggested.paymentDate).toBe('2026-03-10');
    expect(r.suggested.paymentMethod).toBe('PIX');
    expect(r.suggested.notes).toMatch(/TXID/);
  });

  test('valor acima do saldo é descartado', async () => {
    const r = await parse(tmpPdf, 'comprovante.pdf', { remainingBalance: 100 });
    expect(r.suggested.paidAmount).toBeNull();
  });

  test('sem arquivo — confidence none', async () => {
    const r = await parse(null, 'x.pdf', {});
    expect(r.confidence).toBe('none');
    expect(r.source).toBe('filename_only');
  });

  test('imagem sem tesseract não inventa valor', async () => {
    const img = path.join(os.tmpdir(), `cp-img-${Date.now()}.png`);
    fs.writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    try {
      const r = await parse(img, 'foto.png', {});
      expect(['none', 'low', 'medium']).toContain(r.confidence);
      if (r.source === 'filename_only' || r.source === 'ocr_image') {
        expect(r).toHaveProperty('suggested');
      }
    } finally {
      try { fs.unlinkSync(img); } catch (e) { /* ignore */ }
    }
  });

  test('heurísticas auxiliares', () => {
    expect(parseMoneyBr('')).toBeNull();
    expect(detectMethod('TED bancário')).toBe('TED/DOC');
    expect(detectMethod('cheque nº 12')).toBe('Cheque');
    expect(detectMethod('outro')).toBeNull();
  });
});
