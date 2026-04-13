/**
 * WEAR.JS
 * Módulo de Desgaste de Piezas — con imágenes reales e interactividad hover/click
 */

// Zonas de cada pieza sobre la imagen (porcentajes del ancho/alto del contenedor)
// Cada zona es un rectángulo { left%, top%, width%, height% } o elipse para cónicas
window.WEAR_ZONES = {
    // ── MANDÍBULAS (rectángulos verticales sobre la placa) ────────────
    alteirac: [
        { id: 'fija',  nombre: 'Mandíbula Fija (Placa Fija)',   color: '#facc15',
          shape: 'rect', left: 22, top: 18, w: 10, h: 60 },
        { id: 'movil', nombre: 'Mandíbula Móvil (Placa Móvil)', color: '#ef4444',
          shape: 'rect', left: 34, top: 15, w: 10, h: 63 },
    ],
    svedala: [
        { id: 'fija',  nombre: 'Mandíbula Fija (Placa Fija)',   color: '#facc15',
          shape: 'rect', left: 22, top: 18, w: 10, h: 60 },
        { id: 'movil', nombre: 'Mandíbula Móvil (Placa Móvil)', color: '#ef4444',
          shape: 'rect', left: 34, top: 15, w: 10, h: 63 },
    ],
    // ── CÓNICAS (elipses sobre manto y bowl) ─────────────────────────
    n1560: [
        { id: 'bowl',  nombre: 'Cóncavo (Bowl Liner)', color: '#3b82f6',
          shape: 'ellipse', cx: 39, cy: 42, rx: 16, ry: 12 },
        { id: 'manto', nombre: 'Manto (Mantle)',        color: '#84cc16',
          shape: 'ellipse', cx: 38, cy: 55, rx: 10, ry: 8  },
    ],
    hp400: [
        { id: 'bowl',  nombre: 'Bowl Liner (Cóncavo)', color: '#3b82f6',
          shape: 'ellipse', cx: 39, cy: 40, rx: 17, ry: 13 },
        { id: 'manto', nombre: 'Manto (Mantle)',        color: '#84cc16',
          shape: 'ellipse', cx: 38, cy: 54, rx: 10, ry: 8  },
    ],
    fc44: [
        { id: 'bowl',  nombre: 'Bowl Liner (Cóncavo)', color: '#3b82f6',
          shape: 'ellipse', cx: 39, cy: 40, rx: 17, ry: 13 },
        { id: 'manto', nombre: 'Manto (Mantle)',        color: '#84cc16',
          shape: 'ellipse', cx: 38, cy: 54, rx: 10, ry: 8  },
    ],
    hp100: [
        { id: 'bowl',  nombre: 'Bowl Liner (Cóncavo)', color: '#3b82f6',
          shape: 'ellipse', cx: 39, cy: 40, rx: 17, ry: 13 },
        { id: 'manto', nombre: 'Manto (Mantle)',        color: '#84cc16',
          shape: 'ellipse', cx: 38, cy: 54, rx: 10, ry: 8  },
    ],
    hp200: [
        { id: 'bowl',  nombre: 'Bowl Liner (Cóncavo)', color: '#3b82f6',
          shape: 'ellipse', cx: 39, cy: 40, rx: 17, ry: 13 },
        { id: 'manto', nombre: 'Manto (Mantle)',        color: '#84cc16',
          shape: 'ellipse', cx: 38, cy: 54, rx: 10, ry: 8  },
    ],
};

var _currentMachine = null;
var _tooltip = null;

// ── INIT ───────────────────────────────────────────────────────────────
window.initWearModule = function() {
    // Create global tooltip
    _tooltip = document.createElement('div');
    _tooltip.id = 'wear-tooltip';
    _tooltip.style.cssText = [
        'position:fixed;z-index:9999;pointer-events:none;display:none;',
        'background:rgba(13,15,14,0.97);border:1px solid var(--accent);',
        'border-radius:10px;padding:12px 16px;min-width:220px;',
        'box-shadow:0 8px 32px rgba(0,0,0,0.7);',
        'font-family:"Inter Tight",sans-serif;',
    ].join('');
    document.body.appendChild(_tooltip);

    // Build selector
    _buildLocationSelector();
    cambiarUbicacion();
};

