/**
 * fleet.js — Flota Liviana & Pesada
 * Importa Excel de gastos de camionetas y genera expediente por vehículo
 *
 * Estructura del Excel (Gastos_camionetas_2026.xls):
 *   Col J: Descripción (tarea realizada)
 *   Col K: Descripción Costeo (categoría: MAN.CAM-VM, Repuestos, M.O.C, etc.)
 *   Col T: Valor (monto en pesos)
 *   Col V: Mes de Contabilización (Enero, Febrero, etc.)
 *   Col X: Ubicación Técnica (nombre del vehículo)
 * Filas a ignorar: SUB TOTAL, TOTAL, COMBUSTIBLE, V. MCA, PUMA, vacías
 */

// ── IMPORTAR EXCEL FLOTA LIVIANA ─────────────────────────────────
window.procesarExcelFlotaLiviana = function(fileArg) {
    var file = (fileArg instanceof File) ? fileArg
             : document.getElementById('file-flota') && document.getElementById('file-flota').files[0];
    if (!file) return;

    var statusEl = document.getElementById('flota-import-status');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = 'rgba(59,130,246,0.1)';
        statusEl.innerHTML = '⟳ Procesando Excel...';
    }

    var reader = new FileReader();
    reader.onload = function(evt) {
        try {
            var wb = XLSX.read(new Uint8Array(evt.target.result), {
                type: 'array', cellDates: true, cellNF: false, cellStyles: false
            });

            var allItems = [];
            var mesesMap = {
                'enero':'01','febrero':'02','marzo':'03','abril':'04',
                'mayo':'05','junio':'06','julio':'07','agosto':'08',
                'septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'
            };

            var SKIP_KEYWORDS = [
                'sub total','subtotal','total de gasto','total gasto',
                'combustible de camioneta','total gastos camioneta',
                'v. mca','v.mca','puma','diferencia','total gastos'
            ];

            // Process each sheet using OBJECT MODE — headers from row 1
            // This avoids all index-guessing issues with sparse/wide sheets
            wb.SheetNames.forEach(function(sheetName) {
                var ws = wb.Sheets[sheetName];

                // Read as objects — column headers become keys
                var objRows = [];
                try { objRows = XLSX.utils.sheet_to_json(ws, {defval: null, raw: true}); }
                catch(e) { return; }
                if (!objRows || objRows.length === 0) return;

                // Find the correct header keys by fuzzy matching
                var headers = Object.keys(objRows[0] || {});
                var keyDesc='', keyCateg='', keyValor='', keyMes='', keyUbic='';

                headers.forEach(function(h) {
                    var hn = _norm(h);
                    // Descripción principal (J) — not "Descripción Costeo"
                    if (hn === 'descripcion' || hn === 'descripci') keyDesc = h;
                    // Descripción Costeo (K) — has "costeo" in it
                    if (hn.includes('costeo')) keyCateg = h;
                    // Valor (T)
                    if (hn === 'valor' || hn === 'valor"') keyValor = h;
                    // Mes de Contabilización (V)
                    if (hn.includes('mes de contab') || hn === 'mes') keyMes = h;
                    // Ubicación Técnica (X)
                    if (hn.includes('ubicacion tecnica') || hn.includes('ubicacion tec')) keyUbic = h;
                });

                // Fallback: if descripcion matched costeo too, find exact 'descripcion' only
                if (keyDesc === keyCateg && keyCateg !== '') {
                    headers.forEach(function(h) {
                        var hn = _norm(h);
                        if (hn === 'descripcion' && !hn.includes('costeo')) keyDesc = h;
                    });
                }

                if (!keyValor || !keyUbic) return; // can't process without these

                objRows.forEach(function(row) {
                    var desc  = (row[keyDesc]  || '').toString().trim();
                    var categ = keyCateg ? (row[keyCateg] || '').toString().trim() : '';
                    var ubic  = (row[keyUbic]  || '').toString().trim();
                    var mesRaw= keyMes  ? (row[keyMes]   || '') : '';

                    if (!desc || !ubic) return;

                    // Skip summary/total rows
                    var dl = _norm(desc);
                    if (SKIP_KEYWORDS.some(function(k){ return dl.includes(k); })) return;
                    if (dl.startsWith('total')) return;

                    // Parse value — raw:true gives actual number from Excel
                    var valor = _parseValFlota(row[keyValor]);
                    if (valor === 0) return;

                    // Detect month
                    var mesStr = _norm(mesRaw.toString());
                    var mesNum = null;
                    for (var mn in mesesMap) {
                        if (mesStr.includes(mn)) { mesNum = mesesMap[mn]; break; }
                    }
                    if (!mesNum) {
                        var snorm = _norm(sheetName);
                        for (var mn in mesesMap) {
                            if (snorm.includes(mn)) { mesNum = mesesMap[mn]; break; }
                        }
                    }

                    var yearMatch = mesRaw.toString().match(/20\d{2}/) || 
                                   sheetName.match(/20\d{2}/);
                    var anio = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
                    var fecha = anio + '-' + (mesNum || '01');

                    allItems.push({
                        fecha:     fecha,
                        unidad:    ubic,
                        tarea:     desc,
                        categoria: categ,
                        monto:     valor,
                        anio:      anio
                    });
                });
            });

            if (allItems.length === 0) {
                if (statusEl) {
                    statusEl.style.background = 'rgba(239,68,68,0.1)';
                    statusEl.innerHTML = '❌ No se encontraron datos. Verificá que el archivo tenga las columnas: <b>Descripción, Valor, Mes de Contabilización, Ubicación Técnica</b>.';
                }
                return;
            }

            // Save — replace same month/year entries
            var fechasNuevas = allItems.reduce(function(acc, i) { acc[i.fecha] = true; return acc; }, {});
            if (!appState.data.gastosFlota) appState.data.gastosFlota = [];
            appState.data.gastosFlota = appState.data.gastosFlota.filter(function(g) {
                return !fechasNuevas[g.fecha];
            });
            appState.data.gastosFlota = appState.data.gastosFlota.concat(allItems);
            syncAndRefreshData();
            renderExpedientesFlota();

            var total = allItems.reduce(function(s,i){ return s + i.monto; }, 0);
            var vehiculos = Object.keys(allItems.reduce(function(acc,i){ acc[i.unidad]=1; return acc; }, {})).length;
            var meses     = Object.keys(fechasNuevas).length;

            if (statusEl) {
                statusEl.style.background = 'rgba(74,222,128,0.1)';
                statusEl.innerHTML = '✅ <b>' + allItems.length + ' registros</b> importados — ' +
                    vehiculos + ' vehículos — ' + meses + ' mes/meses — ' +
                    'Total: <b>$\u00a0' + total.toLocaleString('es-AR',{maximumFractionDigits:0}) + '</b>';
            }

        } catch(err) {
            if (statusEl) {
                statusEl.style.background = 'rgba(239,68,68,0.1)';
                statusEl.innerHTML = '❌ Error: ' + err.message;
            }
            console.error('[FlotaImport]', err);
        }
    };
    reader.readAsArrayBuffer(file);
};

