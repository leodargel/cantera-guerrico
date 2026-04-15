/**
 * BLASTING.JS
 * Módulo de Voladuras y Análisis de Fragmentación
 */

window.calcularCruceVoladuras = function() {
    var lagDias = parseInt(document.getElementById('cruce-dias-lag')?.value || 2);
    var voladuras = appState.data.voladuras || [];
    var produccion = appState.data.produccion || [];

    if(!voladuras.length) {
        var tbody = document.getElementById('cruce-tbody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-dim);">Sin voladuras registradas. Cargá eventos en el formulario de arriba.</td></tr>';
        return;
    }

    var cruces = voladuras.map(function(v) {
        var fechaVol = new Date(v.fecha + 'T12:00:00');
        var fechaLim = new Date(fechaVol.getTime() + lagDias * 86400000);

        var tnProd = 0, hrsProd = 0;
        produccion.forEach(function(p) {
            if(p.sector !== 'Planta Primaria') return;
            var fp = new Date(p.fecha + 'T12:00:00');
            if(fp >= fechaVol && fp <= fechaLim) {
                tnProd  += parseFloat(p.tn  || 0);
                hrsProd += parseFloat(p.hrs || 0);
            }
        });

        var costoVol  = parseFloat(v.cost || 0);
        var tnVoladas = parseFloat(v.tn   || 0);
        var usdPorTn  = tnProd > 0 ? costoVol / tnProd : null;
        var efic      = hrsProd > 0 ? tnProd / hrsProd : null;
        var ratio     = tnVoladas > 0 ? tnProd / tnVoladas : null;

        return {
            fecha: v.fecha, frente: v.frente || '—', tnVol: tnVoladas, costo: costoVol,
            p80: parseFloat(v.p80 || 0), vpp: parseFloat(v.vpp || 0),
            tnProd: tnProd, hrsProd: hrsProd, usdPorTn: usdPorTn, efic: efic, ratio: ratio
        };
    });

    renderCruceKPIs(cruces);
    renderCruceTabla(cruces);
    renderCruceGraficos(cruces);
    updateBlastingDashboard(cruces);
};

/**
 * toggleBlastDrawer
 * Opens or closes the registration drawer.
 */
window.toggleBlastDrawer = function(open) {
    const drawer = document.getElementById('blast-drawer');
    if (!drawer) return;
    if (open) {
        drawer.classList.add('active');
        // Initial setup for the drawer
        if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
        renderZonasDrawer();
    } else {
        drawer.classList.remove('active');
    }
};

/**
 * updateBlastingDashboard
 * Orchestrates the visualization of the new modern dashboard elements.
 */
window.updateBlastingDashboard = function(cruces) {
    if (!cruces || cruces.length === 0) return;
    
    // Get latest blast for "Detail Overlay"
    const latest = cruces[cruces.length - 1]; // Assume last is newest if not sorted
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    
    setVal('current-blast-id', 'FRENTE: ' + (latest.frente || 'S/D'));
    setVal('ov-blast-id', latest.fecha);
    setVal('ov-explosive', latest.p80 > 0 ? 'ANFO / AG' : 'S/D');
    setVal('ov-tonnage', latest.tnVol.toLocaleString('es-AR') + ' Tn');
    setVal('ov-p80', latest.p80 > 0 ? latest.p80 + ' mm' : 'S/D');
    
    // Update individual charts
    renderGranulometricCurve(latest);
    renderEfficiencyTrends(cruces);
    renderVibrationTrends(cruces);
    
    // Special Image handling if available
    const muckpEl = document.getElementById('muckpile-img');
    if (muckpEl && latest.foto) {
        muckpEl.src = latest.foto;
    }
};

function renderGranulometricCurve(latest) {
    const ctx = document.getElementById('chart-granulometric');
    if (!ctx) return;
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    // Data generation: Mock an S-curve based on P80
    const p80 = latest.p80 || 150;
    const labels = [0, 50, 100, 150, 200, 250, 300, 350, 400];
    // Simple logic for a sigmoidal-like cumulative curve
    const data = labels.map(size => {
        if (size === 0) return 0;
        const val = 100 / (1 + Math.exp(-0.02 * (size - p80)));
        return Math.min(100, Math.round(val));
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => l + 'mm'),
            datasets: [{
                label: 'Cumulative Passing %',
                data: data,
                borderColor: 'var(--accent)',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } }
            }
        }
    });
}

