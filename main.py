from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from bs4 import BeautifulSoup
import requests
import os
import zipfile
import time
import shutil
import csv
import re
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from starlette.responses import JSONResponse


# Constantes
_SLEEP_TIME = 1
NF_DIR = "NF"
OUTPUT_ZIP = "relatorio_e_notas.zip"


app = FastAPI()
# Servir arquivos estáticos corretamente
app.mount("/static", StaticFiles(directory="static"), name="static")

# Rota para servir a página inicial (index.html)
@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")

security = HTTPBasic()
USERS = {"admin": "password123", "diogo": "Diogo@2025", "xavier": "Xavier@2025"}  # Usuários e senhas para autenticação

# Endpoint de autenticação
@app.post("/auth")
def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = USERS.get(credentials.username)
    correct_password = correct_username == credentials.password if correct_username else False
    if not correct_username or not correct_password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas.", headers={"WWW-Authenticate": "Basic"})

# Função para limpar pastas
def limpar_pastas(user_dir):
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
    os.makedirs(user_dir, exist_ok=True)

def remover_caracteres_especiais(texto):
    return re.sub(r"[^a-zA-Z0-9\s:/]", "", texto)

# Função para obter dados do cupom
def obter_dados_cupom(qrcode_url, sequencial, user_dir):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.1 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        }
        response = requests.get(qrcode_url, headers=headers)
        response.raise_for_status()

        arquivo_nf = f"{user_dir}/NF{sequencial}.html"
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

# Função para salvar resultados em CSV
def salvar_resultados_em_csv(resultados, nome_csv):
    with open(nome_csv, mode="w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Sequência", "Data", "Hora", "Valor Total", "Erro", "Link"])
        for r in resultados:
            writer.writerow([r["sequencial"], r["data"], r["hora"], r["valor_total"], r.get("erro", "N/A"), r["link"]])

# Função para compactar os resultados
def compactar_relatorio(relatorio_csv):
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(relatorio_csv)
        for root, _, files_ in os.walk(user_dir):
            for file in files_:
                zf.write(os.path.join(root, file))

# Endpoint para processar os links
@app.post("/processar-links/")
async def processar_links(file: UploadFile = File(...), credentials: HTTPBasicCredentials = Depends(authenticate)):
    user_dir = os.path.join(NF_DIR, credentials.username)

    limpar_pastas(user_dir)
    links = (await file.read()).decode("utf-8").splitlines()
    resultados = []

    for idx, link in enumerate(links, start=1):
        resultado = obter_dados_cupom(link, idx, user_dir)
        resultados.append(resultado)
        time.sleep(_SLEEP_TIME)

    # Gerar relatório em CSV
    csv_file = "relatorio_cupons.csv"
    salvar_resultados_em_csv(resultados, csv_file)

    # Compactar resultados
    compactar_relatorio(csv_file)

    return JSONResponse(content={"message": "Processamento concluído com sucesso!", "download_url": "/download-zip"})

# Endpoint para baixar o ZIP
@app.get("/download-zip")
async def download_zip(credentials: HTTPBasicCredentials = Depends(authenticate)):
    if os.path.exists(OUTPUT_ZIP):
        return FileResponse(OUTPUT_ZIP, media_type="application/zip", filename=OUTPUT_ZIP)
    else:
        raise HTTPException(status_code=404, detail="Arquivo ZIP não encontrado.")


# Verifica se está rodando diretamente
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)