function _norm(v) {
    return (v||'').toString().toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function _parseValFlota(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Math.abs(v);
    var s = v.toString().trim().replace(/[$\s\u00a0]/g,'');
    // AR format: dots as thousands, comma as decimal
    if (/^[\d\.]+,\d{1,2}$/.test(s)) s = s.replace(/\./g,'').replace(',','.');
    else s = s.replace(/,/g,'');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : Math.abs(n);
}

// ── EXPEDIENTES POR VEHÍCULO ──────────────────────────────────────
window.renderExpedientesFlota = function() {
    var grid = document.getElementById('expedientes-flota');
    if (!grid) return;

    var gastos = appState.data.gastosFlota || [];
    if (gastos.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;padding:10px 0;">Importá el Excel para ver los expedientes por vehículo.</p>';
        return;
    }

    // Group by vehicle, aggregate totals and history
    var vehiculos = {};
    gastos.forEach(function(g) {
        var u = g.unidad || 'Sin asignar';
        if (!vehiculos[u]) vehiculos[u] = { nombre:u, gastos:[], total:0, porMes:{} };
        vehiculos[u].gastos.push(g);
        vehiculos[u].total += parseFloat(g.monto || 0);
        var m = g.fecha || '';
        vehiculos[u].porMes[m] = (vehiculos[u].porMes[m] || 0) + parseFloat(g.monto || 0);
    });

    // Sort by total desc
    var sorted = Object.values(vehiculos).sort(function(a,b){ return b.total - a.total; });

    // Render cards
    grid.innerHTML = sorted.map(function(v) {
        var mns = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        var ultimos = v.gastos.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); }).slice(0,3);
        var lastFecha = (ultimos[0]||{}).fecha || '';
        var lastP = lastFecha.split('-');
        var lastLabel = lastP[1] ? (mns[parseInt(lastP[1])-1]||'') + ' ' + lastP[0] : '—';

        // Top category
        var cats = {};
        v.gastos.forEach(function(g){ cats[g.categoria] = (cats[g.categoria]||0) + g.monto; });
        var topCat = Object.keys(cats).sort(function(a,b){ return cats[b]-cats[a]; })[0] || '—';

        // Format total
        var fmtTotal = v.total >= 1e6
            ? '$\u00a0' + (v.total/1e6).toFixed(1) + '\u00a0M'
            : '$\u00a0' + v.total.toLocaleString('es-AR',{maximumFractionDigits:0});

        return '<div class="chart-card" style="padding:14px;cursor:pointer;transition:box-shadow 0.2s;" ' +
            'onmouseenter="this.style.boxShadow=\'0 4px 20px rgba(0,0,0,0.15)\'" ' +
            'onmouseleave="this.style.boxShadow=\'\'" ' +
            'onclick="abrirExpedienteCompleto(\''+v.nombre.replace(/'/g,"\\'")+'\')">' +

            // Header
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:rgba(217,119,6,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<i class="ph-fill ph-car-profile" style="color:var(--accent);font-size:1.1rem;"></i></div>' +
            '<div>' +
            '<div style="font-weight:700;font-size:0.88rem;color:var(--text-main);line-height:1.2;">' + v.nombre + '</div>' +
            '<div style="font-size:0.68rem;color:var(--text-dim);margin-top:1px;">' +
            v.gastos.length + ' registros · último: ' + lastLabel + '</div>' +
            '</div></div>' +
            '<div style="text-align:right;">' +
            '<div style="font-size:1.05rem;font-weight:800;color:var(--danger);">' + fmtTotal + '</div>' +
            '<div style="font-size:0.62rem;color:var(--text-dim);">total histórico</div>' +
            '</div></div>' +

            // Top category badge
            '<div style="margin-bottom:8px;">' +
            '<span style="font-size:0.68rem;background:rgba(217,119,6,0.1);color:var(--accent);border-radius:4px;padding:2px 6px;font-weight:700;">' +
            topCat + '</span></div>' +

            // Last 3 entries
            '<div style="border-top:1px solid var(--border);padding-top:8px;">' +
            ultimos.map(function(g){
                return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;padding:3px 0;">' +
                    '<span style="color:var(--text-dim);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">' + g.tarea + '</span>' +
                    '<span style="color:var(--text-main);font-weight:700;white-space:nowrap;">$\u00a0' +
                    parseFloat(g.monto).toLocaleString('es-AR',{maximumFractionDigits:0}) + '</span>' +
                    '</div>';
            }).join('') +
            '</div>' +

            // CTA
            '<div style="margin-top:8px;font-size:0.7rem;color:var(--accent);font-weight:700;text-align:right;">Ver expediente completo →</div>' +
            '</div>';
    }).join('');

    // Update dropdown
    var sel = document.getElementById('select-expediente');
    if (sel) {
        var opts = '<option value="">Seleccioná un vehículo...</option>';
        sorted.forEach(function(v){
            opts += '<option value="' + v.nombre + '">' + v.nombre + '</option>';
        });
        sel.innerHTML = opts;
    }

    // Update ranking chart data
    if (typeof updateFlotaCharts === 'function') updateFlotaCharts();
};

