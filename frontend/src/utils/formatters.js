export function formatCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatNumber(value, decimals = 0) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) return dateString;
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function formatKg(value) {
  const num = Number(value) || 0;
  return `${formatNumber(num, 0)} kg`;
}
