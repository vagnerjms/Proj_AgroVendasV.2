const fs = require('fs');
const xml2js = require('xml2js');
let pdfParseLib = null;
try {
  pdfParseLib = require('pdf-parse');
} catch (e) {
  console.warn('Aviso: módulo pdf-parse não carregado antecipadamente:', e.message);
}
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
   * Parse PDF DANFE & NFA-e files using text extraction, tabular parsing and regex heuristics.
   */
  static async _parsePdf(filePath, originalName) {
    const dataBuffer = fs.readFileSync(filePath);
    let text = '';

    // Safely extract text across any pdf-parse version
    try {
      if (!pdfParseLib) {
        pdfParseLib = require('pdf-parse');
      }

      if (typeof pdfParseLib === 'function') {
        const res = await pdfParseLib(dataBuffer);
        text = res?.text || '';
      } else if (pdfParseLib?.default && typeof pdfParseLib.default === 'function') {
        const res = await pdfParseLib.default(dataBuffer);
        text = res?.text || '';
      } else if (pdfParseLib?.PDFParse) {
        try {
          const instance = new pdfParseLib.PDFParse({ data: dataBuffer });
          const res = await instance.getText();
          text = res?.text || '';
        } catch (eInst) {
          const res = await pdfParseLib.PDFParse(dataBuffer);
          text = res?.text || '';
        }
      }
    } catch (e) {
      console.error('Erro na extração de texto do PDF:', e);
      throw new Error(`Falha ao ler texto do PDF: ${e.message}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Não foi possível extrair o texto legível deste arquivo PDF. Certifique-se de que é um PDF com texto selecionável (não apenas uma imagem escaneada sem OCR).');
    }

    // 1. Extrair Chave de Acesso (44 dígitos)
    const keyMatch = text.match(/(\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4}[\s.-]*\d{4})/);
    let nfeKey = keyMatch ? keyMatch[1].replace(/[\s.-]/g, '') : '';
    if (!nfeKey) {
      const pureDigits = text.match(/\b\d{44}\b/);
      if (pureDigits) nfeKey = pureDigits[0];
    }

    // 2. Extrair Número da Nota e Série
    let nNF = '';
    let serie = '';
    const nfMatch = text.match(/NFA-e[\s\S]*?N[º°o]?\s*([\d.]+)/i) || 
                   text.match(/DANFE[\s\S]*?N[º°o]?\s*([\d.]+)/i) || 
                   text.match(/N[º°o]:?\s*([\d.]+)/i) ||
                   originalName.match(/(\d{7,9})/);
    if (nfMatch) {
      nNF = nfMatch[1].replace(/\./g, '');
    }
    const serieMatch = text.match(/S[ÉE]RIE:?\s*(\d+)/i);
    if (serieMatch) serie = serieMatch[1];

    // 3. Extrair Data de Emissão
    let dhEmi = new Date().toISOString().split('T')[0];
    const dateMatch = text.match(/DATA\s*(?:DA\s*)?EMISS[ÃA]O[\s\r\n:]+([0-3]?\d)\/([0-1]?\d)\/(\d{2,4})/i) ||
                      text.match(/PROTOCOLO[\s\S]*?-\s*([0-3]?\d)\/([0-1]?\d)\/(\d{2,4})/i) ||
                      text.match(/([0-3]?\d)\/([0-1]?\d)\/(\d{4})/);
    if (dateMatch) {
      let day = dateMatch[1].padStart(2, '0');
      let month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = `20${year}`;
      dhEmi = `${year}-${month}-${day}`;
    }

    // 4. Extrair Emitente (Produtor Rural / Remetente)
    let emitName = '';
    let emitDoc = '';
    let emitIE = '';
    let emitCity = '';
    let emitUF = '';
    let emitAddress = '';

    const emitBlockMatch = text.match(/(?:EMITENTE|REMETENTE)[\s\S]*?(?:DESTINAT[ÁA]RIO|DESTINATARIO)/i);
    const emitBlock = emitBlockMatch ? emitBlockMatch[0] : text;

    const emitDocMatch = emitBlock.match(/(?:CPF|CNPJ)[\s\r\n:]*(\d{2,3}\.?\d{3}\.?\d{3}[/-]?\d{2,4}-?\d{2})/i) ||
                         emitBlock.match(/(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (emitDocMatch) emitDoc = emitDocMatch[1].trim();

    const emitIeMatch = emitBlock.match(/INSCRI[ÇC][ÃA]O\s*ESTADUAL[\s\r\n:]*([\d.-]+)/i);
    if (emitIeMatch) emitIE = emitIeMatch[1].trim();

    const emitNameMatch = emitBlock.match(/(?:NOME\s*\/\s*RAZ[ÃA]O\s*SOCIAL|NOME\s*\/\s*NOME\s*EMPRESARIAL)[\s\r\n:]+([^\r\n]+)/i) ||
                          emitBlock.match(/(?:VENDA|SAIDA|SAÍDA)[\s\r\n]+([A-ZÀ-Ú\s]{4,60})/i);
    if (emitNameMatch) {
      emitName = emitNameMatch[1].replace(/CNPJ|CPF|ENDEREÇO|DATA|BAIRRO|CEP/gi, '').trim();
    }

    const emitMunMatch = emitBlock.match(/MUNIC[ÍI]PIO[\s\S]*?(?:\d{1,5}\s*-\s*)?([A-ZÀ-Ú\s]+)\s+(MG|SP|GO|RJ|PR|BA|RS|SC|ES|MS|MT|DF|TO|PA|PE|CE|MA|PI|RN|PB|AL|SE|RO|AC|AM|RR|AP)/i) ||
                         emitBlock.match(/(?:\d{1,5}\s*-\s*)?([A-ZÀ-Ú\s]+)\s+(MG|SP|GO|RJ|PR|BA|RS|SC|ES|MS|MT|DF|TO|PA)\s+BRASIL/i);
    if (emitMunMatch) {
      emitCity = emitMunMatch[1].replace(/^\d+\s*-\s*/, '').trim();
      emitUF = emitMunMatch[2].trim();
    }

    const emitEndMatch = emitBlock.match(/ENDERE[ÇC]O[\s\r\n:]+([^\r\n]+)/i);
    if (emitEndMatch) {
      emitAddress = emitEndMatch[1].replace(/BAIRRO|DISTRITO|CEP|MUNICÍPIO|FONE/gi, '').trim();
    }

    // 5. Extrair Destinatário (Comprador / CEASA)
    let destName = '';
    let destDoc = '';
    let destIE = '';
    let destCity = '';
    let destUF = '';
    let destAddress = '';

    const destBlockMatch = text.match(/DESTINAT[ÁA]RIO[\s\S]*?(?:C[ÁA]LCULO\s*(?:DO)?\s*IMPOSTO|DADOS\s*DOS\s*PRODUTOS|TRANSPORTADOR)/i);
    const destBlock = destBlockMatch ? destBlockMatch[0] : text;

    const destDocMatch = destBlock.match(/(?:CNPJ|CPF)[\s\r\n:]*(\d{2,3}\.?\d{3}\.?\d{3}[/-]?\d{2,4}-?\d{2})/i) ||
                         destBlock.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/);
    if (destDocMatch) destDoc = destDocMatch[1].trim();

    const destIeMatch = destBlock.match(/INSCRI[ÇC][ÃA]O\s*ESTADUAL[\s\r\n:]*([\d.-]+)/i);
    if (destIeMatch) destIE = destIeMatch[1].trim();

    const destNameMatch = destBlock.match(/(?:NOME\s*\/\s*RAZ[ÃA]O\s*SOCIAL|NOME\s*\/\s*NOME\s*EMPRESARIAL)[\s\r\n:]+([^\r\n]+)/i) ||
                          destBlock.match(/([A-ZÀ-Ú0-9\s.,-]{4,60}\s+(?:LTDA|S\/A|ME|EPP|EIRELI|COMERCIAL|DISTRIBUIDORA|SUPERMERCADOS|HORTIFRUTI))/i);
    if (destNameMatch) {
      destName = destNameMatch[1].replace(/CNPJ|CPF|ENDEREÇO|DATA|BAIRRO|CEP/gi, '').trim();
    }

    const destMunMatch = destBlock.match(/MUNIC[ÍI]PIO[\s\S]*?(?:\d{1,5}\s*-\s*)?([A-ZÀ-Ú\s]+)\s+(MG|SP|GO|RJ|PR|BA|RS|SC|ES|MS|MT|DF|TO|PA|PE|CE|MA|PI|RN|PB|AL|SE|RO|AC|AM|RR|AP)/i) ||
                         destBlock.match(/(?:\d{1,5}\s*-\s*)?([A-ZÀ-Ú\s]+)\s+(MG|SP|GO|RJ|PR|BA|RS|SC|ES|MS|MT|DF|TO|PA)\s+BRASIL/i);
    if (destMunMatch) {
      destCity = destMunMatch[1].replace(/^\d+\s*-\s*/, '').trim();
      destUF = destMunMatch[2].trim();
    }

    const destEndMatch = destBlock.match(/ENDERE[ÇC]O[\s\r\n:]+([^\r\n]+)/i);
    if (destEndMatch) {
      destAddress = destEndMatch[1].replace(/BAIRRO|DISTRITO|CEP|MUNICÍPIO|FONE/gi, '').trim();
    }

    // 6. Extrair Transportador & Placa
    let carrierName = '';
    let truckPlate = '';
    const transpBlockMatch = text.match(/TRANSPORTADOR[\s\S]*?(?:DADOS\s*DOS\s*PRODUTOS|DADOS\s*ADICIONAIS)/i);
    if (transpBlockMatch) {
      const tBlock = transpBlockMatch[0];
      const tNameMatch = tBlock.match(/(?:RAZ[ÃA]O\s*SOCIAL|NOME)[\s\r\n:]+([^\r\n]+)/i);
      if (tNameMatch) carrierName = tNameMatch[1].replace(/CNPJ|PLACA|FRETE|INSCRIÇÃO/gi, '').trim();

      const plateMatch = tBlock.match(/PLACA(?:\s*DO\s*VE[ÍI]CULO)?[\s\r\n:]*([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-?[0-9]{4})/i) ||
                         tBlock.match(/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/);
      if (plateMatch) truckPlate = plateMatch[1].replace('-', '').toUpperCase();
    }

    // 7. Extrair Valor Total da Nota
    let vNF = 0;
    const totalMatch = text.match(/VALOR\s*TOTAL\s*DA\s*NOTA[\s\S]*?R?\$?\s*([\d.,]+)/i) || 
                       text.match(/VALOR\s*TOTAL\s*DOS\s*PRODUTOS[\s\S]*?R?\$?\s*([\d.,]+)/i);
    if (totalMatch) {
      vNF = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // 8. Extrair Tabela de Itens / Produtos (Multi-Produtos)
    const items = [];
    const lines = text.split(/[\r\n]+/);

    // Regex para linhas da tabela de produtos do DANFE / NFA-e
    // Ex: 01 HORTIFRUTIGRANJEIROS - BATATA ESPECIAL 07019000 40 5101 SC 840,0000 80,00 67.200,00 ...
    const itemRowRegex = /^(?:(\d{1,3})\s+)?([A-ZÀ-Ú0-9\s\-–\.\/]+?)\s+(\d{8})\s+(\d{2,3})\s+(\d{4})\s+([A-Z]{2,3})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i;
    const fallbackItemRegex = /^(?:(\d{1,3})\s+)?([A-ZÀ-Ú0-9\s\-–\.\/]{3,60}?)\s+(SC|CX|KG|UN|TON|SACAS|CAIXAS|QUILOS)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i;

    for (const line of lines) {
      const trimmed = line.trim();
      const m1 = trimmed.match(itemRowRegex);
      if (m1) {
        const rawProdDesc = m1[2].trim();
        const unitRaw = m1[6].toUpperCase();
        const qty = parseFloat(m1[7].replace(/\./g, '').replace(',', '.'));
        const unitPrice = parseFloat(m1[8].replace(/\./g, '').replace(',', '.'));
        const totalVal = parseFloat(m1[9].replace(/\./g, '').replace(',', '.'));

        if (qty > 0 && totalVal > 0) {
          items.push(NfeParserService._buildProductItem(rawProdDesc, unitRaw, qty, unitPrice, totalVal));
        }
        continue;
      }

      const m2 = trimmed.match(fallbackItemRegex);
      if (m2) {
        const rawProdDesc = m2[2].trim();
        const unitRaw = m2[3].toUpperCase();
        const qty = parseFloat(m2[4].replace(/\./g, '').replace(',', '.'));
        const unitPrice = parseFloat(m2[5].replace(/\./g, '').replace(',', '.'));
        const totalVal = parseFloat(m2[6].replace(/\./g, '').replace(',', '.'));

        if (qty > 0 && totalVal > 0) {
          items.push(NfeParserService._buildProductItem(rawProdDesc, unitRaw, qty, unitPrice, totalVal));
        }
      }
    }

    // Fallback se a tabela não foi capturada em linhas individuais
    if (items.length === 0) {
      const volMatch = text.match(/QUANTIDADE[\s\S]*?([\d.,]+)\s+([A-Z\s]+)/i);
      let totalQty = volMatch ? parseFloat(volMatch[1].replace(/\./g, '').replace(',', '.')) : 1;
      let prodName = volMatch && volMatch[2] ? volMatch[2].trim() : 'Produto Agrícola';
      if (prodName.includes('BATATA')) prodName = 'Batata Especial';

      let boxW = 29;
      let unit = 'Caixas (29kg)';
      if (prodName.toLowerCase().includes('batata')) {
        boxW = 50;
        unit = 'Sacas (50kg)';
      } else if (prodName.toLowerCase().includes('beterraba')) {
        boxW = 20;
        unit = 'Caixas (20kg)';
      } else if (prodName.toLowerCase().includes('cebola')) {
        boxW = 1;
        unit = 'Granel (kg)';
      }

      const itemKg = totalQty * boxW;
      items.push({
        product: prodName,
        unit: unit,
        boxWeightKg: boxW,
        quantity: totalQty,
        kg: itemKg,
        price: totalQty > 0 && vNF > 0 ? (vNF / totalQty) : 0,
        pricePerKg: itemKg > 0 && vNF > 0 ? (vNF / itemKg) : 0,
        total: vNF,
        dailyQuote: 0,
        valorTotalVP: vNF
      });
    }

    const totalKg = items.reduce((acc, it) => acc + (Number(it.kg) || 0), 0);
    const totalVolumes = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalOperation = vNF > 0 ? vNF : items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

    const previdencia = totalOperation * TAX_RATES.PREVIDENCIA;
    const rat = totalOperation * TAX_RATES.RAT;
    const senar = totalOperation * TAX_RATES.SENAR;
    const funruralTotal = totalOperation * TAX_RATES.FUNRURAL_TOTAL;

    return {
      success: true,
      nfeNumber: nNF,
      nfeKey: nfeKey,
      serie: serie,
      saleDate: dhEmi,
      nfeDate: dhEmi,
      emit: {
        name: emitName || 'Produtor Rural',
        document: emitDoc,
        ie: emitIE,
        city: emitCity,
        uf: emitUF,
        address: emitAddress,
        originText: emitName ? `${emitName} (${emitCity || 'Fazenda'}/${emitUF || 'MG'})` : 'Produtor Rural'
      },
      dest: {
        name: destName || 'Cliente Comprador',
        document: destDoc,
        ie: destIE,
        city: destCity,
        uf: destUF,
        address: destAddress
      },
      transp: {
        carrierName: carrierName,
        truckPlate: truckPlate
      },
      truckPlate: truckPlate,
      carrierName: carrierName,
      totalOperation: totalOperation,
      totalVolumes: totalVolumes,
      totalKg: totalKg,
      items: items,
      funrural: {
        total: funruralTotal,
        previdencia: previdencia,
        rat: rat,
        senar: senar
      }
    };
  }

  /**
   * Helper to normalize product names and packaging weights from PDF lines
   */
  static _buildProductItem(rawDesc, rawUnit, quantity, unitPrice, totalVal) {
    const descLower = rawDesc.toLowerCase();
    let productName = rawDesc.replace(/^HORTIFRUTIGRANJEIROS\s*-\s*/i, '').trim();
    let unit = 'Caixas (29kg)';
    let boxWeightKg = 29;

    if (descLower.includes('batata')) {
      productName = productName.toUpperCase().includes('BATATA') ? productName : `Batata — ${productName}`;
      unit = 'Sacas (50kg)';
      boxWeightKg = 50;
    } else if (descLower.includes('cenoura')) {
      unit = 'Caixas (29kg)';
      boxWeightKg = 29;
    } else if (descLower.includes('beterraba')) {
      unit = 'Caixas (20kg)';
      boxWeightKg = 20;
    } else if (descLower.includes('cebola')) {
      if (rawUnit === 'KG' || descLower.includes('granel')) {
        unit = 'Granel (kg)';
        boxWeightKg = 1;
      } else {
        unit = 'Caixas / Sacos (20kg)';
        boxWeightKg = 20;
      }
    } else if (rawUnit === 'KG') {
      unit = 'Granel (kg)';
      boxWeightKg = 1;
    } else if (rawUnit === 'SC' || rawUnit === 'SACAS') {
      unit = 'Sacas (60kg)';
      boxWeightKg = 60;
    } else if (rawUnit === 'CX' || rawUnit === 'CAIXAS') {
      unit = 'Caixas (29kg)';
      boxWeightKg = 29;
    }

    const isGranel = boxWeightKg === 1 || unit.includes('Granel');
    const kg = isGranel ? quantity : (quantity * boxWeightKg);
    const pKg = kg > 0 ? (totalVal / kg) : (boxWeightKg > 0 ? unitPrice / boxWeightKg : unitPrice);

    return {
      product: productName,
      unit: unit,
      boxWeightKg: boxWeightKg,
      quantity: quantity,
      kg: kg,
      price: unitPrice,
      pricePerKg: pKg,
      total: totalVal,
      dailyQuote: 0,
      valorTotalVP: totalVal
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
