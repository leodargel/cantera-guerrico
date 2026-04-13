/**
 * forms.js
 * Form handling, navigation setup, and UI interactions (Theme, Filters).
 */

window.setupForms = function() {
    // Helper to log form submissions (optional)
    const logForm = (id) => console.log(`[Form] Submitting ${id}`);

    // Litros de combustible form
    const fLitros = document.getElementById('form-litros-mes');
    if (fLitros) {
        // Set default to current month
        const fechaInput = document.getElementById('litros-mes-fecha');
        if (fechaInput && !fechaInput.value) {
            fechaInput.value = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
        }
        fLitros.addEventListener('submit', function(e) {
            e.preventDefault();
            const fecha  = (document.getElementById('litros-mes-fecha')  || {}).value;
            const litros = parseFloat((document.getElementById('litros-mes-valor') || {}).value) || 0;
            if (!fecha || litros <= 0) { alert('Ingresá el mes y la cantidad de litros.'); return; }
            if (!appState.data.litrosCombustible) appState.data.litrosCombustible = [];
            // Replace same month
            appState.data.litrosCombustible = appState.data.litrosCombustible.filter(x => x.fecha !== fecha);
            appState.data.litrosCombustible.push({ fecha, litros });
            syncAndRefreshData();
            renderLitrosHistorial();
            document.getElementById('litros-mes-valor').value = '';
        });
        renderLitrosHistorial();
    }

    // Quick Load Form (Carga Rápida)
    const fQuick = document.getElementById('form-quick-load');
    if (fQuick) {
        fQuick.addEventListener('submit', function(e) {
            e.preventDefault();
            var fecha = (document.getElementById('quick-date') || {}).value;
            var tn    = parseFloat((document.getElementById('quick-desp') || {}).value) || 0;
            if (!fecha || tn <= 0) { alert('Completá mes y toneladas.'); return; }
            if (!appState.data.despacho) appState.data.despacho = [];
            appState.data.despacho.push({
                fecha: fecha,
                cliente: 'Despacho Directo',
                producto: 'Varios',
                tn: tn,
                remito: 'CR-' + Date.now().toString().slice(-6)
            });
            syncAndRefreshData();
            fQuick.reset();
            _renderQuickHistorial();
        });
        _renderQuickHistorial();
    }

    function _renderQuickHistorial() {
        var el = document.getElementById('quick-load-historial');
        if (!el) return;
        var ultimos = (appState.data.despacho || [])
            .filter(function(d) { return d.cliente === 'Despacho Directo' || d.cliente === 'Venta Directa (Carga Rápida)'; })
            .slice(-4).reverse();
        if (!ultimos.length) { el.innerHTML = ''; return; }
        el.innerHTML = '<div style="font-size:0.68rem;color:var(--text-dim);margin-bottom:4px;font-weight:700;">Últimos registros:</div>' +
            ultimos.map(function(d) {
                return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(128,128,128,0.1);">' +
                       '<span>' + d.fecha + '</span>' +
                       '<b style="color:var(--success);">' + parseFloat(d.tn).toLocaleString('es-AR') + ' Tn</b>' +
                       '</div>';
            }).join('');
    }

    // Blasting Form (Evento Voladura)
    const fBlast = document.getElementById('form-blasting');
    if (fBlast) fBlast.addEventListener('submit', function(e) {
        e.preventDefault();
        const frenteNombre = document.getElementById('blast-frente').value;
        
        // Buscar coordenadas del frente seleccionado en las zonas del mapa
        let lat = null, lng = null;
        const zonaMatch = (appState.data.zonas || []).find(z => z.nombre === frenteNombre);
        if (zonaMatch) {
            lat = zonaMatch.lat;
            lng = zonaMatch.lng;
        } else if (window.map) {
            // Fallback: centro del mapa si no hay zona con ese nombre
            lat = window.map.getCenter().lat;
            lng = window.map.getCenter().lng;
        }

        const entry = {
            fecha: document.getElementById('blast-date').value,
            frente: frenteNombre,
            tn: parseFloat(document.getElementById('blast-tn').value) || 0,
            kg: parseFloat(document.getElementById('blast-kg').value) || 0,
            pozos: parseInt(document.getElementById('blast-pozos').value) || 0,
            cost: parseFloat(document.getElementById('blast-cost').value) || 0,
            vpp: parseFloat(document.getElementById('blast-vpp').value) || 0,
            p80: parseFloat(document.getElementById('blast-p80').value) || 0,
            lat: lat,
            lng: lng
        };
        if (!appState.data.voladuras) appState.data.voladuras = [];
        appState.data.voladuras.push(entry);
        syncAndRefreshData();
        fBlast.reset();
        alert('Voladura registrada en frente: ' + frenteNombre);
    });

    // Consumos Form
    const fCons = document.getElementById('form-consumptions');
    if (fCons) fCons.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            fecha: document.getElementById('cons-date').value,
            diesel: parseFloat(document.getElementById('cons-diesel').value) || 0,
            lub: parseFloat(document.getElementById('cons-lub').value) || 0,
            electric: parseFloat(document.getElementById('cons-electric').value) || 0,
            almacen: parseFloat(document.getElementById('cons-almacen').value) || 0,
            cost: parseFloat(document.getElementById('cons-cost').value) || 0
        };
        if (!entry.fecha) { alert('Seleccioná el mes'); return; }
        if (!appState.data.consumos) appState.data.consumos = [];
        // Remove existing entry for same month
        appState.data.consumos = appState.data.consumos.filter(c => c.fecha !== entry.fecha);
        appState.data.consumos.push(entry);
        syncAndRefreshData();
        fCons.reset();
        alert('Insumos guardados correctamente.');
    });

    // Update targets form
    const fTargets = document.getElementById('form-update-targets');
    if (fTargets) fTargets.addEventListener('submit', function(e) {
        e.preventDefault();
        appState.data.config.targets['Planta Primaria'] = parseFloat(document.getElementById('target-primaria').value) || 450;
        appState.data.config.targets['Planta 1'] = parseFloat(document.getElementById('target-planta1').value) || 320;
        appState.data.config.targets['Planta 2'] = parseFloat(document.getElementById('target-planta2').value) || 280;
        syncAndRefreshData();
        alert('Metas actualizadas.');
    });

    // Module toggles
    ['comercial','rrhh','agro','automatizacion'].forEach(function(mod) {
        const cb = document.getElementById('toggle-mod-' + mod);
        if (cb) cb.addEventListener('change', function() {
            appState.data.config.modulos[mod] = cb.checked;
            syncAndRefreshData();
        });
    });

    // DB selector for audit
    const dbSel = document.getElementById('db-selector');
    if (dbSel) dbSel.addEventListener('change', function() {
        if (typeof renderDbManager === 'function') renderDbManager();
    });

    // Ranking turno filter
    const rankingFilter = document.getElementById('filtro-turno-ranking');
    if (rankingFilter) rankingFilter.addEventListener('change', function() {
        if (typeof updateWorkerRanking === 'function') updateWorkerRanking();
    });

    // Adv hours perdidas auto-calc
    ['adv-hs-primaria','adv-hs-planta1','adv-hs-planta2'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', function() {
            const vals = ['adv-hs-primaria','adv-hs-planta1','adv-hs-planta2'].map(function(i) { return parseFloat(document.getElementById(i)?.value)||0; });
            const maxHs = Math.max(...vals);
            const perdEl = document.getElementById('adv-hrs-perdidas');
            if (perdEl) perdEl.textContent = Math.max(0, 9 - maxHs).toFixed(1);
        });
    });
};


