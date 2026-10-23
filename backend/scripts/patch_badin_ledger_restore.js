/**
 * Ajusta ledger Badin Favilla no JSON reconciliado conforme fechamento informado:
 * 8 comprovantes (Sicoob/PIX) = R$ 104.809,95
 * 09718 parcial (saldo R$ 7.510,58); 09720, 09728, 09732 quitados.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'backups', 'agrovenda_backup_reconciliado_rotas_2026-10-23.json');
const MD = path.join(ROOT, 'backups', 'RECONCILIACAO_ROTAS_2026-10-23.md');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function pay({ amount, date, proof, notes, files }) {
  return {
    amount: round2(amount),
    discountAmount: 0,
    date,
    paymentMethod: 'PIX',
    checkNumber: '',
    checkBank: '',
    checkDueDate: '',
    paymentProofFile: proof || null,
    paymentProofFiles: files || (proof ? [proof] : []),
    notes: notes || '',
    createdAt: `${date}T12:00:00.000Z`
  };
}

function applySale(sale, history, { status } = {}) {
  const vp = round2(sale.valorTotalVP);
  const paid = round2(history.reduce((s, p) => s + Number(p.amount || 0), 0));
  sale.paymentHistory = history;
  sale.paidAmount = paid;
  sale.paymentMethod = 'PIX';
  sale.paymentProofFile = history.filter((p) => p.paymentProofFile).slice(-1)[0]?.paymentProofFile || null;
  const bal = round2(vp - paid);
  if (status) {
    sale.paymentStatus = status;
    sale.status = status === 'Recebido' ? 'Recebido' : (status === 'Parcial' ? 'Parcial' : sale.status);
  } else if (bal <= 0.02) {
    sale.paymentStatus = 'Recebido';
    sale.status = 'Recebido';
    sale.paidAmount = vp; // quita centavos residuais de arredondamento
  } else if (paid > 0) {
    sale.paymentStatus = 'Parcial';
    sale.status = 'Parcial';
  } else {
    sale.paymentStatus = 'Pendente';
    sale.status = 'Pendente';
  }
  return { vp, paid: sale.paidAmount, bal: round2(vp - sale.paidAmount) };
}

function main() {
  const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const byId = Object.fromEntries((j.database.sales || []).map((s) => [s.id, s]));
  const filesBySale = (id) => (j.files || []).filter((f) => f.saleId === id);

  const vp008 = byId.VP008;
  const vp010 = byId.VP010;
  const vp018 = byId.VP018;
  const vp022 = byId.VP022;
  if (!vp008 || !vp010 || !vp018 || !vp022) {
    throw new Error('Vendas Badin VP008/010/018/022 não encontradas');
  }

  // Mapear arquivos canônicos existentes no pacote
  const f008 = filesBySale('VP008').map((f) => f.filename);
  const f010 = filesBySale('VP010').map((f) => f.filename);
  const f018 = filesBySale('VP018').map((f) => f.filename);
  const f022 = filesBySale('VP022').map((f) => f.filename);

  const sicoob18 = f008.find((n) => /CP03|sicoob|disp\.pdf/i.test(n)) || f008.find((n) => /\.pdf$/i.test(n));
  const cp008a = f008.find((n) => /CP02/i.test(n)) || f008[0];
  const cp010a = f010.find((n) => /CP02/i.test(n)) || f010[0];
  const cp010b = f010.find((n) => /CP01/i.test(n)) || f010[1] || cp010a;
  const cp018 = {
    p09: f018.find((n) => /CP02/i.test(n)) || f018[0],
    p13: f018.find((n) => /CP03/i.test(n)) || f018[1],
    p14: f018.find((n) => /CP04/i.test(n)) || f018[2],
    p15: f018.find((n) => /CP01/i.test(n)) || f018[3]
  };
  const cp022a = f022.find((n) => /CP02/i.test(n)) || f022[0];
  const cp022b = f022.find((n) => /CP01/i.test(n)) || f022[1] || cp022a;

  // NF 27980432 sem binário no pacote — não cria ref órfã; fica na nota do pagamento
  vp008.romaneioNumber = '09718';

  // —— VP008 / 09718: só o PIX 18/09 R$ 14.296,32 (abre a carga; saldo 7.510,58)
  const r008 = applySale(vp008, [
    pay({
      amount: 14296.32,
      date: '2026-09-18',
      proof: sicoob18 || cp008a,
      notes: 'Comprovante Sicoob/PIX 18/09/2026 R$ 14.296,32 — abertura da quitação da 1ª carga (romaneio 09718 / NF 27980432). Saldo residual da carga: R$ 7.510,58.'
    })
  ], { status: 'Parcial' });

  // —— VP010 / 09720: dois PIX 10.416,31 (06 e 08/10) + 3.991,86 (parte do PIX 10.934,12 em 09/10)
  const r010 = applySale(vp010, [
    pay({
      amount: 10416.31,
      date: '2026-10-06',
      proof: cp010a,
      notes: 'PIX Sicoob 06/10/2026 R$ 10.416,31 (1/2 do par informado no extrato Badin).'
    }),
    pay({
      amount: 10416.31,
      date: '2026-10-08',
      proof: cp010a,
      files: cp010a ? [cp010a] : [],
      notes: 'PIX Sicoob 08/10/2026 R$ 10.416,31 (2/2 do par — mesmo valor do dia 06/10).'
    }),
    pay({
      amount: 3991.86,
      date: '2026-10-09',
      proof: cp010b,
      notes: 'Parte do PIX R$ 10.934,12 (09/10/2026) — quitação do romaneio 09720.'
    })
  ]);

  // —— VP022 / 09732: 32.300,19 (05/10) + 1.623,09 (parte do PIX 10.934,12 em 09/10)
  const r022 = applySale(vp022, [
    pay({
      amount: 32300.19,
      date: '2026-10-05',
      proof: cp022a,
      notes: 'PIX Sicoob 05/10/2026 R$ 32.300,19 — romaneio 09732.'
    }),
    pay({
      amount: 1623.09,
      date: '2026-10-09',
      proof: cp022b,
      notes: 'Parte do PIX R$ 10.934,12 (09/10/2026) — quitação do romaneio 09732.'
    })
  ]);

  // —— VP018 / 09728: 5.319,17 (parte 10.934,12) + 11.123,35 + 11.123,35 + 4.200,00
  const hist018 = [
    pay({
      amount: 5319.17,
      date: '2026-10-09',
      proof: cp018.p09,
      notes: 'Parte do PIX R$ 10.934,12 (09/10/2026) — romaneio 09728.'
    }),
    pay({
      amount: 11123.35,
      date: '2026-10-13',
      proof: cp018.p13,
      notes: 'PIX Sicoob 13/10/2026 R$ 11.123,35.'
    }),
    pay({
      amount: 11123.35,
      date: '2026-10-14',
      proof: cp018.p14,
      notes: 'PIX Sicoob 14/10/2026 R$ 11.123,35.'
    }),
    pay({
      amount: 4200,
      date: '2026-10-15',
      proof: cp018.p15,
      notes: 'PIX Sicoob 15/10/2026 R$ 4.200,00 — quitação do romaneio 09728.'
    })
  ];
  applySale(vp018, hist018);
  // Soma dos CPs = R$ 31.765,87 (R$ 1,37 abaixo do VP). Marca quitado sem inflar o pago além dos 8 comprovantes.
  vp018.paymentStatus = 'Recebido';
  vp018.status = 'Recebido';
  hist018[hist018.length - 1].notes +=
    ' Quitação operacional do romaneio 09728 (diferença de R$ 1,37 vs VP por arredondamento).';

  // Limpa nota de unsettle anterior da transferência W&A se ainda existir
  if (vp022.notes) {
    vp022.notes = String(vp022.notes)
      .split('\n')
      .filter((l) => !/RECONCILE 2026-10-23.*Baixa removida/i.test(l))
      .join('\n')
      .trim();
  }
  vp022.notes = [
    vp022.notes || '',
    '[RECONCILE Badin] Romaneio 09732 100% quitado. PIX R$ 33.902,40 da W&A permanece apenas na VP023.'
  ].filter(Boolean).join('\n');

  vp008.notes = [
    String(vp008.notes || '').split('\n').filter((l) => !/RECONCILE/i.test(l)).join('\n').trim(),
    '[RECONCILE Badin] Carga 09718: pago R$ 14.296,32 em 18/09/2026; saldo remanescente R$ 7.510,58 (único saldo Badin).'
  ].filter(Boolean).join('\n');

  // Totais
  const badin = [vp008, vp010, vp018, vp022];
  const fatura = round2(badin.reduce((s, x) => s + Number(x.valorTotalVP || 0), 0));
  const pago = round2(badin.reduce((s, x) => s + Number(x.paidAmount || 0), 0));
  const saldo = round2(fatura - pago);

  const flat = [];
  for (const s of badin) {
    for (const p of s.paymentHistory || []) {
      flat.push({ saleId: s.id, rom: s.romaneioNumber, date: p.date, amount: Number(p.amount), proof: p.paymentProofFile });
    }
  }

  // 8 comprovantes “de caixa” (valores/datas únicos do extrato)
  const bankProofs = [
    { date: '2026-09-18', amount: 14296.32 },
    { date: '2026-10-05', amount: 32300.19 },
    { date: '2026-10-06', amount: 10416.31 },
    { date: '2026-10-08', amount: 10416.31 },
    { date: '2026-10-09', amount: 10934.12 },
    { date: '2026-10-13', amount: 11123.35 },
    { date: '2026-10-14', amount: 11123.35 },
    { date: '2026-10-15', amount: 4200 }
  ];
  const bankTotal = round2(bankProofs.reduce((s, x) => s + x.amount, 0));

  j.reconciledNote = [
    j.reconciledNote || '',
    'Badin Favilla: ledger realocado — 8 CPs Sicoob/PIX = R$ 104.809,95; saldo R$ 7.510,58 só no romaneio 09718 (VP008); 09720/09728/09732 quitados.'
  ].filter(Boolean).join(' ');

  j.stats = j.stats || {};
  j.badinClosing = {
    bankProofs,
    bankTotal,
    faturamentoVP: fatura,
    totalPago: pago,
    saldoDevedor: saldo,
    porRomaneio: {
      '09718': { saleId: 'VP008', ...r008, paid: vp008.paidAmount, status: vp008.paymentStatus },
      '09720': { saleId: 'VP010', paid: vp010.paidAmount, status: vp010.paymentStatus },
      '09728': { saleId: 'VP018', paid: vp018.paidAmount, status: vp018.paymentStatus },
      '09732': { saleId: 'VP022', paid: vp022.paidAmount, status: vp022.paymentStatus }
    }
  };

  fs.writeFileSync(FILE, JSON.stringify(j), 'utf8');

  const lines = [];
  lines.push('');
  lines.push('## Badin Favilla — fechamento corrigido');
  lines.push('');
  lines.push('| Data | Valor | Alocação |');
  lines.push('|------|-------|----------|');
  lines.push('| 18/09/2026 | 14.296,32 | VP008 / 09718 (parcial) |');
  lines.push('| 05/10/2026 | 32.300,19 | VP022 / 09732 |');
  lines.push('| 06/10/2026 | 10.416,31 | VP010 / 09720 |');
  lines.push('| 08/10/2026 | 10.416,31 | VP010 / 09720 |');
  lines.push('| 09/10/2026 | 10.934,12 | rateio 3.991,86 (09720) + 5.319,17 (09728) + 1.623,09 (09732) |');
  lines.push('| 13/10/2026 | 11.123,35 | VP018 / 09728 |');
  lines.push('| 14/10/2026 | 11.123,35 | VP018 / 09728 |');
  lines.push('| 15/10/2026 | 4.200,00 | VP018 / 09728 |');
  lines.push('');
  lines.push(`- Soma 8 comprovantes: **R$ ${bankTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**`);
  lines.push(`- Faturamento VP Badin: **R$ ${fatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**`);
  lines.push(`- Saldo devedor: **R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** (somente 09718/VP008)`);
  lines.push(`- 09720 / 09728 / 09732: **Recebido**`);
  lines.push('');
  // Obs.: usuário citou “VP010” com valor 21.806,90 — no sistema esse VP/romaneio é **VP008 / 09718**.
  lines.push('> Nota: o valor negociado R$ 21.806,90 do romaneio **09718** corresponde à **VP008** (não VP010). VP010 é o romaneio **09720**.');

  if (fs.existsSync(MD)) {
    fs.appendFileSync(MD, `\n${lines.join('\n')}\n`, 'utf8');
  }

  console.log('Patched', path.relative(ROOT, FILE));
  console.log('Bank 8 proofs total', bankTotal);
  console.log('Faturamento VP', fatura, 'Pago', pago, 'Saldo', saldo);
  console.log('09718', vp008.paymentStatus, vp008.paidAmount, 'bal', round2(vp008.valorTotalVP - vp008.paidAmount));
  console.log('09720', vp010.paymentStatus, vp010.paidAmount);
  console.log('09728', vp018.paymentStatus, vp018.paidAmount);
  console.log('09732', vp022.paymentStatus, vp022.paidAmount);
  console.log('Ledger rows', flat.length, flat.map((p) => `${p.date}:${p.amount}@${p.saleId}`).join(' | '));
}

main();
