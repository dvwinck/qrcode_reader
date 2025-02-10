const csvButton = document.getElementById('csv');
const statusLabel = document.getElementById('status-label');

let credentials = btoa(`"":""`);
document.getElementById('login-button').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    credentials = btoa(`${username}:${password}`);

    const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`
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

async function processarQRCode(qrcode) {
    try {
        statusLabel.innerText = `Enviando QR Code...`;

        const response = await fetch("/api/processar-qrcode/", {
            method: "POST",
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrcode_url: qrcode }) // Corrigido para JSON correto
        });

        const data = await response.json();

        if (response.ok) {
            statusLabel.innerText = `QR Code enviado! Total processados: ${data.total_qrcodes}`;
        } else {
            console.error("Erro ao processar QR Code:", data.message);
            statusLabel.innerText = `Erro: ${data.message}`;
        }
    } catch (error) {
        console.error("Erro ao enviar QR Code:", error);
        statusLabel.innerText = "Erro ao enviar QR Code.";
    }
}


// 🎯 **Botão para baixar relatório, CSV e notas**
csvButton.addEventListener('click', async () => {
    try {
        const response = await fetch("/api/download-relatorio/", {
            method: "GET",
            headers: {
                "Authorization": `Basic ${credentials}`
            }
        });
        if (!response.ok) {
            throw new Error("Falha ao baixar o arquivo.");
        }
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "relatorio_e_notas.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Erro ao baixar o arquivo:", error);
        alert("Erro ao baixar o arquivo.");
    }
});

clearListButton.addEventListener("click", () => {
    try {
        // Faz a requisição DELETE para o backend
        // Faz a requisição DELETE para o backend
        const response = await fetch("/limpar", {
            method: "DELETE",
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        // Aguarda a resposta antes de verificar se foi bem-sucedida
        if (!response.ok) {
            throw new Error(`Erro ao limpar: ${response.statusText}`);
        }

        // Limpa os QR Codes do frontend após a resposta bem-sucedida do backend
        scannedCodes = [];
        document.getElementById("code-list").innerHTML = "";
        document.getElementById("qr-count").textContent = "0";

        console.log("Lista de QR Codes limpa com sucesso.");
    } catch (error) {
        console.error("Erro ao tentar limpar QR Codes:", error);
        alert("Erro ao tentar limpar os QR Codes.");
    }
});