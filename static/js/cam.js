import { processarQRCode } from 'js/script.js';

const codeReader = new ZXing.BrowserQRCodeReader();
const videoElement = document.getElementById('video');
const codeListElement = document.getElementById('code-list');

let scannedCodes = [];
let lastScannedCode = '';
let isProcessing = false;
let useBackCamera = true;

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

        let selectedDeviceId = deviceId;

        // Se nenhum deviceId foi passado, escolhe a câmera correta (traseira ou frontal)
        if (!selectedDeviceId) {
            const preferredCamera = videoDevices.find(device =>
                device.label.toLowerCase().includes(useBackCamera ? "back" : "front")
            );

            selectedDeviceId = preferredCamera ? preferredCamera.deviceId : videoDevices[0].deviceId;
        }

        // Para a câmera atual antes de iniciar a nova
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }

        // Inicializa o leitor de QR Code com a câmera selecionada
        await codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, async (result, err) => {
            if (result && !isProcessing) {
                const code = result.text;
                if (code !== lastScannedCode) {
                    lastScannedCode = code;
                    isProcessing = true;
                    addCodeToList(code);
                    setTimeout(() => {
                        isProcessing = false;
                    }, 1000); // Evita leituras duplicadas muito rápidas
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
        processarQRCode(code)
    }
}