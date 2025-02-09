from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import FileResponse, JSONResponse
import os
import time
import shutil
import zipfile
import logging

# Configuração de diretórios e tempo de espera
_SLEEP_TIME = 1
NF_DIR = "NF"
PROCESSING_DIR = "PROCESSING"
OUTPUT_ZIP = "relatorio_e_notas.zip"

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializa FastAPI
app = FastAPI()
security = HTTPBasic()

# Dicionário para armazenar os resultados por usuário
resultados = {}


# Função para limpar diretórios antes do processamento
def limpar_pastas(user_dir):
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
    os.makedirs(user_dir, exist_ok=True)
    os.makedirs(f"{user_dir}/{NF_DIR}", exist_ok=True)


# Função para compactar relatórios e notas fiscais
def compactar_relatorio(user_dir):
    zip_path = os.path.join(user_dir, OUTPUT_ZIP)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(user_dir):
            for file in files:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, user_dir)
                zf.write(full_path, arcname=relative_path)
    return zip_path


@app.post("/processar-qrcode/")
async def processar_qrcode(qrcode_url: str, credentials: HTTPBasicCredentials = Depends(security)):
    """Processa um QR Code individualmente ao ser lido"""
    username = credentials.username
    user_dir = os.path.join(PROCESSING_DIR, username)

    if username not in resultados:
        resultados[username] = []
        limpar_pastas(user_dir)

    sequencial = len(resultados[username]) + 1
    resultado = obter_dados_cupom(qrcode_url, sequencial, user_dir)
    resultados[username].append(resultado)

    time.sleep(_SLEEP_TIME)

    return JSONResponse(content={"message": "QR Code processado!", "total_qrcodes": len(resultados[username])})


@app.get("/download-relatorio/")
async def download_relatorio(credentials: HTTPBasicCredentials = Depends(security)):
    """Verifica o status do processamento e disponibiliza o download do relatório, CSV e notas"""
    username = credentials.username
    user_dir = os.path.join(PROCESSING_DIR, username)

    if username not in resultados or not resultados[username]:
        return JSONResponse(content={"status": "pendente"}, status_code=200)

    # Gerar CSV e relatório se ainda não foi feito
    csv_file = os.path.join(user_dir, "relatorio_cupons.csv")
    report_file = os.path.join(user_dir, "relatorio_cupons.html")

    if not os.path.exists(csv_file):
        salvar_resultados_em_csv(resultados[username], csv_file)
        salvar_resultados_em_arquivo(resultados[username], report_file)
        copiar_arquivos_nfe(user_dir)
        compactar_relatorio(user_dir)

    # Retorna o arquivo ZIP gerado
    zip_path = os.path.join(user_dir, OUTPUT_ZIP)
    if os.path.exists(zip_path):
        return FileResponse(zip_path, media_type="application/zip", filename="relatorio_e_notas.zip")

    return JSONResponse(content={"status": "concluido", "download_url": "/download-relatorio/"}, status_code=200)