window.toggleCargaRapida = function() {
    const content = document.getElementById('content-carga-rapida');
    const icon = document.getElementById('caret-carga-rapida');
    if (content) {
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
};

// Expuesta globalmente para que el onclick del HTML también funcione
window.applyTheme = function(theme) {
    var isLight = theme === 'light';
    document.body.classList.toggle('theme-light', isLight);

    var icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.className = isLight ? 'ph ph-moon' : 'ph ph-sun';

    if (window.Chart) {
        Chart.defaults.color = isLight ? 'rgba(44,32,12,0.65)' : 'rgba(200,210,200,0.7)';
        Chart.defaults.borderColor = isLight ? 'rgba(120,80,20,0.1)' : 'rgba(128,128,128,0.12)';
    }

    // Re-render charts
    setTimeout(function() {
        if (typeof updateBalanceChart === 'function') updateBalanceChart();
        if (typeof updateEficienciaChart === 'function') updateEficienciaChart();
        if (typeof updateBlastCharts === 'function') updateBlastCharts();
        if (typeof updateCostsCharts === 'function') updateCostsCharts();
    }, 60);
};

window.toggleTheme = function() {
    var isLight = document.body.classList.contains('theme-light');
    var newTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('guerrico-theme', newTheme);
    window.applyTheme(newTheme);
};

window.setupTheme = function() {
    var saved = localStorage.getItem('guerrico-theme') || 'dark';
    window.applyTheme(saved);
};

window.setupMesFilter = function() {
    const filter = document.getElementById('global-month-filter');
    if (!filter) return;
    
    const now = new Date();
    const savedMes = localStorage.getItem('guerrico-mes-activo');
    const currentVal = savedMes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    filter.value = currentVal;
    // Sync global state from saved
    if (savedMes) {
        const [y, m] = savedMes.split('-');
        currentYear = parseInt(y);
        currentMonth = parseInt(m) - 1;
        prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    }

    filter.addEventListener('change', (e) => {
        if (!e.target.value) return;
        if (typeof updateDashboardFromFilter === 'function') updateDashboardFromFilter();
    });
};


window.setupConfig = function() {
    // Workers setup
    const fAddWorker = document.getElementById('form-add-worker');
    if (fAddWorker) fAddWorker.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-worker-name').value.trim();
        if (name) {
            if (!appState.data.config.operarios) appState.data.config.operarios = [];
            appState.data.config.operarios.push(name);
            syncAndRefreshData();
            e.target.reset();
        }
    });

    // Product setup
    const fAddProd = document.getElementById('form-add-producto');
    if (fAddProd) fAddProd.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-prod-name').value.trim();
        const price = parseFloat(document.getElementById('new-prod-price').value);
        if (name && price > 0) {
            if (!appState.data.config.productos) appState.data.config.productos = [];
            appState.data.config.productos.push({ nombre: name, precio: price });
            syncAndRefreshData();
            e.target.reset();
        }
    });

    const vTn = document.getElementById('config-valor-tn');
    if (vTn) vTn.addEventListener('change', (e) => {
        appState.data.config.valorTnUSD = parseFloat(e.target.value) || 15;
        syncAndRefreshData();
    });
};

