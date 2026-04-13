/**
 * production.js
 * Módulo de producción — funciones complementarias.
 * Las funciones principales (procesarExcelProduccion, renderTurnosPanel,
 * limpiarImportProduccion, guardarTnManual, renderTnHistorial) están en dataSync.js
 * y se definen allí para no crear conflictos.
 */

/**
 * guardarTnManual – guarda las toneladas manuales para el mes activo.
 */
window.guardarTnManual = function() {
    var tnP  = parseFloat(document.getElementById('tn-manual-primaria')?.value) || 0;
    var tnP2 = parseFloat(document.getElementById('tn-manual-planta2')?.value) || 0;
    var mesesES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var mesES = mesesES[currentMonth];
    var anio = String(currentYear);

    if (!appState.data.tnManual) appState.data.tnManual = [];
    var reg = appState.data.tnManual.find(r => r.mes === mesES && r.anio === anio);
    if (reg) {
        reg.primaria = tnP;
        reg.planta2  = tnP2;
    } else {
        appState.data.tnManual.push({ mes: mesES, anio, primaria: tnP, planta2: tnP2 });
    }

    // Clear input fields
    const pEl = document.getElementById('tn-manual-primaria');
    const p2El = document.getElementById('tn-manual-planta2');
    if (pEl) pEl.value = '';
    if (p2El) p2El.value = '';

    dataSync.save();
    syncAndRefreshData();
    alert('Toneladas guardadas para ' + mesES + ' ' + anio + '.');
};

/**
 * renderTnHistorial – renderiza la tabla de historial de toneladas manuales.
 */
window.renderTnHistorial = function() {
    const tbody = document.getElementById('tn-historial-body');
    if (!tbody) return;
    const regs = (appState.data.tnManual || []).slice().reverse();
    if (regs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:10px;font-size:0.78rem;">Sin registros</td></tr>';
        return;
    }
    tbody.innerHTML = regs.map(r => {
        const total = (r.primaria || 0) + (r.planta2 || 0);
        return '<tr>' +
            '<td>' + r.mes + ' ' + r.anio + '</td>' +
            '<td style="text-align:right;">' + (r.primaria || 0).toLocaleString('es-AR') + '</td>' +
            '<td style="text-align:right;">' + (r.planta2 || 0).toLocaleString('es-AR') + '</td>' +
            '<td style="text-align:right;font-weight:800;">' + total.toLocaleString('es-AR') + '</td>' +
        '</tr>';
    }).join('');
};

/**
 * actualizarSelectoresPlantistas – carga operarios en los selects del formulario de turnos.
 */
window.actualizarSelectoresPlantistas = function() {
    const operarios = appState.data.config.operarios || [];
    const opts = '<option value=""></option>' + operarios.map(op => '<option value="' + op + '">' + op + '</option>').join('');
    ['adv-worker-primaria', 'adv-worker-planta1', 'adv-worker-planta2'].forEach(function(id) {
        const sel = document.getElementById(id);
        if (sel) sel.innerHTML = '<option value="">Plantista...</option>' + operarios.map(op => '<option value="' + op + '">' + op + '</option>').join('');
    });
};

/**
 * updateBlastFrenteSelector – sincroniza el selector de frentes en el form de voladuras.
 */
window.updateBlastFrenteSelector = function() {
    const sel = document.getElementById('blast-frente');
    if (!sel) return;
    const zonas = appState.data.zonas || [];
    sel.innerHTML = '<option value="" disabled selected>Seleccionar frente...</option>' +
        zonas.map(z => '<option value="' + z.nombre + '">' + z.nombre + '</option>').join('');
};

/**
 * agregarNuevaZona – añade zona al mapa desde el campo de texto (sin clic en mapa).
 */
window.agregarNuevaZona = function(event) {
    event.preventDefault();
    const nombre = document.getElementById('nueva-zona-nombre')?.value?.trim();
    if (!nombre) { alert('Ingresá un nombre para el frente.'); return; }
    const color = document.getElementById('nueva-zona-color')?.value || '#ef4444';
    // Default coordinates (center of quarry)
    const lat = window.map ? window.map.getCenter().lat : -36.9135;
    const lng = window.map ? window.map.getCenter().lng : -60.1460;
    if (!appState.data.zonas) appState.data.zonas = [];
    appState.data.zonas.push({ nombre, color, lat, lng });
    document.getElementById('nueva-zona-nombre').value = '';
    syncAndRefreshData();
};

/**
 * previewFotoBlast – muestra preview de la imagen de voladura antes del análisis IA.
 */
window.previewFotoBlast = function() {
    const input = document.getElementById('blast-foto-input');
    const preview = document.getElementById('blast-foto-preview');
    const img = document.getElementById('blast-foto-img');
    const btn = document.getElementById('btn-analizar-blast');
    if (!input || !input.files || !input.files[0]) return;
    const url = URL.createObjectURL(input.files[0]);
    if (img) img.src = url;
    if (preview) preview.style.display = 'block';
    if (btn) btn.disabled = false;
};

/**
 * generarReportePDF – genera y descarga un reporte PDF del dashboard.
 */
window.generarReportePDF = function() {
    if (typeof html2pdf === 'undefined') {
        alert('Librería PDF no disponible. Verificá la conexión a internet.');
        return;
    }
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const titulo = 'Reporte Operativo — Cantera Guerrico — ' + meses[currentMonth] + ' ' + currentYear;
    
    const contenido = document.getElementById('resumen') || document.body;
    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'Reporte_Guerrico_' + meses[currentMonth] + '_' + currentYear + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(contenido).save();
};

/**
 * cargarImagenPerforadora – carga imagen personalizada para la perforadora.
 */
window.cargarImagenPerforadora = function(input) {
    if (!input || !input.files || !input.files[0]) return;
    const url = URL.createObjectURL(input.files[0]);
    const wrap = document.getElementById('perf-img-wrap');
    if (wrap) wrap.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
};

/**
 * guardarNovedadTurno – guarda la novedad del turno live.
 */
window.guardarNovedadTurno = function() {
    const text = document.getElementById('turno-novedad')?.value?.trim();
    if (!text) return;
    if (!appState.data.novedadesTurno) appState.data.novedadesTurno = [];
    appState.data.novedadesTurno.push({
        fecha: new Date().toLocaleDateString('es-AR'),
        hora: new Date().toLocaleTimeString('es-AR').substring(0,5),
        texto: text
    });
    dataSync.save();
    document.getElementById('turno-novedad').value = '';
    alert('Novedad guardada.');
};