function _buildLocationSelector() {
    var sel = document.getElementById('selector-ubicacion');
    if (!sel) return;
    sel.innerHTML = [
        '<option value="pozo">Pozo (Primarias)</option>',
        '<option value="planta1">Planta 1</option>',
        '<option value="planta2">Planta 2</option>',
    ].join('');
}

window.cambiarUbicacion = function() {
    var loc = (document.getElementById('selector-ubicacion') || {}).value || 'pozo';
    var maqPorUbic = {
        pozo:    ['alteirac', 'svedala'],
        planta1: ['n1560', 'hp400', 'fc44'],
        planta2: ['hp100', 'hp200'],
    };
    var maquinas = maqPorUbic[loc] || [];

    var sel2 = document.getElementById('selector-trituradora');
    if (sel2) {
        sel2.innerHTML = maquinas.map(function(id) {
            return '<option value="' + id + '">' + WEAR_MACHINES[id].nombre + '</option>';
        }).join('');
    }
    cambiarTrituradora();
};

window.cambiarTrituradora = function() {
    var sel = document.getElementById('selector-trituradora');
    var id  = sel ? sel.value : null;
    if (!id || !WEAR_MACHINES[id]) return;
    _currentMachine = id;
    _renderMachine(id);
};

// ── RENDER MACHINE ─────────────────────────────────────────────────────
function _renderMachine(machId) {
    var mach   = WEAR_MACHINES[machId];
    var imgSrc = (window.MACHINE_IMAGES || {})[machId] || '';
    var zones  = WEAR_ZONES[machId] || [];

    // Title
    var titleEl = document.getElementById('wear-machine-title');
    if (titleEl) titleEl.textContent = mach.planta.toUpperCase();

    var tituloEl = document.getElementById('pieza-titulo');
    if (tituloEl) tituloEl.textContent = mach.nombre;

    // Placeholder
    var ph = document.getElementById('wear-img-placeholder');
    if (ph) ph.style.display = 'none';

    // Image
    var imgEl = document.getElementById('wear-main-img');
    if (imgEl) {
        imgEl.src = imgSrc;
        imgEl.style.display = imgSrc ? 'block' : 'none';
    }

    // Build SVG overlay
    var container = document.getElementById('wear-zones-container');
    if (!container) return;
    container.innerHTML = '';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;';

    zones.forEach(function(zone) {
        var el;
        var piezaKey = machId + '-' + zone.id;
        var piezaData = (appState.data.piezas || {})[piezaKey] || {};
        var hrsAcum = _calcHorasAcumuladas(machId, zone.id, piezaData);
        var vidaMax = parseFloat(piezaData.vida || mach.piezas.find(p=>p.id===zone.id)?.vida || 3000);
        var pct = Math.min(100, (hrsAcum / vidaMax) * 100);
        var fillColor = _colorByPct(pct);
        var opacity = 0.45;

        if (zone.shape === 'rect') {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            el.setAttribute('x',      zone.left + '%');
            el.setAttribute('y',      zone.top  + '%');
            el.setAttribute('width',  zone.w    + '%');
            el.setAttribute('height', zone.h    + '%');
            el.setAttribute('rx', '4');
        } else {
            el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            el.setAttribute('cx', zone.cx + '%');
            el.setAttribute('cy', zone.cy + '%');
            el.setAttribute('rx', zone.rx + '%');
            el.setAttribute('ry', zone.ry + '%');
        }

        el.setAttribute('fill',   fillColor);
        el.setAttribute('fill-opacity', opacity);
        el.setAttribute('stroke', fillColor);
        el.setAttribute('stroke-width', '2');
        el.setAttribute('stroke-opacity', '0.85');
        el.style.cursor = 'pointer';
        el.style.transition = 'fill-opacity 0.2s, stroke-width 0.2s';

        // Hover
        el.addEventListener('mouseenter', function(e) {
            el.setAttribute('fill-opacity', 0.75);
            el.setAttribute('stroke-width', '3');
            _showTooltip(e, zone, machId, piezaData, hrsAcum, vidaMax, pct, fillColor);
        });
        el.addEventListener('mousemove', function(e) {
            _moveTooltip(e);
        });
        el.addEventListener('mouseleave', function() {
            el.setAttribute('fill-opacity', opacity);
            el.setAttribute('stroke-width', '2');
            if (_tooltip) _tooltip.style.display = 'none';
        });
        el.addEventListener('click', function() {
            _selectPieza(machId, zone, piezaData, hrsAcum, vidaMax, pct);
        });

        svg.appendChild(el);

        // Label inside zone
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        var tx = zone.shape === 'rect' ? (zone.left + zone.w/2) : zone.cx;
        var ty = zone.shape === 'rect' ? (zone.top  + 5)         : (zone.cy - zone.ry - 2);
        text.setAttribute('x', tx + '%');
        text.setAttribute('y', ty + '%');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '700');
        text.setAttribute('fill', '#fff');
        text.setAttribute('paint-order', 'stroke');
        text.setAttribute('stroke', 'rgba(0,0,0,0.8)');
        text.setAttribute('stroke-width', '3');
        text.style.pointerEvents = 'none';
        text.textContent = pct.toFixed(0) + '%';
        svg.appendChild(text);
    });

    container.appendChild(svg);

    // Legend + resumen horas
    _renderLegend(machId, zones);
    _renderResumenHorasMaquinas();

    // Info panel reset
    var infoEl = document.getElementById('pieza-info');
    if (infoEl) infoEl.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;">Pasá el mouse o hacé clic sobre las zonas coloreadas para ver el detalle.</p>';
    var boxEl = document.getElementById('cambio-pieza-box');
    if (boxEl) boxEl.style.display = 'none';
}