window.toggleChatbot = function() {
    const panel = document.getElementById('chatbot-panel');
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'flex' : 'none';
};

// enviarMensajeChatbot is defined in ai.js


// Registrar movimiento de inventario
window.registrarMovimientoInventario = function() {
    var itemId = document.getElementById('inv-mov-item').value;
    var tipo   = document.getElementById('inv-mov-tipo').value;
    var cant   = parseInt(document.getElementById('inv-mov-cant').value);
    var obs    = document.getElementById('inv-mov-obs').value;
    if(!itemId || isNaN(cant) || cant <= 0) { alert('Seleccioná un ítem y una cantidad válida.'); return; }
    
    var inv = appState.data.inventario || [];
    var it = inv.find(x => x.id === itemId);
    if(!it) return;

    if(tipo === 'entrada') it.stockActual += cant;
    else if(tipo === 'salida') it.stockActual = Math.max(0, it.stockActual - cant);
    else it.stockActual = cant; 

    if(!appState.data.movimientosInventario) appState.data.movimientosInventario = [];
    appState.data.movimientosInventario.push({
        fecha: new Date().toLocaleDateString('es-AR'),
        itemId, descripcion: it.descripcion, tipo, cantidad: cant,
        stockResultante: it.stockActual, obs
    });

    dataSync.save();
    renderInventario();
    document.getElementById('inv-mov-cant').value = '';
    document.getElementById('inv-mov-obs').value  = '';
};

// Modal Inventario
window.abrirModalInventario = function(id) {
    var modal = document.getElementById('inv-modal');
    if(!modal) return;
    if(id) {
        var it = appState.data.inventario.find(x => x.id === id);
        if(!it) return;
        document.getElementById('inv-modal-id').value = it.id;
        document.getElementById('inv-modal-codigo').value = it.codigo;
        document.getElementById('inv-modal-desc').value = it.descripcion;
        document.getElementById('inv-modal-maquina').value = it.maquina;
        document.getElementById('inv-modal-stock').value = it.stockActual;
        document.getElementById('inv-modal-minimo').value = it.stockMinimo;
    } else {
        document.getElementById('inv-modal-id').value = '';
        ['inv-modal-codigo','inv-modal-desc','inv-modal-maquina'].forEach(i => document.getElementById(i).value='');
    }
    modal.style.display = 'flex';
};

window.cerrarModalInventario = function() { document.getElementById('inv-modal').style.display='none'; };

window.guardarItemInventario = function() {
    var id = document.getElementById('inv-modal-id').value;
    var datos = {
        codigo: document.getElementById('inv-modal-codigo').value,
        descripcion: document.getElementById('inv-modal-desc').value,
        maquina: document.getElementById('inv-modal-maquina').value,
        stockActual: parseInt(document.getElementById('inv-modal-stock').value)||0,
        stockMinimo: parseInt(document.getElementById('inv-modal-minimo').value)||2
    };
    if(!id) {
        datos.id = 'inv-' + Date.now();
        appState.data.inventario.push(datos);
    } else {
        var it = appState.data.inventario.find(x => x.id === id);
        Object.assign(it, datos);
    }
    dataSync.save();
    cerrarModalInventario();
    renderInventario();
};

