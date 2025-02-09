from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import requests
import logging
import re

app = FastAPI()
security = HTTPBasic()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Usuários autorizados
USERS = {
    "admin": "ott@2025",
    "diogo": "diogo",
    "xavier": "ott@2025",
    "ricardo": "ott@2025",
    "tatiana": "ott@2025",
    "fabricio": "ott@2025",
    "talita": "ott@2025"
}

# Função de autenticação
@app.post("/auth")
def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    correct_password = USERS.get(credentials.username)
    logger.info(f"username: {credentials.username} pass: {correct_password}")

    if correct_password is None or correct_password != credentials.password:
        raise HTTPException(
            status_code=401,
            detail="Credenciais inválidas.",
            headers={"WWW-Authenticate": "Basic"}
        )

    return {"message": "Autenticação bem-sucedida"}

# Função para remover caracteres especiais
def remover_caracteres_especiais(texto):
    return re.sub(r"[^a-zA-Z0-9\s:/]", "", texto)

# Função para obter os dados do QR Code
def obter_dados_qrcode(qrcode_url):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.1 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        }

        response = requests.get(qrcode_url, headers=headers)
        response.raise_for_status()

        # Verifica se a resposta é válida (conteúdo esperado)
        if "totalNumb" not in response.text:
            raise HTTPException(status_code=400, detail="Conteúdo da página inválido.")

        valor_total = "N/A"
        emissao_data = "N/A"
        emissao_hora = "N/A"

        # Extração usando expressões regulares para maior robustez
        total_match = re.search(r'class="totalNumb txtMax">([\d,\.]+)</span>', response.text)
        if total_match:
            valor_total = total_match.group(1)

        emissao_match = re.search(r'<strong>\s*Emissão:\s*</strong>(.*?)<', response.text)
        if emissao_match:
            partes = remover_caracteres_especiais(emissao_match.group(1)).split()
            if len(partes) >= 2:
                emissao_data, emissao_hora = partes[0], partes[1]

        return {
            "data": emissao_data,
            "hora": emissao_hora,
            "valor_total": valor_total,
            "link": qrcode_url,
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao acessar a URL: {qrcode_url} - Erro: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao acessar a URL: {str(e)}")

# Endpoint para processar QR Codes
@app.post("/processar-qrcode/")
async def processar_qrcode(data: dict, credentials: HTTPBasicCredentials = Depends(security)):
    if "codigo" not in data or not isinstance(data["codigo"], str):
        raise HTTPException(status_code=400, detail="Formato inválido. Envie um JSON com {'codigo': 'URL'}")

    qrcode_url = data["codigo"].strip()
    if not qrcode_url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL inválida para QR Code")

    resultado = obter_dados_qrcode(qrcode_url)
    return resultado

# Inicializa a API
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
