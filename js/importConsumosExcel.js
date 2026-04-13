/**
 * importConsumosExcel.js — v3 FINAL
 * Estructura conocida del Excel de Cantera Guerrico:
 *   - Hoja: nombre del mes (ej. "enero")
 *   - B1: fecha formateada mmm-yy (datetime internamente)
 *   - Col A: concepto (string)
 *   - Col B: valor numérico, fórmula suma, o vacío
 *   - Fila con "TOTAL": ignorar (es fórmula SUM)
 *   - Valores sin valor: ignorar
 */

var CONS_CATS = {
    combustible:  { label:'Combustible',        color:'#f59e0b', icon:'ph-fill ph-gas-pump'        },
    lubricantes:  { label:'Lubricantes',         color:'#34d399', icon:'ph-fill ph-drop'            },
    electricidad: { label:'Electricidad',        color:'#60a5fa', icon:'ph-fill ph-lightning'       },
    almacen:      { label:'Almacén/Repuestos',   color:'#a78bfa', icon:'ph-fill ph-package'         },
    explosivos:   { label:'Explosivos',          color:'#f87171', icon:'ph-fill ph-fire'            },
    manoObra:     { label:'Mano de Obra',        color:'#fb923c', icon:'ph-fill ph-users'           },
    ivaCompras:   { label:'IVA / Compras',       color:'#38bdf8', icon:'ph-fill ph-receipt'         },
    camionetas:   { label:'Flota Liviana',       color:'#4ade80', icon:'ph-fill ph-car-profile'     },
    amortizacion: { label:'Amortización',        color:'#94a3b8', icon:'ph-fill ph-chart-line-down' },
    reparaciones: { label:'Reparaciones',        color:'#fbbf24', icon:'ph-fill ph-wrench'          },
    ferrosur:     { label:'Ferrosur',            color:'#e879f9', icon:'ph-fill ph-train'           },
    otros:        { label:'Otros',               color:'#6b7280', icon:'ph-fill ph-dots-three'      },
};

var CONS_KW = [
    { cat:'combustible',  kw:['combustible','gasoil','diesel','gas oil'] },
    { cat:'lubricantes',  kw:['lubricante','lubricantes','aceite'] },
    { cat:'electricidad', kw:['energia electrica','electricidad','electric','energia el'] },
    { cat:'almacen',      kw:['almacen','almacenes','compras mensuales','movimiento de deposito','deposito','repuesto'] },
    { cat:'explosivos',   kw:['explosivo','explosivos','voladura','voladuras','tronadura','anfo'] },
    { cat:'ivaCompras',   kw:['iva compras','neto ricardo','iva mes','compras mes','iva credito','credito fiscal'] },
    { cat:'manoObra',     kw:['mano de obra','mano obra','total mano','sueldo','jornales','personal','operario'] },
    { cat:'camionetas',   kw:['camioneta','camionetas','vehiculo','vehiculos','flota liviana'] },
    { cat:'amortizacion', kw:['amortizacion','amortizacion','depreciacion','equipos fijos','consumo de equip'] },
    { cat:'reparaciones', kw:['reparacion','reparaciones','reparacion','banda','bandas','correa'] },
    { cat:'ferrosur',     kw:['ferrosur'] },
];

function _cat(concepto) {
    var c = (concepto||'').toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for (var i=0; i<CONS_KW.length; i++)
        for (var j=0; j<CONS_KW[i].kw.length; j++)
            if (c.includes(CONS_KW[i].kw[j])) return CONS_KW[i].cat;
    return 'otros';
}

/**
 * Parse a cell value that might be:
 *   - A plain number:  93892763.75  → 93892763.75
 *   - A formula string: "=2329232.96+864421.4" → eval it
 *   - A formatted string: "$ 93.892.763,76" → parse AR format
 *   - null/empty → 0
 */