function renderEfficiencyTrends(cruces) {
    const ctx = document.getElementById('chart-explosive-efficiency');
    if (!ctx) return;
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    const data = cruces.slice(-8); // Last 8 events
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(c => c.fecha.split('-')[2]),
            datasets: [{
                label: 'Kg/Tn',
                data: data.map(c => c.tnVol > 0 ? (c.costo / c.tnVol).toFixed(2) : 0),
                backgroundColor: 'rgba(74, 222, 128, 0.5)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } }
            }
        }
    });
}

function renderVibrationTrends(cruces) {
    const ctx = document.getElementById('chart-vibration-trends');
    if (!ctx) return;
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    const data = cruces.slice(-8);
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(c => c.fecha.split('-')[2]),
            datasets: [{
                label: 'VPP mm/s',
                data: data.map(c => c.vpp || 0),
                borderColor: 'var(--danger)',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } }
            }
        }
    });
}

/**
 * Logic for drawer form and actions
 */
window.guardarVoladuraDrawer = function() {
    const val = (id) => document.getElementById(id).value;
    const nova = {
        fecha: val('blast-date-drawer'),
        frente: val('blast-frente-drawer'),
        tn: parseFloat(val('blast-tn-drawer')) || 0,
        cost: parseFloat(val('blast-cost-drawer')) || 0,
        kg: parseFloat(val('blast-kg-drawer')) || 0,
        pozos: parseInt(val('blast-pozos-drawer')) || 0,
        p80: parseFloat(val('blast-p80-drawer')) || 0,
        vpp: parseFloat(val('blast-vpp-drawer')) || 0,
        id: 'B' + Date.now().toString().slice(-4)
    };

    if (!nova.fecha || !nova.frente) { alert('Fecha y Frente son obligatorios.'); return; }

    if(!appState.data.voladuras) appState.data.voladuras = [];
    appState.data.voladuras.push(nova);
    dataSync.save();
    toggleBlastDrawer(false);
    calcularCruceVoladuras();
};

