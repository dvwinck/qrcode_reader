import { processarQRCode } from './js/script.js';

const codeReader = new ZXing.BrowserQRCodeReader();
const videoElement = document.getElementById('video');
const codeListElement = document.getElementById('code-list');

let scannedCodes = [];
let lastScannedCode = '';
let isProcessing = false;
let useBackCamera = true;
let activeDeviceId = null;

document.getElementById("switch-camera-btn").addEventListener("click", () => {
    useBackCamera = !useBackCamera;
    startCamera();
});

startCamera();

// Atualiza o contador de QR Codes lidos
function updateQRCodeCount() {
    document.getElementById("qr-count").textContent = scannedCodes.length;
}

async function startCamera(deviceId = null) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Acesso à câmera não suportado neste navegador.");
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");

        if (videoDevices.length === 0) {
            throw new Error("Nenhuma câmera encontrada.");
        }

        // Define o dispositivo correto com base na preferência (traseira ou frontal)
        let selectedDeviceId = deviceId;
        if (!selectedDeviceId) {
            const preferredCamera = videoDevices.find(device =>
                device.label.toLowerCase().includes(useBackCamera ? "back" : "front")
            );
            selectedDeviceId = preferredCamera ? preferredCamera.deviceId : videoDevices[0].deviceId;
        }

        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }

        // Se a câmera já está ativa com o mesmo dispositivo, evita reiniciar
        if (selectedDeviceId === activeDeviceId) {
            return;
        }

        // Atualiza o ID do dispositivo ativo
        activeDeviceId = selectedDeviceId;

        // Reseta o leitor antes de iniciar um novo dispositivo
        codeReader.reset();

        // Inicia a leitura do QR Code
        await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
            if (result && !isProcessing) {
                const code = result.text;
                if (code !== lastScannedCode) {
                    lastScannedCode = code;
                    isProcessing = true;
                    addCodeToList(code);
                    setTimeout(() => {
                        isProcessing = false;
                    }, 1000);
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
        updateQRCodeCount();

        const listItem = document.createElement("p");
        listItem.classList.add("text-right", "whitespace-nowrap", "overflow-hidden");
        listItem.textContent = code;
        document.getElementById("code-list").appendChild(listItem);

        processarQRCode(code);
    }
}
