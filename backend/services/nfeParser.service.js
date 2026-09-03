const fs = require('fs');
const xml2js = require('xml2js');
const { PDFParse } = require('pdf-parse');
const { TAX_RATES } = require('../constants');

class NfeParserService {
  /**
   * Main parsing dispatcher for PDF DANFE or XML SEFAZ files.
   */
  static async parse(filePath, originalName = 'nfe.xml', rawXmlContent = null) {
    const isPdf = originalName.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      return this._parsePdf(filePath, originalName);
    }
    return this._parseXml(filePath, originalName, rawXmlContent);
  }

  /**
   * Parse PDF DANFE files using text recognition and regex heuristics.
   */
  static async _parsePdf(filePath, originalName) {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfInstance = new PDFParse({ data: dataBuffer });
    const pdfResult = await pdfInstance.getText();
    const text = pdfResult.text || '';

    // Extract Access Key (44 digits)
    const keyMatch = text.match(/(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/);
    const nfeKey = keyMatch ? keyMatch[1].replace(/\s+/g, '') : '';

    // Extract NF Number
    const nfMatch = text.match(/(\d{7,9})\s*Nº\s*SÉRIE/i) || text.match(/Nº\s*(\d{7,9})/i) || originalName.match(/(\d{7,9})/);
    const nNF = nfMatch ? nfMatch[1] : '';

    // Extract Destination (Buyer)
    let destName = '';
    if (text.includes('HORTIFRUTI RUBI')) destName = 'HORTIFRUTI RUBI LTDA';
    else if (text.includes('BADIN FAVILLA')) destName = 'BADIN FAVILLA HORTIFRUTI LTDA';
    else if (text.includes('AZEVEDO')) destName = 'COMERCIAL DE VERDURAS AZEVEDO LTDA';
    else if (text.includes('WD')) destName = 'COMERCIAL DE VERDURAS WD LTDA';
    else if (text.includes('HORT BOM')) destName = 'HORT BOM ALIMENTOS LTDA';
    else if (text.includes('HARADA')) destName = 'MARCELO KATSUMI HARADA';
    else if (text.includes('W & A') || text.includes('W&A')) destName = 'W & A DISTRIBUIDORA DE VERDURAS LTDA';
    else {
      const destExtract = text.match(/DESTINATÁRIO[\s\S]*?NOME\s*\/\s*RAZÃO\s*SOCIAL[\s\r\n]+([^\r\n]+)/i);
      if (destExtract) destName = destExtract[1].trim();
    }

    // Extract Emission Date
    let dhEmi = new Date().toISOString().split('T')[0];
    const dateMatch = text.match(/DATA DE EMISSÃO[\s\r\n]+(\d{2})\/(\d{2})\/(\d{2,4})/i);
    if (dateMatch) {
      let yr = dateMatch[3];
      if (yr.length === 2) yr = `20${yr}`;
      dhEmi = `${yr}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Extract Total Value & Unit Price
    let vNF = 0;
    let unitPrice = 0;
    const prodMatch = text.match(/(?:CENOURA|CEBOLA|BATATA|BETERRABA|SOJA|MILHO|PRODUTO)[^\n]*?([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i);
    if (prodMatch) {
      const p1 = parseFloat(prodMatch[1].replace(/\./g, '').replace(',', '.'));
      const p2 = parseFloat(prodMatch[2].replace(/\./g, '').replace(',', '.'));
      const p3 = parseFloat(prodMatch[3].replace(/\./g, '').replace(',', '.'));
      if (p3 > 0) vNF = p3;
      if (p2 > 0) unitPrice = p2;
    }

    if (!vNF || vNF === 0) {
      const impMatch = text.match(/0,00\s+0,00\s+0,00\s+0,00\s+([\d.,]+)/) || text.match(/(?:BASE\s*DE\s*CÁLCULO|TOTAL\s*DA\s*NOTA)[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (impMatch) {
        vNF = parseFloat(impMatch[1].replace(/\./g, '').replace(',', '.'));
      }
    }

    // Extract Net Weight (kg)
    let pesoL = 0;
    const pesoMatch = text.match(/PESO\s*LÍQUIDO[\s\r\n]+([\d.,]+)/i);
    if (pesoMatch) {
      const rawPeso = pesoMatch[1].trim();
      pesoL = parseFloat(rawPeso.replace(/\./g, '').replace(',', '.'));
    }
    if (unitPrice === 0 && pesoL > 0 && vNF > 0) {
      unitPrice = vNF / pesoL;
    }

    // Extract Product
    let productName = 'Cenoura (Caixa 29kg)';
    if (text.toLowerCase().includes('cebola')) productName = 'Cebola — Granel (kg)';
    else if (text.toLowerCase().includes('cenoura')) productName = 'Cenoura (Caixa 29kg)';
    else if (text.toLowerCase().includes('beterraba')) productName = 'Beterraba (Caixa 20kg)';

    const previdencia = vNF * TAX_RATES.PREVIDENCIA;
    const rat = vNF * TAX_RATES.RAT;
    const senar = vNF * TAX_RATES.SENAR;
    const funruralTotal = vNF * TAX_RATES.FUNRURAL_TOTAL;

    return {
      success: true,
      nfeNumber: nNF,
      nfeKey: nfeKey,
      saleDate: dhEmi,
      nfeDate: dhEmi,
      emit: {
        name: 'BRUNO PERES ROMEIRO',
        document: '037.582.631-90',
        city: 'Campo Alegre de Goiás',
        uf: 'GO',
        originText: 'BRUNO PERES ROMEIRO (Fazenda Campo Alegre/GO)'
      },
      dest: {
        name: destName || 'Cliente Comprador',
        document: '',
        city: 'Goiânia',
        uf: 'GO'
      },
      totalOperation: vNF,
      totalVolumes: pesoL > 0 ? (pesoL / 29) : 0,
      totalKg: pesoL,
      items: [
        {
          product: productName,
          quantity: pesoL > 0 ? (pesoL / 29) : 1,
          unit: 'Caixas (29kg)',
          price: (pesoL > 0 && vNF > 0) ? (vNF / pesoL) : 0,
          total: vNF,
          kg: pesoL
        }
      ],
      funrural: {
        total: funruralTotal,
        previdencia: previdencia,
        rat: rat,
        senar: senar
      }
    };
  }

  /**
   * Parse XML SEFAZ Model 55
   */
  static async _parseXml(filePath, originalName, rawXmlContent) {
    let xmlContent = rawXmlContent;
    if (!xmlContent && filePath && fs.existsSync(filePath)) {
      xmlContent = fs.readFileSync(filePath, 'utf-8');
    }
    if (!xmlContent) {
      throw new Error('Nenhum conteúdo XML fornecido.');
    }

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const parsed = await parser.parseStringPromise(xmlContent);

    const nfe = parsed.nfeProc ? parsed.nfeProc.NFe : (parsed.NFe || parsed);
    const infNFe = nfe?.infNFe || parsed;

    if (!infNFe) {
      throw new Error('Estrutura de XML de NF-e inválida');
    }

    let nfeKey = '';
    if (infNFe.$ && infNFe.$.Id) {
      nfeKey = infNFe.$.Id.replace(/^NFe/, '');
    } else if (parsed.nfeProc?.protNFe?.infProt?.chNFe) {
      nfeKey = parsed.nfeProc.protNFe.infProt.chNFe;
    }

    const emit = infNFe.emit || {};
    const emitName = emit.xNome || '';
    const emitDoc = emit.CNPJ || emit.CPF || '';
    const emitIE = emit.IE || '';
    const emitCity = emit.enderEmit?.xMun || '';
    const emitUF = emit.enderEmit?.UF || '';
    const emitAddress = [emit.enderEmit?.xLgr, emit.enderEmit?.nro, emit.enderEmit?.xBairro].filter(Boolean).join(', ');

    const dest = infNFe.dest || {};
    const destName = dest.xNome || '';
    const destDoc = dest.CNPJ || dest.CPF || '';
    const destIE = dest.IE || '';
    const destCity = dest.enderDest?.xMun || '';
    const destUF = dest.enderDest?.UF || '';
    const destAddress = [dest.enderDest?.xLgr, dest.enderDest?.nro, dest.enderDest?.xBairro].filter(Boolean).join(', ');

    const ide = infNFe.ide || {};
    const nNF = ide.nNF || '';
    const dhEmi = ide.dhEmi ? ide.dhEmi.split('T')[0] : (ide.dEmi || new Date().toISOString().split('T')[0]);

    const total = infNFe.total?.ICMSTot || {};
    const vNF = Number(total.vNF) || 0;
    const vProd = Number(total.vProd) || vNF;

    const transp = infNFe.transp || {};
    const vol = transp.vol ? (Array.isArray(transp.vol) ? transp.vol[0] : transp.vol) : {};
    const pesoL = Number(vol.pesoL) || (vNF > 0 ? Math.round(vNF * 0.45) : 0);
    const qVol = Number(vol.qVol) || Math.round(pesoL / 60) || 1;

    let items = [];
    const detList = infNFe.det ? (Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det]) : [];
    
    if (detList.length > 0) {
      items = detList.map(d => {
        const prod = d.prod || {};
        const rawName = prod.xProd || 'Produto Agrícola';
        const q = Number(prod.qCom) || 1;
        const vUn = Number(prod.vUnCom) || (vProd / q);
        const vTot = Number(prod.vProd) || (q * vUn);
        const u = (prod.uCom || '').toUpperCase();
        
        // Intelligent product and unit identification
        let resolvedProduct = rawName;
        let resolvedUnit = 'Caixas (29kg)';
        let boxWeight = 29;
        let itemKg = 0;
        let itemQty = q;

        const isCebola = rawName.toUpperCase().includes('CEBOLA');
        const isCenoura = rawName.toUpperCase().includes('CENOURA');
        const isBeterraba = rawName.toUpperCase().includes('BETERRABA');
        const isGranel = u.includes('KG') || isCebola;

        if (isCebola) {
          resolvedProduct = 'Cebola';
          resolvedUnit = 'Granel (kg)';
          boxWeight = 1;
          itemKg = q;
          itemQty = Math.round(q / 29); // caixas equivalentes
        } else if (isBeterraba) {
          resolvedProduct = 'Beterraba';
          resolvedUnit = 'Caixas (20kg)';
          boxWeight = 20;
          if (u.includes('KG')) {
            itemKg = q;
            itemQty = Math.round(q / 20);
          } else {
            itemQty = q;
            itemKg = q * 20;
          }
        } else if (isCenoura) {
          resolvedProduct = 'Cenoura';
          resolvedUnit = 'Caixas (29kg)';
          boxWeight = 29;
          if (u.includes('KG')) {
            itemKg = q;
            itemQty = Math.round(q / 29);
          } else {
            itemQty = q;
            itemKg = q * 29;
          }
        } else if (isGranel) {
          resolvedUnit = 'Granel (kg)';
          boxWeight = 1;
          itemKg = q;
          itemQty = Math.round(q / 29);
        } else {
          resolvedUnit = 'Caixas (29kg)';
          boxWeight = 29;
          itemQty = q;
          itemKg = q * 29;
        }

        return {
          product: resolvedProduct,
          quantity: itemQty,
          unit: resolvedUnit,
          boxWeightKg: boxWeight,
          price: vUn,
          total: vTot,
          kg: itemKg || q,
          dailyQuote: 0,
          valorTotalVP: 0
        };
      });
    } else {
      items = [{
        product: 'Cenoura',
        quantity: qVol,
        unit: 'Caixas (29kg)',
        boxWeightKg: 29,
        price: qVol > 0 ? Number((vNF / qVol).toFixed(2)) : vNF,
        total: vNF,
        kg: pesoL,
        dailyQuote: 0,
        valorTotalVP: 0
      }];
    }

    const previdencia = vNF * TAX_RATES.PREVIDENCIA;
    const rat = vNF * TAX_RATES.RAT;
    const senar = vNF * TAX_RATES.SENAR;
    const funruralTotal = vNF * TAX_RATES.FUNRURAL_TOTAL;

    return {
      success: true,
      nfeNumber: nNF,
      nfeKey: nfeKey,
      saleDate: dhEmi,
      nfeDate: dhEmi,
      emit: {
        name: emitName,
        document: emitDoc,
        ie: emitIE,
        city: emitCity,
        uf: emitUF,
        address: emitAddress,
        originText: emitName ? (emitCity ? `${emitName} (${emitCity}/${emitUF})` : emitName) : (emitCity ? `Fazenda / Silo - ${emitCity}/${emitUF}` : '')
      },
      dest: {
        name: destName,
        document: destDoc,
        ie: destIE,
        city: destCity,
        uf: destUF,
        address: destAddress
      },
      totalOperation: vNF,
      totalVolumes: qVol,
      totalKg: pesoL,
      items: items,
      funrural: {
        total: funruralTotal,
        previdencia: previdencia,
        rat: rat,
        senar: senar
      }
    };
  }
}

module.exports = NfeParserService;
