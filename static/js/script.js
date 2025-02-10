const statusLabel = document.getElementById('status-label');
const loginbutton = document.getElementById('login-button');
const clearListButton = document.getElementById('login-button')

let credentials = btoa(`"":""`);
loginbutton.addEventListener('click', async () => {
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

clearListButton.addEventListener("click", async () => {
    try {
        // Faz a requisição DELETE para o backend
        const response = await fetch("/api/limpar/", {
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
    }
});