// ── TOOLTIP ────────────────────────────────────────────────────────────
function _showTooltip(e, zone, machId, piezaData, hrsAcum, vidaMax, pct, color) {
    if (!_tooltip) return;
    var hrsRestantes = Math.max(0, vidaMax - hrsAcum);
    var marca        = piezaData.marca  || '—';
    var fechaColoc   = piezaData.fecha  || '—';
    var estadoTexto  = pct >= 85 ? '🔴 CRÍTICO — Programar cambio' :
                       pct >= 60 ? '🟡 Desgaste moderado'          :
                                   '🟢 En buen estado';

    _tooltip.innerHTML = [
        '<div style="font-size:0.7rem;color:' + color + ';font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">' + zone.nombre + '</div>',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:0.78rem;">',
        '  <span style="color:var(--text-dim);">Marca:</span>       <b>' + marca + '</b>',
        '  <span style="color:var(--text-dim);">Colocada:</span>    <b>' + fechaColoc + '</b>',
        '  <span style="color:var(--text-dim);">Horas usadas:</span><b style="color:' + color + ';">' + hrsAcum.toFixed(0) + ' hs</b>',
        '  <span style="color:var(--text-dim);">Vida útil:</span>   <b>' + vidaMax + ' hs</b>',
        '  <span style="color:var(--text-dim);">Restante:</span>    <b style="color:' + _colorByPct(pct) + ';">' + hrsRestantes.toFixed(0) + ' hs</b>',
        '  <span style="color:var(--text-dim);">Desgaste:</span>    <b>' + pct.toFixed(1) + '%</b>',
        '</div>',
        '<div style="margin-top:8px;background:rgba(128,128,128,0.15);border-radius:4px;height:6px;overflow:hidden;">',
        '  <div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + color + ';border-radius:4px;transition:width 0.3s;"></div>',
        '</div>',
        '<div style="margin-top:6px;font-size:0.72rem;">' + estadoTexto + '</div>',
        '<div style="margin-top:5px;font-size:0.68rem;color:var(--text-dim);">Clic para registrar cambio</div>',
    ].join('');

    _tooltip.style.display = 'block';
    _moveTooltip(e);
}

