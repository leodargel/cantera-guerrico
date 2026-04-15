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

// ══════════════════════════════════════════════════════════════
// COMPARATIVA DE OPERADORES POR PLANTA
// ══════════════════════════════════════════════════════════════

window.renderComparativaOperadores = function() {
    var prod = (appState.data.produccion || []).filter(function(r) {
        return r.fromExcel &&
               getMonthSafe(r.fecha) === currentMonth &&
               getYearSafe(r.fecha) === currentYear;
    });
    if (!prod.length) return;

    var plantas = [
        { sector: 'Planta Primaria', canvasId: 'chart-comp-prim', statsId: 'stats-comp-prim',
          filtroId: 'filtro-turno-prim', color: 'rgba(245,158,11,0.8)', border: '#f59e0b' },
        { sector: 'Planta 1',        canvasId: 'chart-comp-p1',   statsId: 'stats-comp-p1',
          filtroId: 'filtro-turno-p1',  color: 'rgba(34,197,94,0.8)',  border: '#22c55e' },
        { sector: 'Planta 2',        canvasId: 'chart-comp-p2',   statsId: 'stats-comp-p2',
          filtroId: 'filtro-turno-p2',  color: 'rgba(59,130,246,0.8)', border: '#3b82f6' }
    ];

    plantas.forEach(function(p) {
        var filtro = (document.getElementById(p.filtroId) || {}).value || 'Todos';

        // Filtrar por sector y turno
        var registros = prod.filter(function(r) {
            if (r.sector !== p.sector) return false;
            if (filtro !== 'Todos' && r.turno !== filtro) return false;
            return r.operario && r.operario.trim();
        });

        // Agrupar por operario
        var ops = {};
        registros.forEach(function(r) {
            var op = r.operario.trim();
            if (!ops[op]) ops[op] = { tn: 0, hs: 0, turnos: 0, hsPerd: 0 };
            ops[op].tn     += parseFloat(r.tn || 0);
            ops[op].hs     += parseFloat(r.hrs || 0);
            ops[op].turnos += 1;
            ops[op].hsPerd += parseFloat(r.hrsPerdidas || 0);
        });

        var sorted = Object.entries(ops).sort(function(a, b) { return b[1].tn - a[1].tn; });
        if (!sorted.length) return;

        var labels = sorted.map(function(e) { return e[0]; });
        var tnVals = sorted.map(function(e) { return Math.round(e[1].tn); });
        var efVals = sorted.map(function(e) {
            var r = e[1];
            return r.hs > 0 ? parseFloat((r.tn / r.hs).toFixed(1)) : 0;
        });

        // Render chart
        var ctx = document.getElementById(p.canvasId);
        if (!ctx) return;
        var ex = Chart.getChart(ctx);
        if (ex) ex.destroy();

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tn totales',
                        data: tnVals,
                        backgroundColor: p.color,
                        borderColor: p.border,
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Efic. Tn/h',
                        data: efVals,
                        type: 'line',
                        borderColor: 'rgba(239,68,68,0.9)',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.3,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: function(ctx) {
                        return ctx.dataset.label + ': ' + ctx.parsed.y + (ctx.datasetIndex === 0 ? ' Tn' : ' Tn/h');
                    }}}
                },
                scales: {
                    y:  { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 9 } },
                          title: { display: true, text: 'Tn', font: { size: 9 } } },
                    y2: { position: 'right', grid: { display: false }, ticks: { font: { size: 9 } },
                          title: { display: true, text: 'Tn/h', font: { size: 9 } } },
                    x:  { ticks: { font: { size: 10 } } }
                }
            }
        });

        // Stats debajo del gráfico
        var statsEl = document.getElementById(p.statsId);
        if (statsEl && sorted.length > 0) {
            var best = sorted[0];
            var bestEf = best[1].hs > 0 ? (best[1].tn / best[1].hs).toFixed(1) : '—';
            statsEl.innerHTML =
                '<span style="color:var(--success);font-weight:700;">▲ Mejor: ' + best[0] + '</span>' +
                ' · ' + Math.round(best[1].tn).toLocaleString('es-AR') + ' Tn' +
                ' · ' + bestEf + ' Tn/h' +
                ' · ' + best[1].turnos + ' turnos' +
                (best[1].hsPerd > 0 ? ' · <span style="color:var(--danger);">' + best[1].hsPerd.toFixed(1) + 'hs perd.</span>' : '');
        }
    });
};

// ══════════════════════════════════════════════════════════════
// HORAS POR TRITURADORA → conecta con Monitor de Desgaste
// ══════════════════════════════════════════════════════════════