window.previewFotoDrawer = function() {
    const input = document.getElementById('blast-file-drawer');
    const preview = document.getElementById('drawer-img-preview');
    const img = document.getElementById('blast-img-drawer-preview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.renderZonasDrawer = function() {
    const container = document.getElementById('zonas-list-drawer');
    if (!container) return;
    container.innerHTML = (appState.data.zonas || []).map((z, i) => `
        <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; border-left:3px solid ${z.color || 'var(--accent)'};">
            <span style="font-size:0.8rem; font-weight:700; color:var(--text-main);">${z.nombre}</span>
            <button onclick="eliminarZonaDrawer(${i})" style="background:transparent; color:var(--danger); padding:4px; cursor:pointer;"><i class="ph ph-trash"></i></button>
        </div>
    `).join('');
};

window.eliminarZonaDrawer = function(idx) {
    if (confirm('¿Eliminar este frente?')) {
        appState.data.zonas.splice(idx, 1);
        dataSync.save();
        renderZonasDrawer();
        if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
    }
};

window.agregarZonaDrawer = function() {
    const nom = document.getElementById('nueva-zona-nombre-drawer').value.trim();
    if (!nom) return;
    appState.data.zonas.push({ nombre: nom, color: '#d97706', lat: -36.9135, lng: -60.1460 });
    document.getElementById('nueva-zona-nombre-drawer').value = '';
    dataSync.save();
    renderZonasDrawer();
    if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
};


function renderCruceKPIs(cruces) {
    var el = document.getElementById('cruce-kpis');
    if(!el) return;

    var totalVol  = cruces.reduce(function(s,c){ return s + c.tnVol; }, 0);
    var totalProd = cruces.reduce(function(s,c){ return s + c.tnProd; }, 0);
    var totalCosto= cruces.reduce(function(s,c){ return s + c.costo; }, 0);
    var usdPromedio = totalProd > 0 ? totalCosto / totalProd : 0;
    var ratioPromedio = totalVol > 0 ? totalProd / totalVol : 0;

    var kpis = [
        { label:'Voladuras analizadas', val: cruces.length + ' eventos', sub: cruces.filter(c=>c.tnProd>0).length + ' con producción', color:'var(--accent)' },
        { label:'Total Tn Voladas', val: totalVol.toLocaleString('es-AR') + ' Tn', sub:'Todos los frentes', color:'var(--danger)' },
        { label:'Costo promedio', val: usdPromedio > 0 ? '$ ' + usdPromedio.toFixed(2) + '/Tn' : 'S/D', sub:'USD por Tn producida', color:'var(--warning)' },
        { label:'Ratio Vol→Prod', val: ratioPromedio > 0 ? ratioPromedio.toFixed(2) + 'x' : 'S/D', sub:'Tn prod. / Tn voladas', color:'var(--success)' }
    ];

    el.innerHTML = kpis.map(k => `
        <div class="kpi-card" style="border-top:3px solid ${k.color};">
            <div style="font-size:0.7rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;margin-bottom:6px;">${k.label}</div>
            <div style="font-size:1.5rem;font-weight:800;color:${k.color};">${k.val}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:4px;">${k.sub}</div>
        </div>
    `).join('');
}

function renderCruceTabla(cruces) {
    var tbody = document.getElementById('cruce-tbody');
    if(!tbody) return;

    tbody.innerHTML = cruces.map(function(c) {
        var usdColor  = !c.usdPorTn ? 'var(--text-dim)' : c.usdPorTn > 5 ? 'var(--danger)' : c.usdPorTn > 2 ? 'var(--warning)' : 'var(--success)';
        var eficColor = !c.efic ? 'var(--text-dim)' : c.efic >= 400 ? 'var(--success)' : c.efic >= 250 ? 'var(--warning)' : 'var(--danger)';
        return `<tr>
            <td style="font-family:monospace;font-size:0.78rem;">${c.fecha}</td>
            <td style="font-weight:700;">${c.frente}</td>
            <td style="color:var(--danger);font-weight:700;">${c.tnVol.toLocaleString('es-AR')} Tn</td>
            <td>${c.costo > 0 ? '$ ' + c.costo.toLocaleString('es-AR') : '—'}</td>
            <td>${c.p80 > 0 ? c.p80 + ' mm' : '—'}</td>
            <td>${c.vpp > 0 ? c.vpp + ' mm/s' : '—'}</td>
            <td style="color:var(--success);font-weight:700;">${c.tnProd > 0 ? c.tnProd.toLocaleString('es-AR') + ' Tn' : 'S/D'}</td>
            <td style="font-weight:800;color:${usdColor};">${c.usdPorTn !== null ? '$ ' + c.usdPorTn.toFixed(2) : '—'}</td>
            <td style="font-weight:700;color:${eficColor};">${c.efic !== null ? c.efic.toFixed(0) + ' Tn/h' : '—'}</td>
        </tr>`;
    }).join('');
}

function renderCruceGraficos(cruces) {
    var ctxB = document.getElementById('chart-cruce-barras');
    if(ctxB) {
        var ex = Chart.getChart(ctxB); if(ex) ex.destroy();
        new Chart(ctxB, {
            type: 'bar',
            data: {
                labels: cruces.map(c => c.fecha.slice(5) + ' ' + c.frente.substring(0,8)),
                datasets: [
                    { label:'Tn Voladas', data: cruces.map(c=>c.tnVol), backgroundColor:'rgba(248,113,113,0.7)', borderRadius:4 },
                    { label:'Tn Producidas', data: cruces.map(c=>c.tnProd), backgroundColor:'rgba(52,211,153,0.7)', borderRadius:4 }
                ]
            },
            options: { responsive:true, maintainAspectRatio:false }
        });
    }

    var ctxC = document.getElementById('chart-cruce-costo');
    if(ctxC) {
        var ex2 = Chart.getChart(ctxC); if(ex2) ex2.destroy();
        var conCosto = cruces.filter(c => c.usdPorTn !== null);
        if(conCosto.length) {
            new Chart(ctxC, {
                type: 'line',
                data: {
                    labels: conCosto.map(c => c.fecha.slice(5) + ' ' + c.frente.substring(0,8)),
                    datasets: [{ label:'USD/Tn', data: conCosto.map(c=>c.usdPorTn), borderColor:'#fbbf24', fill:true, tension:0.4 }]
                },
                options: { responsive:true, maintainAspectRatio:false }
            });
        }
    }
}

// Insumos Perforadora
window.registrarInsumoPerforadora = function() {
    var tipo  = document.getElementById('perf-insumo-tipo')?.value || 'Broca';
    var desc  = document.getElementById('perf-insumo-desc')?.value?.trim() || '';
    var costo = parseFloat(document.getElementById('perf-insumo-costo')?.value) || 0;
    if(costo <= 0) { alert('Ingresa el costo del insumo.'); return; }
    if(!appState.data.insumosPerforadora) appState.data.insumosPerforadora = [];
    var mesesES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    appState.data.insumosPerforadora.push({
        tipo, desc, costo,
        mes: mesesES[currentMonth],
        anio: String(currentYear),
        fecha: new Date().toLocaleDateString('es-AR')
    });
    dataSync.save();
    document.getElementById('perf-insumo-desc').value = '';
    document.getElementById('perf-insumo-costo').value = '';
    renderInsumosPerfTable();
};

window.eliminarInsumoPerf = function(idx) {
    if(!appState.data.insumosPerforadora) return;
    appState.data.insumosPerforadora.splice(idx, 1);
    dataSync.save();
    renderInsumosPerfTable();
};

window.renderInsumosPerfTable = function() {
    var tbody = document.getElementById('perf-insumos-body');
    var totalEl = document.getElementById('perf-insumos-total');
    if(!tbody) return;
    var mesesES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var mesActual = mesesES[currentMonth];
    var anioActual = String(currentYear);
    var insumos = (appState.data.insumosPerforadora || []);
    var estesMes = insumos.filter(x => x.mes === mesActual && x.anio === anioActual);
    var total = estesMes.reduce((s,x) => s + (x.costo||0), 0);
    
    tbody.innerHTML = insumos.length === 0 ? '<tr><td colspan="5">Sin insumos</td></tr>' : 
        insumos.map((x, i) => `
        <tr style="${x.mes === mesActual && x.anio === anioActual ? '' : 'opacity:0.5;'}">
            <td>${x.tipo}</td><td>${x.desc}</td>
            <td style="color:var(--danger);">$ ${x.costo.toLocaleString('es-AR')}</td>
            <td>${x.mes} ${x.anio}</td>
            <td><button onclick="eliminarInsumoPerf(${i})">x</button></td>
        </tr>`).join('');
    
    if(totalEl) totalEl.textContent = '$ ' + total.toLocaleString('es-AR');
};

window.calcularCostoPerforacion = function() {
    const metros = parseFloat(document.getElementById('perf-metros')?.value) || 0;
    const costo  = parseFloat(document.getElementById('perf-costo-total')?.value) || 0;
    const tn     = parseFloat(document.getElementById('perf-tn')?.value) || 0;
    if(metros <= 0 || costo <= 0) { alert('Ingresá metros y costo.'); return; }
    document.getElementById('perf-kpi-metro').textContent = '$'+(costo/metros).toLocaleString('es-AR');
    document.getElementById('perf-kpi-tn').textContent    = tn > 0 ? '$'+(costo/tn).toLocaleString('es-AR') : '-';
    document.getElementById('perf-kpi-ratio').textContent = tn > 0 ? (metros/tn).toFixed(3)+' m/Tn' : '-';
    document.getElementById('perf-resultado').style.display = 'block';
};

// Info técnica por tipo de roca
window.ROCA_DATA = {
    'granito': {
        densidad: '2.65-2.75 t/m³', dureza: '6-7 Mohs', resistencia: '150-250 MPa',
        factor_explosivo: '0.35-0.55 kg/t', abrasividad: 'Alta',
        nota: 'Alta abrasividad — acelera desgaste de mandíbulas y mantos.'
    },
    'caliza': {
        densidad: '2.20-2.60 t/m³', dureza: '3-4 Mohs', resistencia: '50-150 MPa',
        factor_explosivo: '0.20-0.40 kg/t', abrasividad: 'Baja-Media',
        nota: 'Baja abrasividad — buena vida útil de piezas.'
    },
    'basalto': {
        densidad: '2.80-3.00 t/m³', dureza: '5-6 Mohs', resistencia: '200-350 MPa',
        factor_explosivo: '0.40-0.65 kg/t', abrasividad: 'Alta',
        nota: 'Muy abrasivo y duro — requiere frecuente control de desgaste.'
    },
    'arenisca': {
        densidad: '2.00-2.50 t/m³', dureza: '6-7 Mohs', resistencia: '20-170 MPa',
        factor_explosivo: '0.25-0.45 kg/t', abrasividad: 'Media',
        nota: 'Resistencia variable — calibrar malla según dureza local.'
    },
    'cuarcita': {
        densidad: '2.60-2.70 t/m³', dureza: '7 Mohs', resistencia: '200-400 MPa',
        factor_explosivo: '0.50-0.70 kg/t', abrasividad: 'Muy Alta',
        nota: 'Extremadamente abrasiva — vida útil de piezas muy reducida.'
    },
    'marmol': {
        densidad: '2.50-2.70 t/m³', dureza: '3-4 Mohs', resistencia: '60-120 MPa',
        factor_explosivo: '0.20-0.35 kg/t', abrasividad: 'Baja',
        nota: 'Similar a caliza — baja abrasividad.'
    }
};

window.mostrarInfoRoca = function() {
    var tipo = document.getElementById('blast-tipo-roca')?.value;
    var infoEl = document.getElementById('blast-roca-info');
    if(!infoEl) return;
    var data = window.ROCA_DATA[tipo];
    if(!data) { infoEl.style.display='none'; return; }
    infoEl.style.display = 'block';
    infoEl.innerHTML = 
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;">' +
            '<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:6px;padding:8px;text-align:center;">' +
                '<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;">Densidad</div>' +
                '<div style="font-size:0.82rem;font-weight:700;color:var(--accent);">' + data.densidad + '</div>' +
            '</div>' +
            '<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.15);border-radius:6px;padding:8px;text-align:center;">' +
                '<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;">Dureza</div>' +
                '<div style="font-size:0.82rem;font-weight:700;color:var(--warning);">' + data.dureza + '</div>' +
            '</div>' +
            '<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.15);border-radius:6px;padding:8px;text-align:center;">' +
                '<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;">Factor explos.</div>' +
                '<div style="font-size:0.82rem;font-weight:700;color:var(--danger);">' + data.factor_explosivo + '</div>' +
            '</div>' +
        '</div>' +
        '<div style="font-size:0.75rem;padding:8px 10px;border-radius:6px;' +
            'background:rgba(167,139,250,0.08);border-left:3px solid var(--purple);">' +
            '<b style="color:var(--purple);">Abrasividad ' + data.abrasividad + '</b> — ' + data.nota +
        '</div>';
};
