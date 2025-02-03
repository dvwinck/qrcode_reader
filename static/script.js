document.getElementById('login-button').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        startCamera();
    } else {
        alert('Invalid login credentials');
    }
});

const codeReader = new ZXing.BrowserQRCodeReader();
const videoElement = document.getElementById('video');
const codeListElement = document.getElementById('code-list');
const exportButton = document.getElementById('export');
let scannedCodes = [];
let lastScannedCode = '';
let isProcessing = false;

async function startCamera(deviceId = null) {
    try {
        await codeReader.decodeFromVideoDevice(deviceId, videoElement, async (result, err) => {
            if (result && !isProcessing) {
                const code = result.text;
                if (code !== lastScannedCode) {
                    lastScannedCode = code;
                    isProcessing = true;
                    addCodeToList(code);
                    setTimeout(() => {
                        isProcessing = false;
                    }, 1000); // Wait 1 second before scanning again
                }
            }
        });
    } catch (error) {
        console.error('Error starting camera:', error);
    }
}

function addCodeToList(code) {
    if (!scannedCodes.includes(code)) {
        scannedCodes.push(code);
        const listItem = document.createElement('li');
        listItem.textContent = code;
        codeListElement.appendChild(listItem);
    }
}

exportButton.addEventListener('click', () => {
    const blob = new Blob([scannedCodes.join('\n')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scanned-codes.txt';
    link.click();
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(() => {
        console.log('Service Worker registered successfully');
    }).catch(error => {
        console.error('Service Worker registration failed:', error);
    });
}
