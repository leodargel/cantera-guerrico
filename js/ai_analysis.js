/**
 * ai_analysis.js
 * Funciones auxiliares para análisis de imagen de voladura con IA.
 * Las funciones principales (analizarFragmentacionIA, analizarVoladuraConIA,
 * enviarMensajeChatbot) están en ai.js y NO se sobreescriben aquí.
 */

// previewFotoBlast — carga la foto y la convierte a base64 para la API de Gemini
window.previewFotoBlast = function(inputEl) {
    const input   = inputEl || document.getElementById('blast-foto-input');
    const file    = input && input.files && input.files[0];
    if (!file) return;

    const preview = document.getElementById('blast-foto-preview');
    const img     = document.getElementById('blast-foto-img');
    const btn     = document.getElementById('btn-analizar-blast');

    const reader = new FileReader();
    reader.onload = function(e) {
        window._fotoBlastBase64 = e.target.result; // base64 completo (con prefijo)
        if (img)     { img.src = e.target.result; }
        if (preview) { preview.style.display = 'block'; }
        if (btn)     { btn.disabled = false; }
    };
    reader.readAsDataURL(file);
};

// usarResultadoIA — transfiere el P80 sugerido al formulario de voladura
window.usarResultadoIA = function() {
    if (!window.lastAIResult) return;
    const input = document.getElementById('blast-p80');
    if (input) {
        input.value = window.lastAIResult;
        input.dispatchEvent(new Event('change'));
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};