function _parseVal(v) {
    if (v === null || v === undefined || v === '') return 0;

    // Already a number
    if (typeof v === 'number') return Math.abs(v);

    var s = String(v).trim();

    // Formula: starts with =
    if (s.charAt(0) === '=') {
        // Only handle simple addition/subtraction formulas (no SUM with cell refs)
        // Remove = and try to evaluate numeric expression
        var expr = s.slice(1);
        // If it's SUM(cellRefs...) we can't evaluate without sheet context → return 0
        if (/SUM\s*\(/i.test(expr)) return 0;
        // Only allow digits, +, -, *, /, ., spaces
        if (/^[\d\s\+\-\*\/\.]+$/.test(expr)) {
            try {
                var result = Function('"use strict"; return (' + expr + ')')();
                if (typeof result === 'number' && isFinite(result)) return Math.abs(result);
            } catch(e) {}
        }
        return 0;
    }

    // String number — handle both AR format (1.234.567,89) and US (1234567.89)
    // Remove currency symbols and spaces
    s = s.replace(/[$\s\u00a0\u202f]/g, '');

    if (!s) return 0;

    // AR format: multiple dots as thousand sep, comma as decimal
    // Pattern: digits, optional (dot+3digits)*, optional comma+decimals
    if (/^-?(\d{1,3}(\.\d{3})*)(,\d+)?$/.test(s)) {
        var n = parseFloat(s.replace(/\./g,'').replace(',','.'));
        return isNaN(n) ? 0 : Math.abs(n);
    }

    // US or plain float
    var n2 = parseFloat(s.replace(/,/g,''));
    return isNaN(n2) ? 0 : Math.abs(n2);
}

/**
 * Detect month from B1 cell.
 * B1 is a datetime stored as Excel serial, XLSX reads it as JS Date or number.
 */
function _fechaFromB1(b1val, sheetName) {
    // Case 1: XLSX parsed it as a JS Date object (when raw:false or date detection on)
    if (b1val instanceof Date || (b1val && b1val.getFullYear)) {
        var d = b1val;
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    }

    // Case 2: numeric serial (Excel date number, e.g. 46023 = Jan 1 2026)
    if (typeof b1val === 'number' && b1val > 40000) {
        // Excel serial to JS date (days since 1900-01-01, with leap year bug)
        var js = new Date(Math.round((b1val - 25569) * 86400000));
        return js.getFullYear() + '-' + String(js.getMonth()+1).padStart(2,'0');
    }

    // Case 3: string like "ene-26", "enero 2026", "Jan-26"
    if (typeof b1val === 'string') {
        var s = b1val.toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        var mmap = {
            'ene':'01','jan':'01','feb':'02','mar':'03','abr':'04','apr':'04',
            'may':'05','jun':'06','jul':'07','ago':'08','aug':'08','sep':'09',
            'oct':'10','nov':'11','dic':'12','dec':'12',
            'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05',
            'junio':'06','julio':'07','agosto':'08','septiembre':'09',
            'octubre':'10','noviembre':'11','diciembre':'12',
            'january':'01','february':'02','march':'03','april':'04',
        };
        var m = s.match(/^([a-z]+)[\s\-_\/](\d{2,4})$/);
        if (m && mmap[m[1]]) {
            var yr = m[2].length===2 ? '20'+m[2] : m[2];
            return yr + '-' + mmap[m[1]];
        }
    }

    // Case 4: use sheet name
    if (sheetName) {
        var sn = sheetName.toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        var mmap2 = {
            'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05',
            'junio':'06','julio':'07','agosto':'08','septiembre':'09',
            'octubre':'10','noviembre':'11','diciembre':'12',
            'jan':'01','feb':'02','mar':'03','apr':'04','may':'05','jun':'06',
            'jul':'07','aug':'08','sep':'09','oct':'10','nov':'11','dec':'12',
            'ene':'01','ago':'08','dic':'12',
        };
        for (var mn in mmap2) {
            if (sn.includes(mn)) {
                // Try to find year
                var yr2match = sheetName.match(/\d{4}/);
                var yr2 = yr2match ? yr2match[0] : new Date().getFullYear().toString();
                return yr2 + '-' + mmap2[mn];
            }
        }
    }

    // Fallback: current month
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
}

window.procesarExcelConsumos = function(fileArg) {
    var file = (fileArg instanceof File) ? fileArg
             : document.getElementById('file-consumos-excel') &&
               document.getElementById('file-consumos-excel').files[0];
    if (!file) return;

    var statusEl  = document.getElementById('consumos-import-status');
    var previewEl = document.getElementById('consumos-import-preview');
    if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.style.background = 'rgba(59,130,246,0.1)';
        statusEl.innerHTML = '⟳ Procesando Excel...';
    }
    if (previewEl) previewEl.style.display = 'none';

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Read with cellDates:true so B1 datetime comes as JS Date
            var wb = XLSX.read(new Uint8Array(e.target.result), {
                type: 'array',
                cellDates: true,
                cellNF: false,
                cellStyles: false
            });

            var sheetName = wb.SheetNames[0];
            var ws = wb.Sheets[sheetName];

            // Read as array of arrays (raw values)
            var rows = XLSX.utils.sheet_to_json(ws, {
                header: 1,
                defval: null,
                raw: true,  // get actual values, not formatted strings
                dateNF: 'yyyy-mm'
            });

            // Detect month from B1 (row 0, col 1)
            var b1 = rows[0] && rows[0][1];
            var fecha = _fechaFromB1(b1, sheetName);

            // Parse data rows (skip row 0 = header)
            var SKIP = ['total','subtotal','suma'];
            var items = [];

            for (var i = 1; i < rows.length; i++) {
                var row = rows[i];
                if (!row) continue;

                var concepto = (row[0] || '').toString().trim();
                if (!concepto) continue;

                // Skip pure total/subtotal rows (exact match or very short)
                var cl = concepto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
                // Only skip if it's literally "total", "subtotal" or "total " followed by nothing meaningful
                var isTotalRow = cl === 'total' || cl === 'subtotal' || cl === 'suma' ||
                                 cl.match(/^total\s*$/) || cl.match(/^subtotal\s*$/);
                if (isTotalRow) continue;

                var valor = _parseVal(row[1]);
                if (valor === 0) continue; // skip zero/empty

                items.push({
                    concepto: concepto,
                    valor: valor,
                    categoria: _cat(concepto)
                });
            }

            if (items.length === 0) {
                if (statusEl) {
                    statusEl.style.background = 'rgba(239,68,68,0.1)';
                    statusEl.innerHTML = '❌ No se encontraron datos con valor mayor a 0.';
                }
                return;
            }

            var total = items.reduce(function(s, it){ return s + it.valor; }, 0);

            // Build consumo object with legacy fields for dataSync compatibility
            var consumo = { fecha: fecha, items: items, total: total,
                diesel:0, lub:0, electric:0, almacen:0, cost:0 };
            items.forEach(function(it) {
                if      (it.categoria === 'combustible')  consumo.diesel   += it.valor;
                else if (it.categoria === 'lubricantes')  consumo.lub      += it.valor;
                else if (it.categoria === 'electricidad') consumo.electric += it.valor;
                else if (it.categoria === 'almacen')      consumo.almacen  += it.valor;
                else if (it.categoria === 'explosivos')   consumo.cost     += it.valor;
            });

            // Save (replace same month)
            if (!appState.data.consumos) appState.data.consumos = [];
            appState.data.consumos = appState.data.consumos.filter(function(c){ return c.fecha !== fecha; });
            appState.data.consumos.push(consumo);
            syncAndRefreshData();

            // Show result
            var mns = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            var p   = fecha.split('-');
            var lab = (mns[parseInt(p[1])-1] || p[1]) + ' ' + p[0];

            if (statusEl) {
                statusEl.style.background = 'rgba(74,222,128,0.1)';
                statusEl.innerHTML = '✅ <b>' + items.length + ' ítems</b> importados — ' + lab +
                    ' — Total: <b>$\u00a0' + total.toLocaleString('es-AR',{maximumFractionDigits:0}) + '</b>' +
                    ' &nbsp;<span style="font-size:0.75rem;opacity:0.8;">¿Mes incorrecto? ' +
                    '<input type="month" id="fix-mes-importado" value="' + fecha + '" ' +
                    'style="font-size:0.75rem;padding:2px 6px;border-radius:4px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-main);margin:0 4px;">' +
                    '<button onclick="_corregirMesImportado()" ' +
                    'style="font-size:0.72rem;padding:2px 8px;border-radius:4px;border:none;background:var(--accent);color:#fff;cursor:pointer;">Corregir</button></span>';
                window._lastImportedFecha = fecha;
                window._lastImportedItems = items;
                window._lastImportedTotal = total;
            }

            _renderPreview(items, total, lab, previewEl);

        } catch(err) {
            if (statusEl) {
                statusEl.style.background = 'rgba(239,68,68,0.1)';
                statusEl.innerHTML = '❌ Error: ' + err.message;
            }
            console.error('[ConsumosImport]', err);
        }
    };
    reader.readAsArrayBuffer(file);
};

