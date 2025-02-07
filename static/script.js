
const exportButton = document.getElementById('export');
const downloadButton = document.getElementById('download');
const csvButton = document.getElementById('csv');
const statusLabel = document.getElementById('status-label'); // Novo label
desativarBotao();

let credentials = btoa(`"":""`);
document.getElementById('login-button').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    credentials = btoa(`${username}:${password}`);

    // Codifica o usuário e senha em Base64


    const response = await fetch('/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`  // Adiciona a autenticação
        },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        startCamera();
    } else {
        alert('Usuário ou senha inválidos');
    }
});

exportButton.addEventListener('click', async () => {
    if (scannedCodes.length === 0) {
        alert("Nenhum código para exportar!");
        return;
    }
   desativarBotao();

    // Criando um arquivo Blob com os dados escaneados
    const blob = new Blob([scannedCodes.join('\n')], { type: 'text/plain' });
    const formData = new FormData();
    formData.append("file", blob, "scanned-codes.txt");

    try {
        const response = await fetch("/processar-links/", {
            method: "POST",
            headers: {
                // Enviar autenticação Basic Auth (se necessário)
                'Authorization': `Basic ${credentials}`  // Adiciona a autenticação
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusLabel.innerText =("Processamento iniciado. Aguarde...");

            // Verifica periodicamente se o processamento foi concluído
            await verificarProcessamentoConcluido();
        } else {
            statusLabel.innerText =("Erro no processamento: " + (data.message || "Erro desconhecido"));
        }
    } catch (error) {
        console.error("Erro ao enviar os links:", error);
        statusLabel.innerText =("Erro ao conectar-se ao servidor.", error);
    }
});

// Função para verificar o status do processamento no backend
async function verificarProcessamentoConcluido() {
    try {
        while (true) {
            const statusResponse = await fetch("/status-processamento/", {
                method: "GET",
                headers: {
                    'Authorization': `Basic ${credentials}`  // Adiciona a autenticação
                }
            });

            const statusData = await statusResponse.json();

            if (statusResponse.ok && statusData.status === "concluido") {
                statusLabel.innerText =("Processamento concluído com sucesso! Você pode baixar o relatório.");
                ativarBotao()
                return;
            }

            // Aguarda 5 segundos antes de verificar novamente
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    } catch (error) {
        console.error("Erro ao verificar status:", error);
        statusLabel.innerText =("Erro ao verificar o status do processamento.");
    }
}

downloadButton.addEventListener('click', () => {
    const blob = new Blob([scannedCodes.join('\n')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scanned-codes.txt';
    link.click();
});

csvButton.addEventListener('click', async () => {
    try {
        const response = await fetch("http://localhost:8000/download-zip", {
            method: "GET",
            headers: {
                "Authorization": `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            throw new Error("Falha ao baixar o arquivo.");
        }

        // Criar um blob com os dados recebidos
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        // Criar um link e forçar o download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "relatorio.zip"; // Nome do arquivo baixado
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Erro ao baixar o arquivo:", error);
        alert("Erro ao baixar o arquivo.");
    }
});

// Função para desativar o botão (ficará cinza)
function desativarBotao() {
    csvButton.disabled = true;
    csvButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    csvButton.classList.add('bg-gray-400', 'cursor-not-allowed');
}

// Função para ativar o botão (volta ao azul)
function ativarBotao() {
    csvButton.disabled = false;
    csvButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
    csvButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
}


// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('static/service-worker.js').then(() => {
        console.log('Service Worker registered successfully');
    }).catch(error => {
        console.error('Service Worker registration failed:', error);
    });
}
