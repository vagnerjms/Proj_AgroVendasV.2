const {
  formatNfNumber,
  formatRomaneioNumber,
  extractRomaneioFromFilename,
  extractRomaneioFromNotes,
  resolveRomaneioNumber,
  buildDriveAttachmentName,
  classifySaleAttachment
} = require('../utils/dataHelpers');

describe('formatNfNumber', () => {
  test('extrai sequência de nome NF-######', () => {
    expect(formatNfNumber('NF-001234')).toBe('001234');
    expect(formatNfNumber('uploads/NF-987654.pdf')).toBe('987654');
  });

  test('aceita NF só com dígitos (6–12)', () => {
    expect(formatNfNumber('123456')).toBe('123456');
    expect(formatNfNumber('12.345.678')).toBe('12345678');
  });

  test('chave SEFAZ 44 dígitos → nNF (posições 25–34 sem zeros à esquerda)', () => {
    // 25 zeros + nNF 000123456 (9) + 10 zeros = 44
    const chave = '0'.repeat(25) + '000123456' + '0'.repeat(10);
    expect(chave).toHaveLength(44);
    expect(formatNfNumber(chave)).toBe('123456');
  });

  test('fallback pelo basename do arquivo', () => {
    expect(formatNfNumber('path/to/nota_000111.pdf')).toBe('000111');
  });

  test('modelos docs/*.zip e upload com timestamp', () => {
    expect(formatNfNumber('28042894 - SAMUEL - LANCADA.pdf')).toBe('28042894');
    expect(formatNfNumber('28042638 - RUBI.pdf')).toBe('28042638');
    expect(formatNfNumber('28187656 - FANHO.pdf')).toBe('28187656');
    expect(formatNfNumber('1789943047705-537708083-28003902_-_RUBI_-_LANCADA.pdf')).toBe('28003902');
    expect(formatNfNumber('NFA-053.020.514CARLAO STA JULIANA AGORA.pdf')).toBe('053020514');
  });

  test('fallback embutido 6–8 dígitos sem separador de loja', () => {
    expect(formatNfNumber('notaabc12345678def.pdf')).toBe('12345678');
    expect(formatNfNumber('notaabc1234567def.pdf')).toBe('1234567');
    expect(formatNfNumber('notaabc123456xyz.pdf')).toBe('123456');
  });

  test('vazio / null → string vazia', () => {
    expect(formatNfNumber('')).toBe('');
    expect(formatNfNumber(null)).toBe('');
    expect(formatNfNumber(undefined)).toBe('');
  });
});

describe('formatRomaneioNumber', () => {
  test('normaliza canhoto para 5 dígitos com zero à esquerda', () => {
    expect(formatRomaneioNumber(9733)).toBe('09733');
    expect(formatRomaneioNumber('9733')).toBe('09733');
    expect(formatRomaneioNumber('09733')).toBe('09733');
    expect(formatRomaneioNumber('romaneio 123')).toBe('00123');
  });

  test('vazio / null → string vazia', () => {
    expect(formatRomaneioNumber('')).toBe('');
    expect(formatRomaneioNumber(null)).toBe('');
    expect(formatRomaneioNumber(undefined)).toBe('');
    expect(formatRomaneioNumber('abc')).toBe('');
  });
});

describe('extractRomaneioFromFilename', () => {
  test('prefixo numérico no canhoto (09733-01082026.jpeg)', () => {
    expect(extractRomaneioFromFilename('09733-01082026.jpeg')).toBe('09733');
    expect(extractRomaneioFromFilename('uploads/9733_pedido.pdf')).toBe('09733');
  });

  test('sem número utilizável → vazio', () => {
    expect(extractRomaneioFromFilename('romaneio.pdf')).toBe('');
    expect(extractRomaneioFromFilename('')).toBe('');
    expect(extractRomaneioFromFilename(null)).toBe('');
  });
});

describe('extractRomaneioFromNotes', () => {
  test('lê stamp Planilha VP: NNNN', () => {
    expect(extractRomaneioFromNotes('Produtor: X | Planilha VP: 9733 | ok')).toBe('09733');
    expect(extractRomaneioFromNotes('planilha vp: 123')).toBe('00123');
  });

  test('sem stamp → vazio', () => {
    expect(extractRomaneioFromNotes('Sem referência')).toBe('');
    expect(extractRomaneioFromNotes('')).toBe('');
  });
});

