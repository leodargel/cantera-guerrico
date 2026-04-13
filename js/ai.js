/**
 * AI.JS — Claude API (Anthropic) + Gemini fallback para imágenes
 */

var CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

function _buildCtx() {
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var prodMes = 0, hrsMes = 0;
    (appState.data.produccion || []).forEach(function(p) {
        if (getMonthSafe(p.fecha) === currentMonth && getYearSafe(p.fecha) === currentYear) {
            prodMes += parseFloat(p.tn||0); hrsMes += parseFloat(p.hrs||0);
        }
    });
    return {
        mes: meses[currentMonth] + ' ' + currentYear,
        produccion: prodMes.toLocaleString('es-AR'),
        eficiencia: hrsMes > 0 ? (prodMes/hrsMes).toFixed(1) : 'S/D',
        voladuras: (appState.data.voladuras||[]).length,
        costBlast: (appState.monthlyData.blastCost[currentMonth]||0).toLocaleString('es-AR')
    };
}

function _callClaude(system, userMsg, onSuccess, onError) {
    fetch(CLAUDE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: system,
            messages: [{ role: 'user', content: userMsg }]
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) { onError('❌ ' + d.error.message); return; }
        var txt = (d.content && d.content[0]) ? d.content[0].text : '';
        onSuccess(txt);
    })
    .catch(function(e) { onError('❌ Sin conexión: ' + e.message); });
}

// ── CHATBOT ────────────────────────────────────────────────────────
window.enviarMensajeChatbot = function() {
    var input    = document.getElementById('chatbot-input');
    var messages = document.getElementById('chatbot-messages');
    var texto    = input ? input.value.trim() : '';
    if (!texto || !messages) return;
    input.value = '';

    var uDiv = document.createElement('div');
    uDiv.style.cssText = 'background:rgba(180,83,9,0.18);border:1px solid rgba(180,83,9,0.25);border-radius:12px 12px 0 12px;padding:10px 14px;font-size:0.82rem;color:var(--text-main);max-width:85%;align-self:flex-end;margin-left:auto;margin-bottom:8px;';
    uDiv.textContent = texto;
    messages.appendChild(uDiv);

    var aDiv = document.createElement('div');
    aDiv.style.cssText = 'background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.18);border-radius:12px 12px 12px 0;padding:10px 14px;font-size:0.82rem;color:var(--text-dim);max-width:85%;margin-bottom:8px;';
    aDiv.innerHTML = '⟳ Analizando...';
    messages.appendChild(aDiv);
    messages.scrollTop = messages.scrollHeight;

    var ctx = _buildCtx();
    var sys = 'Sos el asistente operativo de Cantera Guerrico.\n' +
              'Contexto — ' + ctx.mes + ':\n' +
              '· Producción: ' + ctx.produccion + ' Tn\n' +
              '· Eficiencia: ' + ctx.eficiencia + ' Tn/h\n' +
              '· Voladuras: ' + ctx.voladuras + ' eventos\n' +
              '· Costo voladuras: USD ' + ctx.costBlast + '\n' +
              'Respondé en español, máx 4 líneas, conciso y práctico.';

    _callClaude(sys, texto,
        function(ans) {
            aDiv.innerHTML = ans.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
            aDiv.style.color = 'var(--text-main)';
            messages.scrollTop = messages.scrollHeight;
        },
        function(err) { aDiv.innerHTML = err; }
    );
};

// ── ANALIZADOR DE VOLADURAS ────────────────────────────────────────
window.analizarVoladuraConIA = function() {
    var btn = document.getElementById('btn-analizar-vol');
    var out = document.getElementById('ia-voladura-resultado');
    var vols = appState.data.voladuras || [];

    if (!vols.length) {
        if (out) out.innerHTML = '<span style="color:var(--text-dim);">Sin voladuras registradas.</span>';
        return;
    }
    if (btn) btn.disabled = true;
    if (out) out.innerHTML = '<span style="opacity:0.6;">⟳ Analizando...</span>';

    var ultimas = vols.slice(-8);
    var resumen = ultimas.map(function(v,i) {
        return 'V'+(i+1)+': '+v.fecha+' | frente='+(v.frente||'?')+' | Tn='+(v.tn||0)+' | kg='+(v.kg||0)+' | P80='+(v.p80||'?')+'mm | VPP='+(v.vpp||'?')+'mm/s | USD='+(v.cost||0);
    }).join('\n');
    var prodT = (appState.data.produccion||[]).reduce(function(s,p){ return s+parseFloat(p.tn||0); },0);
    var volT  = vols.reduce(function(s,v){ return s+parseFloat(v.tn||0); },0);

    var sys  = 'Sos experto en voladuras de canteras. Respondé en español, máx 8 líneas, con datos concretos.';
    var user = 'Analizá estos ' + ultimas.length + ' eventos:\n' + resumen +
               '\n\nGlobal: Tn voladas=' + volT + ', Tn producidas=' + prodT +
               ', Ratio=' + (volT>0?(prodT/volT).toFixed(2):'S/D') + 'x\n\n' +
               'Respondé:\n1. Evaluación fragmentación (P80 y variabilidad)\n2. Eficiencia explosiva (kg/Tn, costo)\n3. Tres recomendaciones concretas con números';

    _callClaude(sys, user,
        function(txt) {
            if (out) out.innerHTML = txt.replace(/\*\*(.*?)\*\*/g,'<b style="color:var(--accent);">$1</b>').replace(/^(\d\.)\s/gm,'<br><b>$1</b> ').replace(/\n/g,'<br>');
            if (btn) btn.disabled = false;
        },
        function(err) { if(out) out.innerHTML=err; if(btn) btn.disabled=false; }
    );
};