// Mantenimiento
window.abrirModalParada = function(id) {
    var modal = document.getElementById('plan-modal');
    if(!modal) return;
    if(id) {
        var p = appState.data.paradasProgramadas.find(x => x.id === id);
        document.getElementById('plan-modal-id').value = p.id;
        document.getElementById('plan-modal-maquina').value = p.maquina;
        document.getElementById('plan-modal-fecha').value = p.fecha;
    } else {
        document.getElementById('plan-modal-id').value = '';
        document.getElementById('plan-modal-fecha').value = new Date().toISOString().split('T')[0];
    }
    modal.style.display = 'flex';
};

window.cerrarModalParada = function() { document.getElementById('plan-modal').style.display='none'; };

window.guardarParadaProgramada = function() {
    var id = document.getElementById('plan-modal-id').value;
    var datos = {
        maquina: document.getElementById('plan-modal-maquina').value,
        tipo: document.getElementById('plan-modal-tipo').value,
        fecha: document.getElementById('plan-modal-fecha').value,
        estado: 'pendiente'
    };
    if(!id) {
        datos.id = 'par-' + Date.now();
        appState.data.paradasProgramadas.push(datos);
    } else {
        var p = appState.data.paradasProgramadas.find(x => x.id === id);
        Object.assign(p, datos);
    }
    dataSync.save();
    cerrarModalParada();
    renderPlanMantenimiento();
};

window.marcarParadaCompletada = function(id) {
    var p = appState.data.paradasProgramadas.find(x => x.id === id);
    if(p) { p.estado = 'completado'; dataSync.save(); renderPlanMantenimiento(); }
};

// API Key y Config
// Note: guardarApiKey is also defined in uiUpdates.js (that version takes precedence)
window.guardarApiKey = window.guardarApiKey || function() {
    var key = document.getElementById('config-api-key')?.value?.trim();
    if(!key) return;
    if(!appState.data.config) appState.data.config = {};
    appState.data.config.apiKey = key;
    dataSync.save();
    alert('API Key guardada.');
};


window.guardarTnManual = function() {
    var tnP  = parseFloat(document.getElementById('tn-manual-primaria')?.value) || 0;
    var tnP2 = parseFloat(document.getElementById('tn-manual-planta2')?.value) || 0;
    var mesES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][currentMonth];
    var anio = String(currentYear);

    var reg = appState.data.tnManual.find(r => r.mes === mesES && r.anio === anio);
    if(reg) { reg.primaria = tnP; reg.planta2 = tnP2; }
    else { appState.data.tnManual.push({ mes:mesES, anio, primaria:tnP, planta2:tnP2 }); }

    dataSync.save();
    syncAndRefreshData();
    renderTnHistorial();
};

window.registrarTurnoCompleto = function() {
    var fecha  = document.getElementById('adv-date')?.value;
    var turno  = document.getElementById('adv-shift')?.value;
    var estado = document.getElementById('adv-status')?.value;
    var obs    = document.getElementById('adv-obs')?.value || '';
    if(!fecha) { alert('Selecciona la fecha del turno.'); return; }

    var plantas = [
        { id: 'primaria', sector: 'Planta Primaria',
          maquinas: [{id:'alteirac', nombre:'Alteirac', inputId:'adv-hs-alteirac'}] },
        { id: 'planta1', sector: 'Planta 1',
          maquinas: [
            {id:'n1560', nombre:'N.1560', inputId:'adv-hs-n1560'},
            {id:'hp400', nombre:'HP400',  inputId:'adv-hs-hp400'}
          ] 
        },
        { id: 'planta2', sector: 'Planta 2',
          maquinas: [
            {id:'svedala', nombre:'Svedala', inputId:'adv-hs-svedala'},
            {id:'hp100',   nombre:'HP100',   inputId:'adv-hs-hp100'}
          ]
        }
    ];

    if(!appState.data.produccion) appState.data.produccion = [];
    var registrados = 0;

    plantas.forEach(function(p) {
        var worker = document.getElementById('adv-worker-' + p.id)?.value || '';
        var tn  = parseFloat(document.getElementById('adv-tn-' + p.id)?.value) || 0;
        var hs  = parseFloat(document.getElementById('adv-hs-' + p.id)?.value) || 0;
        if(tn <= 0 && hs <= 0) return;

        var maqHoras = {};
        p.maquinas.forEach(function(m) {
            var h = parseFloat(document.getElementById(m.inputId)?.value) || 0;
            if(h > 0) maqHoras[m.id] = h;
        });

        if(Object.keys(maqHoras).length === 0 && hs > 0) {
            p.maquinas.forEach(function(m) { maqHoras[m.id] = hs; });
        }

        appState.data.produccion.push({
            fecha, sector: p.sector, turno, operario: worker,
            tn, hrs: hs, hrsPerdidas: Math.max(0, 9 - hs), estado, obs,
            maquinas: maqHoras
        });
        registrados++;
    });

    if(registrados === 0) { alert('Ingresa datos.'); return; }
    syncAndRefreshData();
    alert('Turno registrado.');
};