window.renderHorasMaquinasYDesgaste = function() {
    var prod = (appState.data.produccion || []).filter(function(r) {
        return r.fromExcel &&
               getMonthSafe(r.fecha) === currentMonth &&
               getYearSafe(r.fecha) === currentYear;
    });
    if (!prod.length) return;

    // Acumular horas por máquina del mes
    var horas = {
        alteirac: 0,  // Primaria Altairac — usa hs de Planta Primaria
        n1560: 0, hp400: 0, fc44: 0, cta34: 0, cta25: 0,  // Planta 1
        svedala: 0, gp100: 0, hp200: 0  // Planta 2
    };

    prod.forEach(function(r) {
        if (r.sector === 'Planta Primaria') {
            // Use hsProd (Hs Prod col I) for Altairac hours
            horas.alteirac += parseFloat(r.hsProd || 0);
        }
        if (r.sector === 'Planta 1' && r.maquinas) {
            horas.n1560  += parseFloat(r.maquinas.n1560  || 0);
            horas.hp400  += parseFloat(r.maquinas.hp400  || 0);
            horas.fc44   += parseFloat(r.maquinas.fc44   || 0);
            horas.cta34  += parseFloat(r.maquinas.cta34  || 0);
            horas.cta25  += parseFloat(r.maquinas.cta25  || 0);
        }
        if (r.sector === 'Planta 2' && r.maquinas) {
            // svedala = HS Primaria Svedala (col S idx 18)
            horas.svedala += parseFloat(r.maquinas.svedala || 0);
            horas.gp100   += parseFloat(r.maquinas.gp100   || 0);
            horas.hp200   += parseFloat(r.maquinas.hp200   || 0);
        }
    });

    // ── Gráfico barras horas por máquina ─────────────────────
    var ctx = document.getElementById('chart-horas-maquinas');
    if (ctx) {
        var ex = Chart.getChart(ctx);
        if (ex) ex.destroy();

        var machAll = [
            {label:'Alteirac', hs:horas.alteirac, color:'#f59e0b'},
            {label:'N1560',    hs:horas.n1560,    color:'#22c55e'},
            {label:'HP400',    hs:horas.hp400,    color:'#22c55e'},
            {label:'44FC',     hs:horas.fc44,     color:'#22c55e'},
            {label:'Cta34',    hs:horas.cta34,    color:'#22c55e'},
            {label:'Cta25',    hs:horas.cta25,    color:'#22c55e'},
            {label:'Svedala',  hs:horas.svedala,  color:'#3b82f6'},
            {label:'GP100',    hs:horas.gp100,    color:'#3b82f6'},
            {label:'HP200',    hs:horas.hp200,    color:'#3b82f6'}
        ].filter(function(m){ return m.hs > 0; });
        var machLabels = machAll.map(function(m){ return m.label; });
        var machHoras  = machAll.map(function(m){ return parseFloat(m.hs.toFixed(1)); });
        var machColors = machAll.map(function(m){ return m.color; });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: machLabels,
                datasets: [{
                    label: 'Horas operadas',
                    data: machHoras,
                    backgroundColor: machColors.map(function(c) { return c + 'cc'; }),
                    borderColor: machColors,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: function(ctx) {
                        return ctx.parsed.y.toFixed(1) + ' hs';
                    }}}
                },
                scales: {
                    x: { ticks: { font: { size: 10 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.08)' },
                         ticks: { font: { size: 10 }, callback: function(v) { return v + 'hs'; } } }
                }
            }
        });
    }

    // ── Sincronizar horas con el módulo de Desgaste ───────────
    // Guarda las horas acumuladas del mes para que wear.js las use
    if (!appState.data.horasMaquinasMes) appState.data.horasMaquinasMes = {};
    var mesKey = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    appState.data.horasMaquinasMes[mesKey] = horas;

    // Actualizar el resumen de horas en el panel de desgaste
    if (typeof renderResumenHorasMaquinas === 'function') {
        renderResumenHorasMaquinas();
    }
};

// ══════════════════════════════════════════════════════════════
// Hook: llamar comparativa + horas al navegar a Operaciones
// ══════════════════════════════════════════════════════════════
window.renderTurnosPanel = window.renderTurnosPanel || function() {};
var _origRenderTurnos = window.renderTurnosPanel;
window.renderTurnosPanel = function() {
    _origRenderTurnos.apply(this, arguments);
    setTimeout(function() {
        if (typeof renderComparativaOperadores === 'function') renderComparativaOperadores();
        if (typeof renderHorasMaquinasYDesgaste === 'function') renderHorasMaquinasYDesgaste();
    }, 150);
};