function _moveTooltip(e) {
    if (!_tooltip) return;
    var x = e.clientX + 18;
    var y = e.clientY + 10;
    if (x + 240 > window.innerWidth)  x = e.clientX - 255;
    if (y + 200 > window.innerHeight) y = e.clientY - 180;
    _tooltip.style.left = x + 'px';
    _tooltip.style.top  = y + 'px';
}

// ── CLICK → PANEL INFO + FORM ──────────────────────────────────────────
function _selectPieza(machId, zone, piezaData, hrsAcum, vidaMax, pct, color) {
    var fillColor = _colorByPct(pct);
    var hrsRestantes = Math.max(0, vidaMax - hrsAcum);

    var infoEl = document.getElementById('pieza-info');
    if (infoEl) {
        infoEl.innerHTML = [
            '<div style="font-size:0.75rem;color:' + fillColor + ';font-weight:800;text-transform:uppercase;margin-bottom:10px;">' + zone.nombre + '</div>',
            '<div style="display:flex;flex-direction:column;gap:5px;font-size:0.82rem;">',
            _row('Marca', piezaData.marca || '—'),
            _row('Colocada', piezaData.fecha || '—'),
            _row('Horas usadas', hrsAcum.toFixed(0) + ' hs', fillColor),
            _row('Vida útil', vidaMax + ' hs'),
            _row('Horas restantes', hrsRestantes.toFixed(0) + ' hs', fillColor),
            _row('Desgaste', pct.toFixed(1) + '%', fillColor),
            '</div>',
            '<div style="margin:10px 0;background:rgba(128,128,128,0.15);border-radius:6px;height:8px;overflow:hidden;">',
            '  <div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + fillColor + ';border-radius:6px;transition:width 0.5s;"></div>',
            '</div>',
            '<div style="font-size:0.78rem;font-weight:700;margin-bottom:10px;color:' + fillColor + ';">' +
            (pct >= 85 ? '🔴 CRÍTICO — Programar cambio urgente' : pct >= 60 ? '🟡 Desgaste moderado' : '🟢 En buen estado') +
            '</div>',
        ].join('');
    }

    // Show form
    var boxEl = document.getElementById('cambio-pieza-box');
    if (boxEl) {
        boxEl.style.display = 'block';
        boxEl.setAttribute('data-mach', machId);
        boxEl.setAttribute('data-pieza', zone.id);
        // Pre-fill if data exists
        var fechaEl = document.getElementById('cp-fecha');
        var marcaEl = document.getElementById('cp-marca');
        var vidaEl  = document.getElementById('cp-vida');
        if (fechaEl) fechaEl.value = piezaData.fecha  || '';
        if (marcaEl) marcaEl.value = piezaData.marca  || '';
        if (vidaEl)  vidaEl.value  = piezaData.vida   || vidaMax;
    }
}

function _row(label, val, color) {
    return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(128,128,128,0.08);">' +
           '<span style="color:var(--text-dim);">' + label + '</span>' +
           '<b' + (color ? ' style="color:' + color + ';"' : '') + '>' + val + '</b></div>';
}

