
const codeReader = new ZXing.BrowserQRCodeReader();
const videoElement = document.getElementById('video');
const codeListElement = document.getElementById('code-list');

let scannedCodes = [];
let lastScannedCode = '';
let isProcessing = false;

async function startCamera(deviceId = null) {
    try {
        // Verifica se o navegador suporta getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Acesso à câmera não suportado neste navegador.");
        }

        // Obtém a lista de câmeras disponíveis
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");

        if (videoDevices.length === 0) {
            throw new Error("Nenhuma câmera encontrada.");
        }

        // Se deviceId não for passado, usa a primeira câmera disponível
        const selectedDeviceId = deviceId || videoDevices[0].deviceId;

        await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
            if (result && !isProcessing) {
                const code = result.text;
                if (code !== lastScannedCode) {
                    lastScannedCode = code;
                    isProcessing = true;
                    addCodeToList(code);
                    setTimeout(() => {
                        isProcessing = false;
                    }, 1000); // Espera 1 segundo antes de escanear novamente
                }
            }
        });

    } catch (error) {
        console.error("Erro ao iniciar a câmera:", error);
        alert("Erro ao acessar a câmera: " + error.message);
    }
}


function addCodeToList(code) {
    if (!scannedCodes.includes(code)) {
        scannedCodes.push(code);
        const listItem = document.createElement('p');
        listItem.classList.add('text-right', 'whitespace-nowrap', 'overflow-hidden'); // Alinha à direita e oculta o que excede
        listItem.textContent = code;
        codeListElement.appendChild(listItem);
    }
}
