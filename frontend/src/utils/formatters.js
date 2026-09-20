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

export const getCleanFileName = (fileName) => {
  if (!fileName) return '';
  return String(fileName).replace(/^\d{10,15}(-\d+)?-/, '');
};