window._corregirMesImportado = function() {
    var newFecha = (document.getElementById('fix-mes-importado')||{}).value;
    if (!newFecha || !window._lastImportedItems) return;
    if (!appState.data.consumos) appState.data.consumos = [];
    appState.data.consumos = appState.data.consumos.filter(function(c){
        return c.fecha !== window._lastImportedFecha && c.fecha !== newFecha;
    });
    var consumo = { fecha:newFecha, items:window._lastImportedItems, total:window._lastImportedTotal,
        diesel:0, lub:0, electric:0, almacen:0, cost:0 };
    window._lastImportedItems.forEach(function(it){
        if(it.categoria==='combustible')  consumo.diesel   +=it.valor;
        else if(it.categoria==='lubricantes')  consumo.lub +=it.valor;
        else if(it.categoria==='electricidad') consumo.electric+=it.valor;
        else if(it.categoria==='almacen')      consumo.almacen+=it.valor;
        else if(it.categoria==='explosivos')   consumo.cost+=it.valor;
    });
    appState.data.consumos.push(consumo);
    window._lastImportedFecha = newFecha;
    syncAndRefreshData();
    var mns=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var p=newFecha.split('-');
    alert('✅ Datos movidos a ' + (mns[parseInt(p[1])-1]||p[1]) + ' ' + p[0] + '. Cambiá el filtro de mes arriba.');
};

