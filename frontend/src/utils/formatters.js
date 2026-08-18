import { TAX_RATES } from '../constants/agriConstants';

export const formatCurrency = (val) => {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatNumber = (val, decimals = 0) => {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatDateBR = (dateStr) => {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('T')[0].split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
};

export const formatDate = formatDateBR;

export const formatKg = (val) => {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + ' kg';
};

export const calculateFunrural = (totalOperation) => {
  const total = Number(totalOperation) || 0;
  const previdencia = total * TAX_RATES.PREVIDENCIA;
  const rat = total * TAX_RATES.RAT;
  const senar = total * TAX_RATES.SENAR;
  return {
    previdencia,
    rat,
    senar,
    funruralTotal: total * TAX_RATES.FUNRURAL_TOTAL
  };
};
