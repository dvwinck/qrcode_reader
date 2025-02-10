from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from bs4 import BeautifulSoup
import requests
import os
import zipfile
import time
import shutil
import csv
import re
from pydantic import BaseModel
from starlette.responses import JSONResponse
import logging

class QRCodeRequest(BaseModel):
    qrcode_url: str

_SLEEP_TIME = 1
NF_DIR = "NF"
PROCESSING_DIR = "PROCESSING"
OUTPUT_ZIP = "relatorio_e_notas.zip"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dicionário para armazenar os resultados por usuário
resultados = {}
app = FastAPI()

security = HTTPBasic()

USERS = {
    "admin": "ott@2025",
    "diogo": "diogo",
    "xavier": "ott@2025",
    "ricardo": "ott@2025",
    "tatiana": "ott@2025",
    "fabricio": "ott@2025",
    "talita": "ott@2025"
}

@app.post("/auth")
def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    correct_password = USERS.get(credentials.username)
    logger.info(f"username: {credentials.username} pass: {correct_password} - correctpass: {correct_password}")

    # Verifica se o usuário existe e a senha está correta
    if correct_password is None or correct_password != credentials.password:
        raise HTTPException(
            status_code=401,
            detail="Credenciais inválidas.",
            headers={"WWW-Authenticate": "Basic"}
        )

    return {"message": "Autenticação bem-sucedida"}


# Função para limpar pastas
def limpar_pastas(user_dir):
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
    os.makedirs(user_dir, exist_ok=True)
    os.makedirs(f"{user_dir}/{NF_DIR}", exist_ok=True)

def remover_caracteres_especiais(texto):
    return re.sub(r"[^a-zA-Z0-9\s:/]", "", texto)

def obter_dados_cupom(qrcode_url, sequencial, user_dir):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.1 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        }
        response = requests.get(qrcode_url, headers=headers)
        response.raise_for_status()

        arquivo_nf = f"{user_dir}/{NF_DIR}/NF{sequencial}.html"
        with open(arquivo_nf, "w", encoding="utf-8") as f:
            f.write(response.text)

        soup = BeautifulSoup(response.text, "html.parser")
        valor_element = soup.find("span", class_="totalNumb txtMax")
        valor_total = valor_element.text.strip() if valor_element else "Não encontrado"

        emissao_element = soup.find("strong", string=" Emissão: ")
        if emissao_element:
            emissao_data = emissao_element.next_sibling
            emissao_data_limpo = remover_caracteres_especiais(emissao_data)
            partes = emissao_data_limpo.split(" ")
            data = partes[0].strip()
            hora = partes[1].strip()
        else:
            data = "N/A"
            hora = "N/A"

        return {
            "sequencial": sequencial,
            "data": data,
            "hora": hora,
            "valor_total": valor_total,
            "link": qrcode_url,
        }
    except Exception as e:
        return {
            "sequencial": sequencial,
            "data": "N/A",
            "hora": "N/A",
            "valor_total": "N/A",
            "link": qrcode_url,
            "erro": str(e),
        }

def salvar_resultados_em_csv(resultados, nome_csv):
    with open(nome_csv, mode="w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Sequência", "Data", "Hora", "Valor Total", "Erro", "Link"])
        for r in resultados:
            writer.writerow([r["sequencial"], r["data"], r["hora"], r["valor_total"], r.get("erro", "N/A"), r["link"]])