// ── PREVIEW ────────────────────────────────────────────────────────
function _renderPreview(items, total, mesLabel, el) {
    if (!el) return;
    if (!items || items.length === 0) { el.style.display='none'; return; }

    // Group by category
    var grupos = {};
    items.forEach(function(it) {
        if (!grupos[it.categoria]) grupos[it.categoria] = { items:[], subtotal:0 };
        grupos[it.categoria].items.push(it);
        grupos[it.categoria].subtotal += it.valor;
    });

    var cats = Object.keys(grupos).sort(function(a,b){ return grupos[b].subtotal - grupos[a].subtotal; });

    var html = '<div style="font-size:0.72rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">' +
               mesLabel + ' — ' + items.length + ' conceptos</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-bottom:14px;">';
    cats.forEach(function(cat) {
        var g   = grupos[cat];
        var cfg = CONS_CATS[cat] || CONS_CATS.otros;
        var pct = total > 0 ? (g.subtotal/total*100) : 0;

        html += '<div style="background:var(--bg-card);border:1px solid var(--border);border-left:3px solid '+cfg.color+';border-radius:8px;padding:10px 12px;">';
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">';
        html += '<i class="'+cfg.icon+'" style="color:'+cfg.color+';font-size:0.9rem;"></i>';
        html += '<span style="font-size:0.7rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;flex:1;">'+cfg.label+'</span>';
        html += '<b style="color:'+cfg.color+';font-size:0.8rem;">'+pct.toFixed(1)+'%</b>';
        html += '</div>';
        html += '<div style="background:rgba(128,128,128,0.12);border-radius:3px;height:3px;margin-bottom:8px;overflow:hidden;">';
        html += '<div style="height:100%;width:'+pct.toFixed(1)+'%;background:'+cfg.color+';border-radius:3px;"></div></div>';
        html += '<div style="font-size:1rem;font-weight:800;color:var(--text-main);margin-bottom:6px;">$\u00a0' +
                g.subtotal.toLocaleString('es-AR',{maximumFractionDigits:0}) + '</div>';
        g.items.forEach(function(it) {
            html += '<div style="display:flex;justify-content:space-between;font-size:0.7rem;padding:2px 0;border-top:1px solid rgba(128,128,128,0.08);">';
            html += '<span style="color:var(--text-dim);flex:1;padding-right:8px;">'+it.concepto+'</span>';
            html += '<span style="color:var(--text-main);white-space:nowrap;">$\u00a0'+
                    it.valor.toLocaleString('es-AR',{maximumFractionDigits:0})+'</span>';
            html += '</div>';
        });
        html += '</div>';
    });
    html += '</div>';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;' +
            'background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.2);border-radius:8px;">' +
            '<span style="font-weight:700;">TOTAL '+mesLabel+'</span>' +
            '<span style="font-size:1.2rem;font-weight:800;color:var(--accent);">$\u00a0' +
            total.toLocaleString('es-AR',{maximumFractionDigits:0})+'</span></div>';

    el.innerHTML = html;
    el.style.display = 'block';
}