// ── EXPEDIENTE COMPLETO MODAL ─────────────────────────────────────
window.abrirExpedienteCompleto = function(unidad) {
    var gastos = (appState.data.gastosFlota || []).filter(function(g){ return g.unidad === unidad; });
    if (!gastos.length) return;

    var total = gastos.reduce(function(s,g){ return s + parseFloat(g.monto||0); }, 0);

    // Group by month
    var porMes = {};
    gastos.forEach(function(g) {
        var k = g.fecha || '—';
        if (!porMes[k]) porMes[k] = { gastos:[], total:0 };
        porMes[k].gastos.push(g);
        porMes[k].total += parseFloat(g.monto||0);
    });

    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var mnsCorto = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    var mesKeys = Object.keys(porMes).sort().reverse();

    // Build modal HTML
    var html = '<div id="expediente-modal-overlay" onclick="cerrarExpediente(event)" ' +
        'style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">' +
        '<div onclick="event.stopPropagation()" ' +
        'style="background:var(--bg-card);border-radius:14px;width:100%;max-width:780px;max-height:88vh;overflow-y:auto;padding:24px;position:relative;">' +

        // Header
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:42px;height:42px;border-radius:10px;background:rgba(217,119,6,0.12);display:flex;align-items:center;justify-content:center;">' +
        '<i class="ph-fill ph-car-profile" style="color:var(--accent);font-size:1.3rem;"></i></div>' +
        '<div>' +
        '<div style="font-size:1.1rem;font-weight:800;color:var(--text-main);">' + unidad + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-dim);">' + gastos.length + ' registros · ' + mesKeys.length + ' meses</div>' +
        '</div></div>' +
        '<button onclick="cerrarExpediente()" style="background:rgba(128,128,128,0.1);border:none;border-radius:8px;padding:6px 12px;cursor:pointer;color:var(--text-main);font-size:1rem;">✕</button>' +
        '</div>' +

        // Totals bar
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;">' +
        '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:10px 14px;">' +
        '<div style="font-size:0.65rem;color:var(--danger);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Total Invertido</div>' +
        '<div style="font-size:1.2rem;font-weight:800;color:var(--text-main);">$\u00a0' + total.toLocaleString('es-AR',{maximumFractionDigits:0}) + '</div>' +
        '</div>' +
        '<div style="background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2);border-radius:8px;padding:10px 14px;">' +
        '<div style="font-size:0.65rem;color:var(--accent);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Promedio Mensual</div>' +
        '<div style="font-size:1.2rem;font-weight:800;color:var(--text-main);">$\u00a0' + (mesKeys.length > 0 ? (total/mesKeys.length).toLocaleString('es-AR',{maximumFractionDigits:0}) : '0') + '</div>' +
        '</div>' +
        '<div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:10px 14px;">' +
        '<div style="font-size:0.65rem;color:#818cf8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Eventos</div>' +
        '<div style="font-size:1.2rem;font-weight:800;color:var(--text-main);">' + gastos.length + '</div>' +
        '</div></div>' +

        // Timeline by month
        '<div style="display:flex;flex-direction:column;gap:12px;">' +
        mesKeys.map(function(k) {
            var p = k.split('-');
            var mesLabel = (meses[parseInt(p[1])-1] || p[1]) + ' ' + p[0];
            var mes = porMes[k];
            return '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(128,128,128,0.05);border-bottom:1px solid var(--border);">' +
                '<span style="font-weight:700;font-size:0.82rem;color:var(--text-main);">' + mesLabel + '</span>' +
                '<span style="font-weight:800;font-size:0.88rem;color:var(--danger);">$\u00a0' + mes.total.toLocaleString('es-AR',{maximumFractionDigits:0}) + '</span>' +
                '</div>' +
                '<table style="width:100%;border-collapse:collapse;">' +
                '<thead><tr style="background:rgba(128,128,128,0.03);">' +
                '<th style="padding:6px 14px;text-align:left;font-size:0.68rem;color:var(--text-dim);font-weight:700;border-bottom:1px solid var(--border);">Descripción</th>' +
                '<th style="padding:6px 14px;text-align:left;font-size:0.68rem;color:var(--text-dim);font-weight:700;border-bottom:1px solid var(--border);">Categoría</th>' +
                '<th style="padding:6px 14px;text-align:right;font-size:0.68rem;color:var(--text-dim);font-weight:700;border-bottom:1px solid var(--border);">Monto</th>' +
                '</tr></thead><tbody>' +
                mes.gastos.map(function(g, idx){
                    return '<tr style="'+(idx%2===0?'':'background:rgba(128,128,128,0.02)')+'">' +
                        '<td style="padding:7px 14px;font-size:0.78rem;color:var(--text-main);">' + g.tarea + '</td>' +
                        '<td style="padding:7px 14px;font-size:0.72rem;color:var(--text-dim);">' + (g.categoria||'—') + '</td>' +
                        '<td style="padding:7px 14px;font-size:0.78rem;font-weight:700;color:var(--text-main);text-align:right;white-space:nowrap;">$\u00a0' +
                        parseFloat(g.monto).toLocaleString('es-AR',{maximumFractionDigits:0}) + '</td>' +
                        '</tr>';
                }).join('') +
                '</tbody></table></div>';
        }).join('') +
        '</div></div></div>';

    // Inject modal
    var existing = document.getElementById('expediente-modal-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';
};