// ── REGISTRAR CAMBIO DE PIEZA ──────────────────────────────────────────
window.registrarCambioPieza = function(e) {
    if (e) e.preventDefault();
    var box     = document.getElementById('cambio-pieza-box');
    var machId  = box ? box.getAttribute('data-mach')  : _currentMachine;
    var piezaId = box ? box.getAttribute('data-pieza') : null;
    if (!machId || !piezaId) return;

    var fecha = (document.getElementById('cp-fecha') || {}).value;
    var marca = (document.getElementById('cp-marca') || {}).value;
    var vida  = parseFloat((document.getElementById('cp-vida') || {}).value);

    if (!fecha || !marca || isNaN(vida)) {
        alert('Completá todos los campos');
        return;
    }

    var key = machId + '-' + piezaId;
    if (!appState.data.piezas) appState.data.piezas = {};
    appState.data.piezas[key] = { fecha, marca, vida };

    // Log change history
    if (!appState.data.historialCambios) appState.data.historialCambios = [];
    appState.data.historialCambios.push({
        fecha, maquina: machId, pieza: piezaId, marca, vida,
        fechaRegistro: new Date().toISOString()
    });

    syncAndRefreshData();
    _renderMachine(machId);

    var n = document.getElementById('cambio-pieza-box');
    if (n) n.style.display = 'none';
    alert('✅ Cambio de pieza registrado correctamente');
};

// ── HELPERS ────────────────────────────────────────────────────────────
function _calcHorasAcumuladas(machId, piezaId, piezaData) {
    var mach = WEAR_MACHINES[machId];
    if (!mach) return 0;
    var fechaInicio = piezaData.fecha ? new Date(piezaData.fecha + 'T00:00:00') : null;
    var total = 0;

    (appState.data.produccion || []).forEach(function(p) {
        if (p.sector !== mach.planta) return;
        var fp = new Date(p.fecha + 'T12:00:00');
        if (fechaInicio && fp < fechaInicio) return;
        if (p.maquinas && p.maquinas[machId] !== undefined) {
            total += parseFloat(p.maquinas[machId]) || 0;
        } else {
            total += parseFloat(p.hrs || 0);
        }
    });
    return total;
}

function _colorByPct(pct) {
    return pct >= 85 ? 'var(--danger)'  :
           pct >= 60 ? 'var(--warning)' :
                       'var(--success)';
}

function _renderLegend(machId, zones) {
    var el = document.getElementById('wear-legend');
    if (!el) return;
    var piezas = zones.map(function(zone) {
        var key = machId + '-' + zone.id;
        var pd  = (appState.data.piezas || {})[key] || {};
        var hrs = _calcHorasAcumuladas(machId, zone.id, pd);
        var vidaMax = parseFloat(pd.vida || WEAR_MACHINES[machId].piezas.find(p=>p.id===zone.id)?.vida || 3000);
        var pct = Math.min(100, (hrs / vidaMax) * 100);
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
               '<div style="width:14px;height:14px;border-radius:3px;background:' + zone.color + ';flex-shrink:0;"></div>' +
               '<div style="flex:1;">' +
               '<div style="font-size:0.75rem;font-weight:700;color:var(--text-main);">' + zone.nombre + '</div>' +
               '<div style="font-size:0.68rem;color:' + _colorByPct(pct) + ';">' + pct.toFixed(0) + '% desgaste · ' + hrs.toFixed(0) + ' hs</div>' +
               '</div></div>';
    });
    el.innerHTML = '<div style="font-size:0.7rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;margin-bottom:8px;">Referencias</div>' + piezas.join('');
}

window.renderResumenHorasMaquinas = function() {
    var panel = document.getElementById('panel-resumen-horas');
    if (!panel) return;

    var maquinas = ['alteirac','n1560','hp400','fc44','svedala','hp100','hp200'];
    panel.innerHTML = maquinas.map(function(id) {
        var mach = WEAR_MACHINES[id];
        if (!mach) return '';
        var pieza0  = mach.piezas[0];
        var key     = id + '-' + pieza0.id;
        var pd      = (appState.data.piezas || {})[key] || {};
        var hrs     = _calcHorasAcumuladas(id, pieza0.id, pd);
        var vidaMax = parseFloat(pd.vida || pieza0.vida);
        var pct     = Math.min(100, (hrs / vidaMax) * 100);
        var col     = _colorByPct(pct);
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.1);cursor:pointer;" onclick="selectMachineFromPanel(\'' + id + '\')">' +
               '<div style="width:60px;font-size:0.72rem;font-weight:700;color:var(--text-main);">' + mach.nombre.split(' ').pop() + '</div>' +
               '<div style="flex:1;">' +
               '<div style="background:rgba(128,128,128,0.12);border-radius:3px;height:5px;margin-bottom:2px;overflow:hidden;">' +
               '<div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + col + ';border-radius:3px;"></div></div>' +
               '<div style="font-size:0.65rem;color:' + col + ';font-weight:700;">' + pct.toFixed(0) + '% · ' + hrs.toFixed(0) + 'hs</div>' +
               '</div></div>';
    }).join('');
};