// ── HISTORIAL ──────────────────────────────────────────────────────
window.renderConsumosGuardados = function() {
    var el = document.getElementById('consumos-historial-panel');
    if (!el) return;
    var todos = (appState.data.consumos||[]).filter(function(c){ return c.items && c.items.length > 0; });
    if (todos.length === 0) { el.innerHTML=''; el.style.display='none'; return; }

    el.style.display = 'block';
    var mns = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    var html = '<div class="chart-header"><span>Historial importado</span></div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px;" id="consumos-tabs">';
    todos.slice().reverse().forEach(function(c, i) {
        var p   = (c.fecha||'').split('-');
        var lab = (mns[parseInt(p[1])-1]||p[1]) + ' ' + p[0];
        var active = i===0 ? 'background:var(--accent);color:#fff;' : 'background:rgba(128,128,128,0.1);color:var(--text-dim);';
        html += '<div style="display:flex;align-items:center;gap:2px;">';
        html += '<button onclick="switchConsumosTab(\''+c.fecha+'\')" id="tab-'+c.fecha.replace('-','_')+'" '+
                'style="'+active+'border:none;border-radius:20px 0 0 20px;padding:5px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;">'+lab+'</button>';
        html += '<button onclick="borrarConsumosMes(\''+c.fecha+'\')" title="Borrar '+lab+'" '+
                'style="background:rgba(239,68,68,0.12);color:var(--danger);border:none;border-radius:0 20px 20px 0;padding:5px 8px;font-size:0.72rem;cursor:pointer;">✕</button>';
        html += '</div>';
    });
    html += '</div>';
    html += '<div id="consumos-tab-content"></div>';
    el.innerHTML = html;
    _renderTabConsumos(todos[todos.length-1]);
};

window.switchConsumosTab = function(fecha) {
    document.querySelectorAll('#consumos-tabs button[id^="tab-"]').forEach(function(btn) {
        btn.style.background = 'rgba(128,128,128,0.1)';
        btn.style.color = 'var(--text-dim)';
    });
    var tab = document.getElementById('tab-'+fecha.replace('-','_'));
    if (tab) { tab.style.background='var(--accent)'; tab.style.color='#fff'; }
    var c = (appState.data.consumos||[]).find(function(x){ return x.fecha===fecha; });
    if (c) _renderTabConsumos(c);
};

function _renderTabConsumos(consumo) {
    var el = document.getElementById('consumos-tab-content');
    if (!el) return;
    if (!consumo.items || consumo.items.length===0) { el.innerHTML='<p style="color:var(--text-dim);">Sin ítems.</p>'; return; }
    var mns=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var p = (consumo.fecha||'').split('-');
    var lab = (mns[parseInt(p[1])-1]||p[1])+' '+p[0];
    _renderPreview(consumo.items, consumo.total||consumo.items.reduce(function(s,i){return s+i.valor;},0), lab, el);
}

window.borrarConsumosMes = function(fecha) {
    var mns=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var p=(fecha||'').split('-');
    var lab=(mns[parseInt(p[1])-1]||p[1])+' '+p[0];
    if (!confirm('¿Borrar todos los datos de consumos de '+lab+'?')) return;
    appState.data.consumos=(appState.data.consumos||[]).filter(function(c){return c.fecha!==fecha;});
    syncAndRefreshData();
    renderConsumosGuardados();
    var st=document.getElementById('consumos-import-status');
    var pv=document.getElementById('consumos-import-preview');
    if(st){st.style.display='none';st.innerHTML='';}
    if(pv){pv.style.display='none';pv.innerHTML='';}
};