# Função para salvar resultados em HTML
def salvar_resultados_em_arquivo(resultados, nome_arquivo):
    total_valor = sum(
        float(r["valor_total"].replace(",", "."))
        for r in resultados
        if r.get("valor_total") and r["valor_total"].replace(",", ".").replace(".", "", 1).isdigit()
    )
    with open(nome_arquivo, "w", newline="", encoding="utf-8") as f:
        f.write("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Extrato dos Cupons</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
            <div class="container mt-5">
                <h1 class="text-center text-primary mb-4">Extrato dos Cupons</h1>
                <table class="table table-striped table-hover table-bordered">
                    <thead class="table-dark">
        """)
        f.write("<tr><th>Sequência</th><th>Data</th><th>Hora</th><th>Valor Total</th><th>Erro</th><th>Link</th></tr></thead><tbody>")
        for r in resultados:
            f.write(f"<tr><td>{r['sequencial']}</td><td>{r['data']}</td><td>{r['hora']}</td><td>{r['valor_total']}</td><td>{r.get('erro', 'N/A')}</td><td><a href='{r['link']}'>Abrir</a></td></tr>")
        f.write("</tbody></table>")

        f.write(f"""
        <div style="margin-top: 20px; text-align: right;">
            <h4><strong>Total Geral: R$ {total_valor:.2f}</strong></h4>
        </div>
        """)
        f.write(f"</body></html>")

# Função para compactar os resultados
def compactar_relatorio(file, user_dir):
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        # Adiciona o arquivo individual
        zf.write(file, arcname=os.path.basename(file))

        # Adiciona os arquivos do user_dir mantendo a estrutura relativa
        for root, _, files_ in os.walk(user_dir):
            for file in files_:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, user_dir)  # Obtém o caminho relativo
                zf.write(full_path, arcname=relative_path)

def copiar_arquivos_nfe(user_dir):
    origem = "static/arquivos_nfe"
    # Verifica se o diretório de origem existe
    if not os.path.exists(origem):
        raise FileNotFoundError(f"O diretório de origem '{origem}' não foi encontrado.")

    # Verifica se o diretório de destino existe, caso contrário, cria
    if not os.path.exists(user_dir):
        os.makedirs(user_dir, exist_ok=True)

    # Copia todo o conteúdo do diretório de origem para o destino
    for root, dirs, files in os.walk(origem):
        # Caminho relativo da origem
        rel_path = os.path.relpath(root, origem)
        destino_atual = os.path.join(user_dir, rel_path)

        # Cria os diretórios correspondentes no destino
        os.makedirs(destino_atual, exist_ok=True)

        # Copia cada arquivo individualmente
        for file in files:
            origem_arquivo = os.path.join(root, file)
            destino_arquivo = os.path.join(destino_atual, file)
            shutil.copy2(origem_arquivo, destino_arquivo)


status_processamento = {"status": "pendente"}
@app.post("/processar-links/")
async def processar_links(file: UploadFile = File(...), credentials: HTTPBasicCredentials = Depends(security)):
    global status_processamento
    status_processamento["status"] = "em andamento"

    user_dir = os.path.join(PROCESSING_DIR, credentials.username)
    limpar_pastas(user_dir)

    links = (await file.read()).decode("utf-8").splitlines()
    resultados = []

    for idx, link in enumerate(links, start=1):
        resultado = obter_dados_cupom(link, idx, user_dir)
        resultados.append(resultado)
        time.sleep(_SLEEP_TIME)

    # Gerar relatório em CSV
    csv_file = f"{user_dir}/relatorio_cupons.csv"
    report_file = f"{user_dir}/relatorio_cupons.html"
    salvar_resultados_em_csv(resultados, csv_file)
    salvar_resultados_em_arquivo(resultados, report_file)

    # Copiar arquivos padrões
    copiar_arquivos_nfe(user_dir)

    # Compactar resultados
    compactar_relatorio(csv_file,user_dir)

    # Atualiza o status para "concluído"
    status_processamento["status"] = "concluido"

    return JSONResponse(content={"message": "Processamento concluído com sucesso!", "download_url": "/download-zip"})


@app.get("/status-processamento/")
async def get_status_processamento(credentials: HTTPBasicCredentials = Depends(security)):
    return {"status": status_processamento["status"], "download_url": "/download-zip"}

# Endpoint para baixar o ZIP
@app.get("/download-zip")
async def download_zip(credentials: HTTPBasicCredentials = Depends(security)):
    if os.path.exists(OUTPUT_ZIP):
        return FileResponse(OUTPUT_ZIP, media_type="application/zip", filename=OUTPUT_ZIP)
    else:
        raise HTTPException(status_code=404, detail="Arquivo ZIP não encontrado.")

@app.post("/processar-qrcode/")
async def processar_qrcode(request: QRCodeRequest,credentials: HTTPBasicCredentials = Depends(security)):
    """Processa um QR Code individualmente ao ser lido"""
    username = credentials.username
    user_dir = os.path.join(PROCESSING_DIR, username)

    if username not in resultados:
        resultados[username] = []
        limpar_pastas(user_dir)

    sequencial = len(resultados[username]) + 1
    resultado = obter_dados_cupom(request.qrcode_url, sequencial, user_dir)
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
    # Retorna o arquivo ZIPs gerado
    if not os.path.exists(csv_file):
        salvar_resultados_em_csv(resultados[username], csv_file)
        salvar_resultados_em_arquivo(resultados[username], report_file)
        copiar_arquivos_nfe(user_dir)
        compactar_relatorio(OUTPUT_ZIP,user_dir)


    if os.path.exists(OUTPUT_ZIP):
        return FileResponse(OUTPUT_ZIP, media_type="application/zip", filename="relatorio_e_notas.zip")

    return JSONResponse(content={"status": "concluido", "download_url": "/download-relatorio/"}, status_code=200)

# Verifica se está rodando diretamente
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)