/**
 * Aplica catálogo Batata (pai)/filhos + 1 Cenoura sobre o JSON reconciliado VP.
 *
 * Entrada: docs/agrovenda_backup_reconciliado_vp_2026-10-02.json
 * Saída:   docs/agrovenda_backup_reconciliado_deploy_2026-10-02.json
 *
 * Uso: node backend/scripts/reconcile_catalog_deploy.js
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');
const IN_PATH = process.env.BACKUP_PATH
  || path.join(ROOT, 'docs', 'agrovenda_backup_reconciliado_vp_2026-10-02.json');
const OUT_PATH = process.env.OUT_PATH
  || path.join(ROOT, 'docs', 'agrovenda_backup_reconciliado_deploy_2026-10-02.json');

const BATATA_CHILDREN = [
  'Batata Especial',
  'Batata Diversa',
  'Batata Primeira X',
  'Batata Bolinha',
  'Batata Miúda Lavada'
];

function main() {
  if (!fs.existsSync(IN_PATH)) {
    throw new Error(`Backup não encontrado: ${IN_PATH}`);
  }

  const backup = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
  let products = Array.isArray(backup.database?.products) ? [...backup.database.products] : [];
  const sales = Array.isArray(backup.database?.sales) ? backup.database.sales : [];

  // Remover Cenoura duplicada (manter PROD-1)
  const cenouraKeep = products.find((p) => p.id === 'PROD-1' && /cenoura/i.test(p.name))
    || products.find((p) => /^cenoura$/i.test(String(p.name || '').trim()));
  if (cenouraKeep) {
    cenouraKeep.name = 'Cenoura';
    cenouraKeep.defaultUnit = cenouraKeep.defaultUnit || 'Caixas (29kg)';
    cenouraKeep.unitKg = Number(cenouraKeep.unitKg) || 29;
    cenouraKeep.parentProductId = null;
  }
  products = products.filter((p) => {
    if (!/cenoura/i.test(p.name || '')) return true;
    return cenouraKeep && p.id === cenouraKeep.id;
  });

  // Criar / garantir Batata pai
  let batataPai = products.find((p) => /^batata$/i.test(String(p.name || '').trim()) && !p.parentProductId);
  if (!batataPai) {
    batataPai = {
      id: 'PROD-BATATA',
      name: 'Batata',
      category: 'Hortifruti',
      defaultUnit: 'Sacas (sc)',
      unitKg: 25,
      currentStock: 0,
      averageCost: 0,
      parentProductId: null
    };
    products.push(batataPai);
  } else {
    batataPai.parentProductId = null;
  }

  for (const childName of BATATA_CHILDREN) {
    let child = products.find((p) => String(p.name || '').trim().toLowerCase() === childName.toLowerCase());
    if (!child) {
      child = {
        id: `PROD-${childName.replace(/\s+/g, '-').toUpperCase()}`,
        name: childName,
        category: 'Hortifruti',
        defaultUnit: childName.includes('Miúda') ? 'Sacas (25kg)' : 'Sacas (sc)',
        unitKg: /primeira|bolinha/i.test(childName) ? 60 : 25,
        currentStock: 0,
        averageCost: 0,
        parentProductId: batataPai.id
      };
      products.push(child);
    } else {
      child.parentProductId = batataPai.id;
    }
  }

  // Remap vendas: Cenoura (Caixa 29kg) → Cenoura
  let remapped = 0;
  for (const sale of sales) {
    if (!Array.isArray(sale.items)) continue;
    for (const it of sale.items) {
      const n = String(it.product || '').trim();
      if (/cenoura/i.test(n) && n.toLowerCase() !== 'cenoura') {
        it.product = 'Cenoura';
        remapped += 1;
      }
    }
  }

  // Sanity baixas
  const paidCenoura = sales.filter((s) => {
    const isC = /cenoura/i.test(JSON.stringify(s.items || []));
    return isC && (Number(s.paidAmount) || 0) > 0;
  });
  const paidOther = sales.filter((s) => {
    const isC = /cenoura/i.test(JSON.stringify(s.items || []));
    return !isC && (Number(s.paidAmount) || 0) > 0;
  });

  const vp034 = sales.find((s) => s.id === 'VP034');
  const vp004 = sales.find((s) => s.id === 'VP004');

  backup.database.products = products;
  backup.database.sales = sales;
  backup.exportedAt = new Date().toISOString();
  backup.reconciledNote = [
    backup.reconciledNote || '',
    'Catálogo: Batata (pai)+filhos; 1 Cenoura; remaps de nome; baixas preservadas.'
  ].filter(Boolean).join(' ');
  backup.stats = {
    ...(backup.stats || {}),
    productsCount: products.length,
    cenouraRemappedItems: remapped,
    batataParentId: batataPai.id
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(backup));

  console.log('=== Catálogo deploy ===');
  console.log('Produtos:', products.map((p) => `${p.id}:${p.name}${p.parentProductId ? `→${p.parentProductId}` : ''}`).join(' | '));
  console.log('Itens remapeados Cenoura:', remapped);
  console.log('Baixas cenoura:', paidCenoura.map((s) => `${s.id}=${s.paidAmount}`).join(', '));
  console.log('Baixas outras:', paidOther.map((s) => `${s.id}=${s.paidAmount}`).join(', '));
  if (vp034) console.log('VP034:', { vp: vp034.valorTotalVP, nf: vp034.totalOperation });
  if (vp004) console.log('VP004:', { vp: vp004.valorTotalVP, nf: vp004.totalOperation });
  console.log('JSON:', OUT_PATH);
  console.log('Bytes:', fs.statSync(OUT_PATH).size);
}

main();