// ── KPIs DINÁMICOS ────────────────────────────────────────────────
window.renderConsumosKPIs = function() {
    var rowEl = document.getElementById('costos-kpi-row');
    if (!rowEl) return;

    var fechaMes = currentYear+'-'+String(currentMonth+1).padStart(2,'0');
    var consumoMes = (appState.data.consumos||[]).find(function(c){ return c.fecha===fechaMes; });
    var mns=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    var fmt = function(v) {
        if (!v || v<=0) return '0';
        if (v>=1e9) return '$\u00a0'+(v/1e9).toFixed(2)+'\u00a0B';
        if (v>=1e6) return '$\u00a0'+(v/1e6).toFixed(0)+'\u00a0M';
        if (v>=1e3) return '$\u00a0'+(v/1e3).toFixed(0)+'\u00a0K';
        return '$\u00a0'+v.toLocaleString('es-AR',{maximumFractionDigits:0});
    };

    if (consumoMes && consumoMes.items && consumoMes.items.length>0) {
        var grupos = {};
        consumoMes.items.forEach(function(it) {
            if (!grupos[it.categoria]) grupos[it.categoria]=0;
            grupos[it.categoria]+=it.valor;
        });
        var cats = Object.keys(grupos).filter(function(c){return grupos[c]>0;})
                         .sort(function(a,b){return grupos[b]-grupos[a];});
        var total = cats.reduce(function(s,c){return s+grupos[c];},0);

        // Previous month for comparison
        var prevFecha = currentMonth===0 ? (currentYear-1)+'-12' : currentYear+'-'+String(currentMonth).padStart(2,'0');
        var prevMes = (appState.data.consumos||[]).find(function(c){return c.fecha===prevFecha;});
        var prevGrupos = {};
        if (prevMes && prevMes.items) prevMes.items.forEach(function(it){
            if(!prevGrupos[it.categoria]) prevGrupos[it.categoria]=0;
            prevGrupos[it.categoria]+=it.valor;
        });

        var html = '';
        cats.forEach(function(cat) {
            var cfg=CONS_CATS[cat]||CONS_CATS.otros;
            var val=grupos[cat], prev=prevGrupos[cat]||0;
            var diff=val-prev, pct=total>0?(val/total*100):0;
            var dc=diff<=0?'var(--success)':'var(--danger)';
            var dabs=Math.abs(diff);
            var ds=(diff>=0?'+':'-')+'$\u00a0'+(dabs>=1e6?(dabs/1e6).toFixed(1)+'\u00a0M':dabs>=1e3?(dabs/1e3).toFixed(0)+'\u00a0K':dabs.toLocaleString('es-AR',{maximumFractionDigits:0}));
            html+='<div class="kpi-card" style="border-top:3px solid '+cfg.color+';min-width:0;overflow:hidden;">';
            html+='<h4 style="color:'+cfg.color+';font-size:0.6rem;letter-spacing:1px;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+cfg.label.toUpperCase()+'</h4>';
            html+='<div style="font-size:1.3rem;font-weight:800;color:var(--text-main);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+fmt(val)+'</div>';
            html+='<div style="font-size:0.65rem;color:var(--text-dim);margin-top:2px;">'+pct.toFixed(1)+'% del total</div>';
            if(prev>0) html+='<div style="font-size:0.68rem;margin-top:4px;padding:2px 6px;border-radius:4px;background:rgba(128,128,128,0.08);color:'+dc+';">vs ant: <b>'+ds+'</b></div>';
            html+='</div>';
        });
        html+='<div class="kpi-card" style="border-top:3px solid var(--accent);min-width:0;overflow:hidden;">';
        html+='<h4 style="color:var(--accent);font-size:0.6rem;letter-spacing:1px;margin-bottom:5px;">TOTAL COSTOS</h4>';
        html+='<div style="font-size:1.3rem;font-weight:800;color:var(--text-main);">'+fmt(total)+'</div>';
        html+='<div style="font-size:0.65rem;color:var(--text-dim);margin-top:2px;">'+mns[currentMonth]+' '+currentYear+'</div>';
        html+='</div>';
        rowEl.innerHTML=html;
    } else {
        // Static empty KPIs
        var empty = [
            {label:'COMBUSTIBLE',   color:'#f59e0b', id:'kpi-fuel-monthly',    sid:'smart-cost-fuel'},
            {label:'LUBRICANTES',   color:'#34d399', id:'kpi-lub-monthly',     sid:'smart-cost-lub'},
            {label:'ELECTRICIDAD',  color:'#60a5fa', id:'kpi-elec-monthly',    sid:'smart-cost-elec'},
            {label:'ALMACÉN/REP.',  color:'#a78bfa', id:'kpi-almacen-monthly', sid:'smart-cost-almacen'},
            {label:'VOLADURAS',     color:'#f87171', id:'kpi-blast-monthly',   sid:'smart-cost-blast'},
            {label:'TOTAL COSTOS',  color:'var(--accent)', id:'kpi-costo-total-mes', sid:'costos-mes-label'},
        ];
        rowEl.innerHTML = empty.map(function(e){
            return '<div class="kpi-card" style="border-top:3px solid '+e.color+';min-width:0;">'+
                   '<h4 style="color:'+e.color+';font-size:0.6rem;letter-spacing:1px;margin-bottom:5px;">'+e.label+'</h4>'+
                   '<div style="display:flex;align-items:baseline;gap:4px;overflow:hidden;">'+
                   '<span id="'+e.id+'" style="font-size:1.3rem;font-weight:800;">0</span>'+
                   '<small style="color:var(--text-dim);">$</small></div>'+
                   '<div class="smart-subtext" id="'+e.sid+'" style="margin-top:4px;font-size:0.68rem;">—</div></div>';
        }).join('');
    }
};
