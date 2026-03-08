const instance = document.getElementById("instance");
const apiKey = document.getElementById("apiKey");
const defTargetLg = document.getElementById("defTargetLg");
const tooltipFontSize = document.getElementById("tooltipFontSize");
const tooltipFontSizeValue = document.getElementById("tooltipFontSizeValue");
const tooltipMaxWidth = document.getElementById("tooltipMaxWidth");
const tooltipMaxWidthValue = document.getElementById("tooltipMaxWidthValue");
const tooltipOpacity = document.getElementById("tooltipOpacity");
const tooltipOpacityValue = document.getElementById("tooltipOpacityValue");
const tooltipDuration = document.getElementById("tooltipDuration");
const tooltipDurationValue = document.getElementById("tooltipDurationValue");
const tooltipPreview = document.getElementById("tooltipPreview");
const saveBtn = document.getElementById("saveBtn");

// Varsayılan ayarlar
const defaults = {
    apiUrl: "https://libretranslate.com",
    apiKey: "",
    targetLang: "tr",
    tooltipFontSize: 14,
    tooltipMaxWidth: 300,
    tooltipOpacity: 90,
    tooltipDuration: 10
};

// Ayarları yükle
document.addEventListener("DOMContentLoaded", async () => {
    const storage = await chrome.storage.local.get(defaults);

    instance.value = storage.apiUrl;
    apiKey.value = storage.apiKey;
    defTargetLg.value = storage.targetLang;
    tooltipFontSize.value = storage.tooltipFontSize;
    tooltipMaxWidth.value = storage.tooltipMaxWidth;
    tooltipOpacity.value = storage.tooltipOpacity;
    tooltipDuration.value = storage.tooltipDuration;

    updatePreview();
});

// Preview'i güncelle
function updatePreview() {
    const fontSize = tooltipFontSize.value;
    const maxWidth = tooltipMaxWidth.value;
    const opacity = tooltipOpacity.value / 100;

    tooltipPreview.style.fontSize = fontSize + "px";
    tooltipPreview.style.maxWidth = maxWidth + "px";
    tooltipPreview.style.background = `rgba(0, 0, 0, ${opacity})`;

    tooltipFontSizeValue.textContent = fontSize;
    tooltipMaxWidthValue.textContent = maxWidth;
    tooltipOpacityValue.textContent = tooltipOpacity.value;
    tooltipDurationValue.textContent = tooltipDuration.value;
}

// Slider değişikliklerini dinle
tooltipFontSize.addEventListener("input", updatePreview);
tooltipMaxWidth.addEventListener("input", updatePreview);
tooltipOpacity.addEventListener("input", updatePreview);
tooltipDuration.addEventListener("input", updatePreview);

// Formu kaydet
document.getElementById("settings").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!instance.value.length) {
        alert("Lütfen API adresini girin!");
        return;
    }

    await chrome.storage.local.set({
        apiUrl: instance.value,
        apiKey: apiKey.value,
        targetLang: defTargetLg.value,
        tooltipFontSize: parseInt(tooltipFontSize.value),
        tooltipMaxWidth: parseInt(tooltipMaxWidth.value),
        tooltipOpacity: parseInt(tooltipOpacity.value),
        tooltipDuration: parseInt(tooltipDuration.value)
    });

    saveBtn.disabled = true;
    saveBtn.textContent = "✓ Kaydedildi!";
    saveBtn.style.background = "#4CAF50";
    
    setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = "Kaydet";
        saveBtn.style.background = "#4CAF50";
    }, 2000);
});