window.selectMachineFromPanel = function(machId) {
    // Switch ubicacion and trituradora selectors to match
    var ubicMap = { alteirac:'pozo', svedala:'pozo', n1560:'planta1', hp400:'planta1', fc44:'planta1', hp100:'planta2', hp200:'planta2' };
    var ubSel = document.getElementById('selector-ubicacion');
    if (ubSel) { ubSel.value = ubicMap[machId]; cambiarUbicacion(); }
    var trSel = document.getElementById('selector-trituradora');
    if (trSel) { trSel.value = machId; cambiarTrituradora(); }
};

window.analizarAlertasDesgaste = function() {
    var alertas = [];
    var maquinas = ['alteirac','n1560','hp400','fc44','svedala','hp100','hp200'];
    maquinas.forEach(function(machId) {
        var mach = WEAR_MACHINES[machId];
        if (!mach) return;
        mach.piezas.forEach(function(pieza) {
            var key = machId + '-' + pieza.id;
            var pd  = (appState.data.piezas || {})[key] || {};
            var hrs = _calcHorasAcumuladas(machId, pieza.id, pd);
            var vidaMax = parseFloat(pd.vida || pieza.vida);
            var pct = Math.min(100, (hrs / vidaMax) * 100);
            if (pct >= 60) {
                alertas.push({ maquina: mach.nombre, pieza: pieza.nombre || pieza.id, pct, hrs, vidaMax, machId });
            }
        });
    });

    appState.data.alertasDesgaste = alertas;
    _renderAlertasPanels(alertas);
};

function _renderAlertasPanels(alertas) {
    var ids = ['alertas-desgaste-costos-1','alertas-desgaste-costos-2','alertas-desgaste-voladuras','alertas-desgaste-mant','alertas-desgaste-resumen'];
    var html = alertas.length === 0
        ? '<div style="text-align:center;padding:12px;color:var(--success);font-size:0.82rem;font-weight:700;">✓ Sin anomalías detectadas</div>'
        : alertas.map(function(a) {
            var col = a.pct >= 85 ? 'var(--danger)' : 'var(--warning)';
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(128,128,128,0.1);">' +
                   '<span style="font-size:1rem;">' + (a.pct >= 85 ? '🔴' : '🟡') + '</span>' +
                   '<div style="flex:1;">' +
                   '<div style="font-size:0.78rem;font-weight:700;color:var(--text-main);">' + a.maquina + ' — ' + a.pieza + '</div>' +
                   '<div style="font-size:0.7rem;color:' + col + ';">' + a.pct.toFixed(0) + '% desgaste · ' + a.hrs.toFixed(0) + ' / ' + a.vidaMax + ' hs</div>' +
                   '</div>' +
                   '<button onclick="selectMachineFromPanel(\'' + a.machId + '\')" style="padding:3px 8px;font-size:0.68rem;border-radius:5px;border:none;background:rgba(217,119,6,0.15);color:var(--accent);cursor:pointer;">Ver →</button>' +
                   '</div>';
        }).join('');

    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });
}

// Hook form submit
document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('form-cambio-pieza');
    if (form) form.addEventListener('submit', registrarCambioPieza);
});
