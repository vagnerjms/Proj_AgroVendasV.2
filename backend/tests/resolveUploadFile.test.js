const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  resolveUploadFile,
  resolveUploadFileAsync,
  safeBasename,
  stripUploadPrefix
} = require('../utils/resolveUploadFile');

describe('resolveUploadFile', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agrovenda-uploads-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  test('safeBasename bloqueia path traversal', () => {
    expect(safeBasename('../etc/passwd')).toBe('passwd');
    expect(safeBasename('VP012 - NF-28008239.pdf')).toBe('VP012 - NF-28008239.pdf');
    expect(safeBasename('/uploads/foo.pdf')).toBe('foo.pdf');
    expect(safeBasename('')).toBe('');
  });

  test('stripUploadPrefix remove timestamp Multer', () => {
    expect(stripUploadPrefix('1790984754718-961184305-NF-28008239.pdf')).toBe('NF-28008239.pdf');
  });

  test('match exato', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.pdf'), 'x');
    const hit = resolveUploadFile('a.pdf', { dir: tmpDir });
    expect(hit.filename).toBe('a.pdf');
  });

  test('alias VP012 - NF-xxx encontra ficheiro Multer no disco', () => {
    const diskName = '1790984754718-961184305-NF-28008239.pdf';
    fs.writeFileSync(path.join(tmpDir, diskName), 'pdf-bytes');
    const hit = resolveUploadFile('VP012 - NF-28008239.pdf', { dir: tmpDir });
    expect(hit).toBeTruthy();
    expect(hit.filename).toBe(diskName);
    expect(fs.existsSync(hit.absolutePath)).toBe(true);
  });

  test('NF único no disco via dígitos', () => {
    fs.writeFileSync(path.join(tmpDir, 'nota-NF-11112222.pdf'), 'x');
    const hit = resolveUploadFile('qualquer-11112222.pdf', { dir: tmpDir });
    expect(hit?.filename).toBe('nota-NF-11112222.pdf');
  });

  test('múltiplos NF: prefere ficheiro com prefixo VP', () => {
    fs.writeFileSync(path.join(tmpDir, 'copy-NF-33334444.pdf'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'VP099-extra-NF-33334444.pdf'), 'b');
    const hit = resolveUploadFile('VP099 - NF-33334444.pdf', { dir: tmpDir });
    expect(hit?.filename).toBe('VP099-extra-NF-33334444.pdf');
  });

  test('múltiplos NF sem VP: cai no primeiro hit via formatNfNumber', () => {
    // Nomes sem substring "nf-55556666" no pedido limpo — força ramo nfHits.length > 1
    fs.writeFileSync(path.join(tmpDir, 'loteA_55556666_final.pdf'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'loteB_55556666_final.pdf'), 'b');
    const hit = resolveUploadFile('ref_55556666_final.pdf', { dir: tmpDir });
    expect(hit).toBeTruthy();
    expect(['loteA_55556666_final.pdf', 'loteB_55556666_final.pdf']).toContain(hit.filename);
  });

  test('stat falha → null', () => {
    const name = 'ghost-NF-12121212.pdf';
    fs.writeFileSync(path.join(tmpDir, name), 'x');
    const spy = jest.spyOn(fs, 'statSync').mockImplementation(() => {
      throw new Error('stat boom');
    });
    try {
      expect(resolveUploadFile(name, { dir: tmpDir, diskFiles: [name] })).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  test('inexistente / dir vazio / pedido vazio → null', () => {
    expect(resolveUploadFile('missing.pdf', { dir: tmpDir })).toBeNull();
    expect(resolveUploadFile('', { dir: tmpDir })).toBeNull();
    expect(resolveUploadFile('x.pdf', { dir: path.join(tmpDir, 'no-such-dir') })).toBeNull();
  });

  test('safeBasename tolera URI malformada', () => {
    expect(safeBasename('%E0%A4%A')).toBeTruthy();
  });

  test('resolveUploadFileAsync encontra ficheiro', async () => {
    fs.writeFileSync(path.join(tmpDir, 'async-NF-99990001.pdf'), 'ok');
    const hit = await resolveUploadFileAsync('VP001 - NF-99990001.pdf', { dir: tmpDir });
    expect(hit?.filename).toBe('async-NF-99990001.pdf');
    const miss = await resolveUploadFileAsync('', { dir: tmpDir });
    expect(miss).toBeNull();
    const noDir = await resolveUploadFileAsync('a.pdf', { dir: path.join(tmpDir, 'missing-dir') });
    expect(noDir).toBeNull();
  });
});
