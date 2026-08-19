#!/bin/bash
# ==============================================================================
# AgroVenda V2 - Script de Hardening & Blindagem de Segurança para VPS Linux
# ==============================================================================

set -e

echo "🌾 [AgroVenda V2] Iniciando Hardening de Segurança na VPS..."

# 1. Atualizar pacotes do sistema
echo "📦 1. Atualizando pacotes do sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Configurar Firewall UFW
echo "🛡️ 2. Configurando regras de Firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (porta 22), HTTP (80), HTTPS (443) e AgroVenda App (3000)
sudo ufw allow 22/tcp comment 'SSH Remote Access'
sudo ufw allow 80/tcp comment 'HTTP Web'
sudo ufw allow 443/tcp comment 'HTTPS SSL'
sudo ufw allow 3000/tcp comment 'AgroVenda V2 App'

# Bloquear expressamente portas de banco de dados para a internet externa
sudo ufw deny 27017/tcp comment 'Block MongoDB External'
sudo ufw deny 8081/tcp comment 'Block Mongo-Express External'

echo "y" | sudo ufw enable
sudo ufw status verbose

# 3. Configurar Permissões de Uploads e Volumes
echo "📁 3. Ajustando permissões de diretórios..."
mkdir -p backend/uploads
chmod 755 backend/uploads

# 4. Criar Rotina de Backup Automático Diário via Cron
echo "💾 4. Configurando rotina de backup diário (às 03:00 da madrugada)..."
BACKUP_DIR="/root/agrovenda_backups"
mkdir -p "$BACKUP_DIR"

CRON_CMD="0 3 * * * docker exec agrovenda-v2-mongodb mongodump --db agrovenda --archive=$BACKUP_DIR/backup_\$(date +\%Y\%m\%d_\%H\%M\%S).archive --gzip > /dev/null 2>&1"

(crontab -l 2>/dev/null | grep -v "mongodump" ; echo "$CRON_CMD") | crontab -

echo "✅ [AgroVenda V2] Hardening da VPS concluído com sucesso!"
echo "   - Firewall UFW: Ativo e blindado"
echo "   - Portas 27017 e 8081: Bloqueadas para a internet"
echo "   - Backups diários: Agendados para as 03:00 em $BACKUP_DIR"