// ── ANÁLISIS DE IMAGEN (Gemini — soporta multimodal desde file://) ─
window.analizarFragmentacionIA = function() {
    var b64 = window._fotoBlastBase64;
    if (!b64) { alert('Primero subí una foto.'); return; }

    var apiKey = ((appState.data.config)||{}).apiKey;
    if (!apiKey || !apiKey.trim()) {
        alert('El análisis de imagen usa Gemini Vision.\nObtené tu API Key gratis en aistudio.google.com y configurala en Ajustes.');
        return;
    }

    var ref    = document.getElementById('blast-ref-escala') ? document.getElementById('blast-ref-escala').value : 'ninguna';
    var roca   = document.getElementById('blast-tipo-roca')  ? document.getElementById('blast-tipo-roca').value  : 'caliza';
    var resEl  = document.getElementById('blast-ia-resultado');
    var btn    = document.getElementById('btn-analizar-blast');
    var refMap = { persona:'persona (1.75m)', camioneta:'camioneta (2m)', excavadora:'excavadora (3.5m)', varilla:'varilla', ninguna:'sin referencia' };

    if (resEl) { resEl.style.display='block'; resEl.innerHTML='<span style="opacity:0.6;">⟳ Analizando imagen...</span>'; }
    if (btn) btn.disabled = true;

    var b64p = b64.split(',')[1];
    var mime = b64.split(';')[0].split(':')[1] || 'image/jpeg';
    var prompt = 'Foto post-voladura de '+roca+'. Referencia: '+(refMap[ref]||'sin referencia')+'. Respondé SOLO JSON sin markdown:\n{"p80_mm":0,"p50_mm":0,"fragmentos_grandes_pct":0,"fragmentos_medios_pct":0,"fragmentos_finos_pct":0,"calidad":"buena","observaciones":"texto","confianza":"media"}';

    var models = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=',
    ];

    function tryModel(i) {
        if (i >= models.length) {
            if (resEl) resEl.innerHTML = '⚠️ No se pudo analizar la imagen. Verificá la API Key de Gemini en Ajustes.';
            if (btn) btn.disabled = false;
            return;
        }
        fetch(models[i] + apiKey.trim(), {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ contents:[{ parts:[{text:prompt},{inline_data:{mime_type:mime,data:b64p}}] }] })
        })
        .then(function(r){return r.json();})
        .then(function(d) {
            if (d.error) { tryModel(i+1); return; }
            var txt = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
            var res;
            try { res = JSON.parse(txt.replace(/```json|```/g,'').trim()); }
            catch(e) { if(resEl) resEl.innerHTML='⚠️ Respuesta inválida: '+txt.substring(0,150); if(btn) btn.disabled=false; return; }
            var col = res.calidad==='buena'?'var(--success)':res.calidad==='regular'?'var(--warning)':'var(--danger)';
            if (resEl) resEl.innerHTML =
                '<div style="background:var(--bg-card-2);border-radius:10px;padding:14px;">'+
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">'+
                '<div><div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;">P80 estimado</div>'+
                '<div style="font-size:2rem;font-weight:800;color:'+col+';">'+res.p80_mm+' mm</div>'+
                '<div style="font-size:0.75rem;color:var(--text-dim);">P50: '+res.p50_mm+' mm</div></div>'+
                '<span style="color:'+col+';background:'+col+'20;padding:5px 12px;border-radius:20px;font-size:0.8rem;font-weight:700;">'+res.calidad.toUpperCase()+'</span></div>'+
                '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;">'+
                '<div style="text-align:center;background:rgba(248,113,113,0.1);border-radius:6px;padding:6px;"><div style="font-size:1rem;font-weight:800;color:var(--danger);">'+res.fragmentos_grandes_pct+'%</div><div style="font-size:0.65rem;color:var(--text-dim);">Grandes</div></div>'+
                '<div style="text-align:center;background:rgba(251,191,36,0.1);border-radius:6px;padding:6px;"><div style="font-size:1rem;font-weight:800;color:var(--warning);">'+res.fragmentos_medios_pct+'%</div><div style="font-size:0.65rem;color:var(--text-dim);">Medios</div></div>'+
                '<div style="text-align:center;background:rgba(74,222,128,0.1);border-radius:6px;padding:6px;"><div style="font-size:1rem;font-weight:800;color:var(--success);">'+res.fragmentos_finos_pct+'%</div><div style="font-size:0.65rem;color:var(--text-dim);">Finos</div></div></div>'+
                '<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:10px;">'+res.observaciones+'</div>'+
                '<button onclick="usarP80deIA('+res.p80_mm+')" style="background:var(--purple);color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;cursor:pointer;width:100%;">Usar P80 = '+res.p80_mm+' mm</button>'+
                '</div>';
            if (btn) btn.disabled = false;
        })
        .catch(function(){ tryModel(i+1); });
    }
    tryModel(0);
};

window.usarP80deIA = function(p80) {
    var el = document.getElementById('blast-p80');
    if (el) {
        el.value = p80;
        el.style.borderColor = 'var(--purple)';
        el.style.boxShadow   = '0 0 0 3px rgba(167,139,250,0.25)';
        setTimeout(function(){ el.style.borderColor=''; el.style.boxShadow=''; }, 2000);
        el.scrollIntoView({ behavior:'smooth', block:'center' });
    }
};

window.toggleChatbot = function() {
    var p = document.getElementById('chatbot-panel');
    if (p) p.style.display = (p.style.display==='none'||!p.style.display) ? 'flex' : 'none';
};
