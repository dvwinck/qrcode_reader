# Usando Python 3.9 como base
FROM python:3.9

WORKDIR /app

# Copia os arquivos para dentro do container
COPY . .

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Exposição da porta 8000
EXPOSE 8000

# Comando para rodar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]