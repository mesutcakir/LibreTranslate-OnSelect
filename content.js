// Tooltip elementi oluştur
let tooltip = null;

function createTooltip() {
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'libretranslate-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-family: Arial, sans-serif;
            z-index: 999999;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

function showTooltip(text, x, y) {
    const tip = createTooltip();
    tip.textContent = text;
    tip.style.display = 'block';
    tip.style.left = x + 'px';
    tip.style.top = (y - tip.offsetHeight - 10) + 'px';
}

function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

async function translateText(text, targetLang = 'tr') {
    try {
        const { apiKey, apiUrl } = await chrome.storage.local.get(['apiKey', 'apiUrl']);
        const url = apiUrl || 'https://libretranslate.com';
        
        const response = await fetch(`${url}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: 'auto',
                target: targetLang,
                api_key: apiKey || ''
            })
        });
        
        const data = await response.json();
        return data.translatedText || text;
    } catch (error) {
        console.error('Çeviri hatası:', error);
        return null;
    }
}

// Metin seçimi dinleyicisi
document.addEventListener('mouseup', async (e) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 0 && selectedText.length < 500) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Tooltip'i "Çevriliyor..." ile göster
        showTooltip('Çevriliyor...', e.pageX, e.pageY);
        
        // Çeviriyi yap
        const translated = await translateText(selectedText, 'tr');
        
        if (translated) {
            showTooltip(translated, e.pageX, e.pageY);
        } else {
            hideTooltip();
        }
    } else {
        hideTooltip();
    }
});

// Tıklama ile tooltip'i gizle
document.addEventListener('mousedown', () => {
    hideTooltip();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request === "getSelection") {
        
        const selectionText = window.getSelection().toString();
        
        sendResponse(selectionText);
        
        return true; 
    }
});