window.cerrarExpediente = function(e) {
    if (e && e.target !== document.getElementById('expediente-modal-overlay')) return;
    var modal = document.getElementById('expediente-modal-overlay');
    if (modal) modal.remove();
    document.body.style.overflow = '';
};

// ── RENDER FLOTA GENERAL ────────────────────────────────────────────
window.renderFlotaLiviana = function() {
    // Populate select + expedientes grid
    renderExpedientesFlota();

    // Expediente panel via select
    var sel = document.getElementById('select-expediente');
    if (sel) {
        sel.onchange = function() {
            if (!sel.value) return;
            var gastos = (appState.data.gastosFlota||[]).filter(function(g){ return g.unidad===sel.value; });
            var total = gastos.reduce(function(s,g){return s+parseFloat(g.monto||0);},0);
            var tbody = document.getElementById('expediente-body');
            var totalEl = document.getElementById('expediente-total-usd');
            if (totalEl) totalEl.textContent = '$\u00a0' + total.toLocaleString('es-AR',{maximumFractionDigits:0});
            if (tbody) {
                tbody.innerHTML = gastos.slice().sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');})
                    .map(function(g){
                        var p=(g.fecha||'').split('-');
                        var mns=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                        var ml=p[1]?(mns[parseInt(p[1])-1]||'')+' '+p[0]:'—';
                        return '<tr><td>'+ml+'</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+g.tarea+'">'+g.tarea+'</td><td style="white-space:nowrap;font-weight:700;">$\u00a0'+parseFloat(g.monto).toLocaleString('es-AR',{maximumFractionDigits:0})+'</td></tr>';
                    }).join('');
            }
        };
    }

    // Pesada section
    var todasUnidades = [...new Set([
        ...(appState.data.flota || []).map(v => v.nombre),
        ...(appState.data.gastosFlota || []).map(g => g.unidad)
    ])];
    var opts = '<option value="">Todos</option>' + todasUnidades.map(u=>`<option value="${u}">${u}</option>`).join('');
    ['ext-unidad','select-expediente'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
    });

    // Maintenance / heavy fleet rendering (existing logic)
    const historialMes = (appState.data.mantenimiento || []).filter(m => {
        if (!m.fecha) return false;
        const [y,mo] = m.fecha.split('-');
        return parseInt(mo)-1 === currentMonth && parseInt(y) === currentYear;
    });
    const todosEquipos = [...new Set([
        ...historialMes.map(m => m.unidad),
        ...(appState.data.flotaPesada || []).map(e => e.nombre)
    ])];

    const pesadaGrid = document.getElementById('pesada-expedientes-grid');
    if (pesadaGrid) {
        pesadaGrid.innerHTML = todosEquipos.map(nombre => {
            const registros = historialMes.filter(m => m.unidad === nombre);
            const costoTotal = registros.reduce((s, m) => s + parseFloat(m.costo || 0), 0);
            const paradas = registros.length;
            return `<div class="chart-card" style="padding:12px;">
                <div style="font-weight:700;font-size:0.85rem;color:var(--text-main);margin-bottom:6px;">
                    <i class="ph-fill ph-truck" style="color:var(--warning);margin-right:4px;"></i>${nombre}
                </div>
                <div style="font-size:0.75rem;color:var(--text-dim);">${paradas} evento(s) · $${costoTotal.toLocaleString('es-AR',{maximumFractionDigits:0})}</div>
            </div>`;
        }).join('');
    }

    ['pes-unidad','select-expediente-pesado'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
    });
};

