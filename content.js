// Script yüklendiğinde log
console.log('LibreTranslate: Content script loaded!');

// Tooltip elementi oluştur
let tooltip = null;
let tooltipSettings = {
    fontSize: 14,
    maxWidth: 300,
    opacity: 90,
    duration: 10
};

// Ayarları yükle
chrome.storage.local.get(['tooltipFontSize', 'tooltipMaxWidth', 'tooltipOpacity', 'tooltipDuration'], (result) => {
    if (result.tooltipFontSize) tooltipSettings.fontSize = result.tooltipFontSize;
    if (result.tooltipMaxWidth) tooltipSettings.maxWidth = result.tooltipMaxWidth;
    if (result.tooltipOpacity) tooltipSettings.opacity = result.tooltipOpacity;
    if (result.tooltipDuration) tooltipSettings.duration = result.tooltipDuration;
    console.log('LibreTranslate: Settings loaded:', tooltipSettings);
});

// Ayarlar değiştiğinde güncelle
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.tooltipFontSize) tooltipSettings.fontSize = changes.tooltipFontSize.newValue;
        if (changes.tooltipMaxWidth) tooltipSettings.maxWidth = changes.tooltipMaxWidth.newValue;
        if (changes.tooltipOpacity) tooltipSettings.opacity = changes.tooltipOpacity.newValue;
        if (changes.tooltipDuration) tooltipSettings.duration = changes.tooltipDuration.newValue;
        console.log('LibreTranslate: Settings updated:', tooltipSettings);
        
        // Tooltip varsa yeniden oluştur
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
    }
});

function createTooltip() {
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'libretranslate-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Ayarlara göre stil uygula
    const opacity = tooltipSettings.opacity / 100;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, ${opacity});
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: ${tooltipSettings.fontSize}px;
        font-family: Arial, sans-serif;
        z-index: 999999;
        max-width: ${tooltipSettings.maxWidth}px;
        word-wrap: break-word;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        display: none;
        line-height: 1.4;
    `;
    
    return tooltip;
}

function showTooltip(text, mouseX, mouseY) {
    const tip = createTooltip();
    tip.textContent = text;
    tip.style.display = 'block';
    
    // iframe içindeyse farklı hesaplama yap
    if (window !== window.top) {
        // iframe içindeyiz - clientX/Y zaten iframe içinde doğru
        // Sadece iframe'in kendi scroll'unu ekle
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        tip.style.left = (mouseX + scrollX) + 'px';
        tip.style.top = (mouseY + scrollY + 15) + 'px';
    } else {
        // Ana penceredeyiz - normal hesaplama
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        tip.style.left = (mouseX + scrollX) + 'px';
        tip.style.top = (mouseY + scrollY + 15) + 'px';
    }
    
    // Tooltip genişliğini al ve ekran dışına taşmasını engelle
    requestAnimationFrame(() => {
        const tipRect = tip.getBoundingClientRect();
        const currentLeft = parseInt(tip.style.left);
        const currentTop = parseInt(tip.style.top);
        
        // Sağa taşıyorsa sola kaydır
        if (tipRect.right > window.innerWidth - 5) {
            tip.style.left = (currentLeft - (tipRect.right - window.innerWidth) - 5) + 'px';
        }
        
        // Sola taşıyorsa sağa kaydır
        if (tipRect.left < 5) {
            tip.style.left = '5px';
        }
        
        // Alta taşıyorsa üste koy
        if (tipRect.bottom > window.innerHeight - 5) {
            tip.style.top = (currentTop - tipRect.height - 25) + 'px';
        }
        
        // Üste taşıyorsa alta koy
        if (parseInt(tip.style.top) < 5) {
            tip.style.top = (currentTop + 25) + 'px';
        }
    });
}

function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

async function translateText(text, targetLang = null) {
    try {
        // Ayarları al
        const settings = await chrome.storage.local.get(['apiKey', 'apiUrl', 'targetLang']);
        const url = settings.apiUrl || 'https://libretranslate.com';
        const target = targetLang || settings.targetLang || 'tr';
        
        console.log('LibreTranslate: Using API URL:', url);
        console.log('LibreTranslate: Target language:', target);
        
        const response = await fetch(`${url}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: 'auto',
                target: target,
                format: 'text',
                api_key: settings.apiKey || ''
            })
        });
        
        if (!response.ok) {
            console.error('LibreTranslate: API error', response.status, response.statusText);
            const errorText = await response.text();
            console.error('LibreTranslate: Error details:', errorText);
            return null;
        }
        
        const data = await response.json();
        console.log('LibreTranslate: API Response:', data);
        
        // translatedText field'ını al (string veya array olabilir)
        if (data.translatedText) {
            // Eğer array ise ilk elemanı al
            if (Array.isArray(data.translatedText)) {
                return data.translatedText[0] || null;
            }
            // String ise direkt döndür
            return data.translatedText;
        }
        
        console.error('LibreTranslate: No translatedText in response:', data);
        return null;
    } catch (error) {
        console.error('LibreTranslate: Translation error:', error);
        return null;
    }
}

