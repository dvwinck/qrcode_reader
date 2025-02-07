#!/bin/bash

# Configurações
DOMINIO="qrcode.ottimizzaautomacaocontabil.com.br"
EMAIL="diogo.winck@gmail.com"
CERTBOT_CONTAINER="certbot"
WEBROOT_PATH="/var/www/certbot"
CRON_JOB="0 3 * * * docker-compose run --rm $CERTBOT_CONTAINER renew && docker-compose restart nginx"

echo "🚀 Iniciando o setup do Certbot para $DOMINIO"

# 1️⃣ Criar o certificado SSL
echo "🔹 Solicitando certificado SSL..."
docker-compose run --rm $CERTBOT_CONTAINER certonly --webroot -w $WEBROOT_PATH \
    --email $EMAIL -d $DOMINIO --agree-tos --no-eff-email --force-renewal

# Verifica se a emissão do certificado foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL criado com sucesso!"
else
    echo "❌ Erro ao gerar o certificado SSL. Verifique os logs do Certbot."
fi
