const csvButton = document.getElementById('csv');
const statusLabel = document.getElementById('status-label');

desativarBotao();

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

// 🚀 **Função para processar QR Code automaticamente**
async function processarQRCode(qrcode) {
    try {
        statusLabel.innerText = `Enviando QR Code...`;

        const response = await fetch("/api/processar-qrcode/", {
            method: "POST",
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ qrcode_url: qrcode })
        });

        const data = await response.json();

        if (response.ok) {
            statusLabel.innerText = `QR Code enviado! Total processados: ${data.total_qrcodes}`;
            ativarBotao();
        } else {
            console.error("Erro ao processar QR Code:", data.message);
        }
    } catch (error) {
        console.error("Erro ao enviar QR Code:", error);
    }
}

// 📷 **Captura automática do QR Code**
function onQRCodeScanned(qrcode) {
    processarQRCode(qrcode);
}

// 🔍 **Simulação de leitura do QR Code (substituir pela leitura real)**
document.getElementById("video").addEventListener("click", () => {
    const sampleQRCode = "https://sat.sef.sc.gov.br/nfce/consulta?p=123456789";
    onQRCodeScanned(sampleQRCode);
});

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

// 🔹 **Desativar botão de download inicialmente**
function desativarBotao() {
    csvButton.disabled = true;
    csvButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    csvButton.classList.add('bg-gray-400', 'cursor-not-allowed');
}

// 🔹 **Ativar botão de download**
function ativarBotao() {
    csvButton.disabled = false;
    csvButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
    csvButton.classList.add('bg-blue-500', 'hover:bg-blue-600');
}