describe('resolveRomaneioNumber', () => {
  test('prioriza sale.romaneioNumber (canhoto), não Sale.id VP', () => {
    expect(resolveRomaneioNumber({
      id: 'VP9734',
      romaneioNumber: '9733'
    })).toBe('09733');
  });

  test('fallback notes → filename; sem dados → vazio (não usa VP)', () => {
    expect(resolveRomaneioNumber({
      id: 'VP9734',
      notes: 'Planilha VP: 8811'
    })).toBe('08811');

    expect(resolveRomaneioNumber({
      id: 'VP9734',
      evidenceFile: '09701-foto.jpeg'
    })).toBe('09701');

    expect(resolveRomaneioNumber({
      id: 'VP9734',
      evidenceFile: 'romaneio.pdf'
    })).toBe('');
  });
});

describe('buildDriveAttachmentName', () => {
  test('NF e Pedido usam romaneio + NF', () => {
    expect(buildDriveAttachmentName('nf', {
      romaneioNumber: '9733',
      nfNumber: '28042894',
      ext: '.pdf'
    })).toBe('09733-NF-28042894.pdf');

    expect(buildDriveAttachmentName('pedido', {
      romaneioNumber: '9733',
      ext: '.jpeg',
      originalName: 'foto.jpeg'
    })).toBe('09733-Pedido.jpeg');
  });

  test('sem romaneio usa SEMROM', () => {
    expect(buildDriveAttachmentName('nf', { nfNumber: '123456', ext: '.pdf' }))
      .toBe('SEMROM-NF-123456.pdf');
  });

  test('ext de originalName, aliases e fallback genérico', () => {
    expect(buildDriveAttachmentName('nfe', {
      romaneioNumber: '1',
      nfFile: 'NF-999999.pdf',
      originalName: 'arquivo.pdf'
    })).toMatch(/00001-NF-999999\.pdf/);

    expect(buildDriveAttachmentName('nota', {
      romaneioNumber: '2',
      nfNumber: '111222',
      ext: 'xml'
    })).toBe('00002-NF-111222.xml');

    expect(buildDriveAttachmentName('evidence', { romaneioNumber: '3', ext: '.png' }))
      .toBe('00003-Pedido.png');
    expect(buildDriveAttachmentName('canhoto', { romaneioNumber: '3', originalName: 'x.jpg' }))
      .toBe('00003-Pedido.jpg');
    expect(buildDriveAttachmentName('romaneio', { romaneioNumber: '3', originalName: 'y.webp' }))
      .toBe('00003-Pedido.webp');

    expect(buildDriveAttachmentName('cp', { romaneioNumber: '4', nfNumber: '55', ext: '.png' }))
      .toBe('00004-CP-disp.png');
    expect(buildDriveAttachmentName('comprovante', {
      romaneioNumber: '4',
      nfNumber: '28040001',
      ext: '.pdf'
    })).toBe('00004-CP-28040001.pdf');
    expect(buildDriveAttachmentName('paymentproof', { romaneioNumber: '4', ext: '.pdf' }))
      .toBe('00004-CP-disp.pdf');

    expect(buildDriveAttachmentName('outro', {
      romaneioNumber: '5',
      originalName: 'path/weird name!.bin'
    })).toBe('00005-weird_name_.bin');

    expect(buildDriveAttachmentName(null, { originalName: 'sem.ext' })).toBe('SEMROM-sem.ext');
    expect(buildDriveAttachmentName('misc', {})).toBe('SEMROM-anexo');
  });
});

describe('classifySaleAttachment', () => {
  test('classifica por campo da venda e por nome', () => {
    expect(classifySaleAttachment('x.pdf', { nfFile: 'x.pdf' })).toBe('nf');
    expect(classifySaleAttachment('VP001 - Pedido-09711.jpeg', {})).toBe('pedido');
    expect(classifySaleAttachment('comprovante-pix.png', {})).toBe('cp');
    expect(classifySaleAttachment('ev.jpg', { evidenceFile: 'ev.jpg' })).toBe('pedido');
    expect(classifySaleAttachment('pay.png', { paymentProofFile: 'pay.png' })).toBe('cp');
    expect(classifySaleAttachment('nota-fiscal.pdf', {})).toBe('nf');
    expect(classifySaleAttachment('VP023 - NF-28042894.pdf', {})).toBe('nf');
    expect(classifySaleAttachment('recibo-loja.pdf', {})).toBe('cp');
    expect(classifySaleAttachment('timestamp-123-clean.pdf', {
      nfFile: 'clean.pdf'
    })).toBe('nf');
    expect(classifySaleAttachment('arquivo-generico.bin', {})).toBe('pedido');
  });
});