// HTML elementlerinden text içeriğini çıkar
function extractTextFromSelection(selection) {
    if (!selection.rangeCount) {
        console.log('LibreTranslate: No range selected');
        return '';
    }
    
    try {
        const range = selection.getRangeAt(0);
        const container = range.cloneContents();
        
        // Geçici bir div oluştur ve içeriği oraya koy
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(container);
        
        // textContent ile tüm text içeriğini al (HTML tagları olmadan)
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Fazla boşlukları temizle
        text = text.replace(/\s+/g, ' ').trim();
        
        console.log('LibreTranslate: Extracted text:', text);
        return text;
    } catch (error) {
        console.error('LibreTranslate: Error extracting text:', error);
        // Fallback: basit toString kullan
        return selection.toString().trim();
    }
}

// Aktif çeviri durumu
let isTranslating = false;
let currentTooltipTimeout = null;

// Metin seçimi dinleyicisi
document.addEventListener('mouseup', async (e) => {
    // Developer tools veya extension sayfalarında çalışma
    if (window.location.protocol === 'chrome-extension:' || 
        window.location.protocol === 'devtools:') {
        return;
    }
    
    // Tooltip'e tıklanmışsa işlem yapma
    if (e.target && e.target.id === 'libretranslate-tooltip') {
        return;
    }
    
    const selection = window.getSelection();
    
    // HTML içeriği dahil tüm text'i al
    const selectedText = extractTextFromSelection(selection);
    
    console.log('LibreTranslate: Selected text:', selectedText);
    
    if (selectedText && selectedText.length > 0 && selectedText.length < 5000) {
        // Mouse pozisyonunu kullan (seçimin bittiği yer)
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Önceki timeout'u temizle
        if (currentTooltipTimeout) {
            clearTimeout(currentTooltipTimeout);
        }
        
        // Tooltip'i "Çevriliyor..." ile göster
        isTranslating = true;
        showTooltip('Çevriliyor...', mouseX, mouseY);
        
        console.log('LibreTranslate: Starting translation...');
        
        // Çeviriyi yap (targetLang parametresini verme, ayarlardan alsın)
        const translated = await translateText(selectedText);
        
        console.log('LibreTranslate: Translation result:', translated);
        
        isTranslating = false;
        
        if (translated && translated !== selectedText) {
            showTooltip(translated, mouseX, mouseY);
            
            // Ayarlardaki süre kadar sonra otomatik gizle (saniye -> milisaniye)
            currentTooltipTimeout = setTimeout(() => {
                hideTooltip();
            }, tooltipSettings.duration * 1000);
        } else if (translated === selectedText) {
            showTooltip('Çeviri yapılamadı (aynı dil olabilir)', mouseX, mouseY);
            currentTooltipTimeout = setTimeout(hideTooltip, 3000);
        } else {
            showTooltip('Çeviri hatası', mouseX, mouseY);
            currentTooltipTimeout = setTimeout(hideTooltip, 2000);
        }
    } else if (selectedText.length >= 5000) {
        showTooltip('Metin çok uzun (max 5000 karakter)', e.clientX, e.clientY);
        currentTooltipTimeout = setTimeout(hideTooltip, 2000);
    } else {
        // Seçim yoksa tooltip'i gizle
        if (!isTranslating) {
            hideTooltip();
        }
    }
});

// Tıklama ile tooltip'i gizle (ama seçim yapılırken değil)
document.addEventListener('mousedown', (e) => {
    // Tooltip'e tıklanmışsa gizleme
    if (e.target && e.target.id === 'libretranslate-tooltip') {
        return;
    }
    
    // Çeviri yapılıyorsa gizleme
    if (!isTranslating) {
        hideTooltip();
        if (currentTooltipTimeout) {
            clearTimeout(currentTooltipTimeout);
        }
    }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    
    if (request === "getSelection") {
        
        const selectionText = window.getSelection().toString();
        
        sendResponse(selectionText);
        
        return true; 
    }
});
