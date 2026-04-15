/**
 * uiUpdates.js
 * Actualizaciones visuales y renderizado de componentes.
 */

window.updateGauges = function() {
    // ── KPIs globales de producción ──
    var totalTn = 0, totalHrs = 0, totalPerdidas = 0;
    var diasConDatos = new Set();
    ['Planta Primaria','Planta 1','Planta 2'].forEach(function(sec) {
        (appState.data.produccion || []).forEach(function(p) {
            if (p.sector === sec && getMonthSafe(p.fecha) === currentMonth && getYearSafe(p.fecha) === currentYear) {
                if (sec === 'Planta Primaria') { // evitar doble conteo
                    totalTn += parseFloat(p.tn || 0);
                    totalHrs += parseFloat(p.hrs || 0);
                    totalPerdidas += parseFloat(p.hrsPerdidas || 0);
                    diasConDatos.add(p.fecha);
                }
            }
        });
    });
    // sumar planta 1 y 2 Tn también
    (appState.data.produccion || []).forEach(function(p) {
        if ((p.sector === 'Planta 1' || p.sector === 'Planta 2') && getMonthSafe(p.fecha) === currentMonth && getYearSafe(p.fecha) === currentYear) {
            totalTn += parseFloat(p.tn || 0);
        }
    });

    var diasDelMes = new Date(currentYear, currentMonth + 1, 0).getDate();
    var diasTranscurridos = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()
        ? new Date().getDate() : diasDelMes;
    var promDia = diasConDatos.size > 0 ? (totalTn / diasConDatos.size).toFixed(0) : 0;
    var proy = diasTranscurridos > 0 && diasConDatos.size > 0
        ? Math.round(totalTn / diasConDatos.size * diasDelMes) : 0;
    var pctTarget = Math.min(100, (totalTn / 35000) * 100); // target mensual estimado

    var el = function(id) { return document.getElementById(id); };
    if (el('kpi-prod-total-ops')) el('kpi-prod-total-ops').textContent = totalTn.toLocaleString('es-AR');
    if (el('bar-prod-total')) el('bar-prod-total').style.width = pctTarget.toFixed(1) + '%';
    if (el('kpi-prod-avg-dia-ops')) el('kpi-prod-avg-dia-ops').textContent = promDia;
    if (el('kpi-prod-proy-ops')) el('kpi-prod-proy-ops').textContent = proy.toLocaleString('es-AR');
    if (el('kpi-efic-global')) el('kpi-efic-global').textContent = totalHrs > 0 ? (totalTn / totalHrs).toFixed(0) : '—';
    if (el('kpi-hrs-total')) el('kpi-hrs-total').textContent = totalHrs.toFixed(0);
    if (el('kpi-hrs-perdidas-total')) el('kpi-hrs-perdidas-total').textContent = totalPerdidas.toFixed(0);
    var sectors = [
        { sector: 'Planta Primaria', textId: 'text-primaria',  barId: 'bar-primaria',  eficId: 'kpi-primaria-efic',  hrsId: 'kpi-primaria-hrs',  color: 'var(--success)', target: (appState.data.config.targets || {})['Planta Primaria'] || 13500 },
        { sector: 'Planta 1',        textId: 'text-planta1',   barId: 'bar-planta1',   eficId: 'kpi-planta1-efic',   hrsId: 'kpi-planta1-hrs',   color: 'var(--warning)', target: (appState.data.config.targets || {})['Planta 1'] || 9600  },
        { sector: 'Planta 2',        textId: 'text-planta2',   barId: 'bar-planta2',   eficId: 'kpi-planta2-efic',   hrsId: 'kpi-planta2-hrs',   color: 'var(--accent)',  target: (appState.data.config.targets || {})['Planta 2'] || 8400  }
    ];

    sectors.forEach(function(cfg) {
        var tnMes = 0, hrsMes = 0;
        (appState.data.produccion || []).forEach(function(p) {
            var m = getMonthSafe(p.fecha), y = getYearSafe(p.fecha);
            if (p.sector === cfg.sector && m === currentMonth && y === currentYear) {
                tnMes += parseFloat(p.tn || 0);
                // For Planta 1 and 2: sum actual machine hours, not shift hours
                if (p.maquinas) {
                    var maqHrs = Object.values(p.maquinas).reduce(function(s,v){ return s + (parseFloat(v)||0); }, 0);
                    hrsMes += maqHrs;
                } else {
                    hrsMes += parseFloat(p.hsProd || p.hrs || 0);
                }
            }
        });

        var pct     = Math.min(100, (tnMes / cfg.target) * 100);
        var efic    = hrsMes > 0 ? (tnMes / hrsMes).toFixed(0) : '—';
        var color   = pct >= 85 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';

        var textEl = document.getElementById(cfg.textId);
        var barEl  = document.getElementById(cfg.barId);
        var eficEl = document.getElementById(cfg.eficId);
        var hrsEl  = document.getElementById(cfg.hrsId);

        if (textEl) {
            textEl.textContent = tnMes > 0 ? tnMes.toLocaleString('es-AR') : '0';
            textEl.style.color = tnMes > 0 ? color : 'var(--text-dim)';
        }
        if (barEl) {
            barEl.style.width      = pct.toFixed(1) + '%';
            barEl.style.background = color;
        }
        if (eficEl) eficEl.textContent = efic !== '—' ? efic + ' Tn/h' : '— Tn/h';
        if (hrsEl)  hrsEl.textContent  = hrsMes > 0 ? hrsMes.toFixed(0) + ' hs' : '— hs';
    });
};

window.updateWorkerRanking = function() {
    const container = document.getElementById('worker-ranking-body');
    if (!container) return;
    
    const filtroEl = document.getElementById('filtro-turno-ranking');
    const filtro = filtroEl ? filtroEl.value : 'Todos';
    const targets = appState.data.config.targets;
    const valorTn = appState.data.config.valorTnUSD || 15;

    const operarioStats = {};
    appState.data.produccion.forEach(p => {
        const m = getMonthSafe(p.fecha);
        const y = getYearSafe(p.fecha);
        if (m !== currentMonth || y !== currentYear) return;
        if (filtro !== 'Todos' && p.turno !== filtro) return;
        
        const key = p.operario + '|' + p.sector + '|' + p.turno;
        if (!operarioStats[key]) {
            operarioStats[key] = { operario: p.operario, sector: p.sector, turno: p.turno, tn: 0, hrs: 0, hrsPerdidas: 0 };
        }
        operarioStats[key].tn += parseFloat(p.tn || 0);
        operarioStats[key].hrs += parseFloat(p.hrs || 0);
        operarioStats[key].hrsPerdidas += parseFloat(p.hrsPerdidas || 0);
    });

    const rows = Object.values(operarioStats).sort((a, b) => b.tn - a.tn);
    if (rows.length === 0) { 
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">Sin datos para este mes</td></tr>'; 
        return; 
    }

    container.innerHTML = rows.map(r => {
        const target = targets[r.sector] || 300;
        const real = r.hrs > 0 ? (r.tn / r.hrs) : 0;
        const pctVal = Math.floor(real / target * 100);
        const pctColor = pctVal >= 85 ? 'var(--success)' : pctVal >= 60 ? 'var(--warning)' : 'var(--danger)';
        const perdidaUSD = (r.hrsPerdidas * target * valorTn).toLocaleString('es-AR', { maximumFractionDigits: 0 });
        
        return `<tr>
            <td style="font-weight:600;">${r.operario}</td>
            <td><span class="badge-sector">${r.sector}</span></td>
            <td>${r.turno}</td>
            <td><div style="display:flex;align-items:center;gap:8px;"><div style="width:60px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;"><div style="width:${Math.min(pctVal, 100)}%;height:100%;background:${pctColor};border-radius:3px;"></div></div><b style="color:${pctColor};">${pctVal}%</b></div></td>
            <td style="color:var(--danger);font-weight:700;">USD ${perdidaUSD}</td>
        </tr>`;
    }).join('');
};

window.initMap = function() {
    const mapContainer = document.getElementById('quarry-map-container');
    if (!mapContainer || window.map) return;
    
    window.map = L.map('quarry-map-container', { zoomControl: false }).setView([-36.9135, -60.1460], 16);
    L.control.zoom({ position: 'topright' }).addTo(window.map);

    const satelital = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri', maxZoom: 19 });
    const topografico = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 20 });
    satelital.addTo(window.map);

    const baseMaps = { '🛰️ Satelital': satelital, '🗺️ Topográfico': topografico };
    L.control.layers(baseMaps, null, { position: 'topleft', collapsed: true }).addTo(window.map);
    
    setTimeout(function() { window.map.invalidateSize(); }, 300);

    const hudEl = document.createElement('div');
    hudEl.id = 'map-hud';
    hudEl.className = 'map-hud';
    mapContainer.appendChild(hudEl);
    
    window.updateMapHUD = function() {
        const totalVol = appState.data.voladuras.length;
        const totalTn = appState.data.voladuras.reduce((s, v) => s + parseFloat(v.tn || 0), 0);
        const totalZon = appState.data.zonas.length;
        hudEl.innerHTML = '<div class="map-hud-pill"><div class="dot" style="background:#ef4444;"></div>' + totalVol + ' voladuras</div>' +
            '<div class="map-hud-pill"><i class="ph-fill ph-mountains" style="color:#f59e0b;"></i>' + totalTn.toLocaleString('es-AR') + ' Tn</div>' +
            '<div class="map-hud-pill"><i class="ph-fill ph-map-pin" style="color:#10b981;"></i>' + totalZon + ' frentes</div>';
    };
    window.updateMapHUD();

    window.map.on('click', function(e) {
        const nombreEl = document.getElementById('nueva-zona-nombre');
        if (nombreEl && nombreEl.value.trim()) {
            const colorEl = document.getElementById('nueva-zona-color');
            const color = colorEl ? colorEl.value : '#ef4444';
            appState.data.zonas.push({ nombre: nombreEl.value.trim(), color: color, lat: e.latlng.lat, lng: e.latlng.lng });
            nombreEl.value = '';
            syncAndRefreshData();
        }
    });
};

window.updateMapPins = function() {
    if (!window.map) return;
    if (window._mapLayers) {
        window._mapLayers.forEach(function(l) { try { window.map.removeLayer(l); } catch (e) { } });
    }
    window._mapLayers = [];
    if (window.updateMapHUD) window.updateMapHUD();

    const voladurasPorFrente = {};
    appState.data.voladuras.forEach(function(v, idx) {
        if (!v.frente) return;
        const fn = String(v.frente).trim().toLowerCase();
        if (!voladurasPorFrente[fn]) voladurasPorFrente[fn] = { count: 0, tn: 0, costo: 0, kg: 0 };
        voladurasPorFrente[fn].count++;
        voladurasPorFrente[fn].tn += parseFloat(v.tn || 0);
        voladurasPorFrente[fn].costo += parseFloat(v.cost || 0); // 'cost' is stored in blast-cost
        voladurasPorFrente[fn].kg += parseFloat(v.kg || 0);
    });

    (appState.data.zonas || []).forEach(function(z, idx) {
        const fn = String(z.nombre).trim().toLowerCase();
        const stat = voladurasPorFrente[fn] || { count: 0, tn: 0, costo: 0, kg: 0 };
        
        const col = z.color || '#ea580c';
        const zonaIcon = L.divIcon({ className: 'zona-marker-container', html: '<div class="zona-pulse" style="background:'+col+'55;"></div><div class="zona-marker" style="background:'+col+';" title="'+z.nombre+'"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
        const marker = L.marker([z.lat, z.lng], { icon: zonaIcon, draggable: true }).addTo(window.map);
        marker.on('dragend', function(e) { 
            const p = e.target.getLatLng(); 
            appState.data.zonas[idx].lat = p.lat; 
            appState.data.zonas[idx].lng = p.lng; 
            renderMapZones(); 
        });
        marker.on('drag', function() { marker.closePopup(); });
        
        const factorCarga = stat.tn > 0 ? ((stat.kg / stat.tn) * 1000).toFixed(1) : 0;
        
        let statsHtml = '<div class="popup-blast-body" style="padding-bottom:5px;">';
        statsHtml += '<div class="popup-row"><span class="lbl"><i class="ph-bold ph-fire"></i> Disparos</span><span class="val">' + stat.count + '</span></div>';
        statsHtml += '<div class="popup-row"><span class="lbl"><i class="ph-bold ph-mountains"></i> Extracción</span><span class="val green">' + stat.tn.toLocaleString('es-AR') + ' Tn</span></div>';
        if (stat.count > 0) {
            statsHtml += '<div class="popup-divider"></div>';
            statsHtml += '<div class="popup-row"><span class="lbl"><i class="ph-bold ph-currency-dollar"></i> Inversión</span><span class="val highlight">USD ' + stat.costo.toLocaleString('es-AR') + '</span></div>';
            statsHtml += '<div class="popup-row"><span class="lbl"><i class="ph-bold ph-package"></i> Explosivos</span><span class="val">' + stat.kg.toLocaleString('es-AR') + ' Kg</span></div>';
            statsHtml += '<div class="popup-acumulado" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);"><span class="lbl"><i class="ph-fill ph-target"></i> Factor Carga</span><span class="val" style="color:var(--accent);">' + factorCarga + ' g/Tn</span></div>';
        } else {
            statsHtml += '<div style="text-align:center;color:var(--text-dim);font-size:0.75rem;margin-top:10px;font-style:italic;">Sin operaciones históricas asociadas</div>';
        }
        statsHtml += '</div>';

        const actionsHtml = '<div class="popup-zona-actions" style="padding: 0 16px 14px;"><button class="popup-btn-rename" onclick="renombrarZona('+idx+')"><i class="ph-bold ph-pencil"></i></button><button class="popup-btn-delete-zone" onclick="eliminarZona('+idx+')"><i class="ph-bold ph-trash"></i></button></div>';
        
        marker.bindPopup('<div class="popup-zona-card"><div class="popup-zona-header" style="background:linear-gradient(135deg, ' + col + ' 0%, #1e293b 250%);box-shadow: 0 2px 8px rgba(0,0,0,0.4);z-index:2;position:relative;"><h4>'+z.nombre+'</h4></div>' + statsHtml + actionsHtml + '</div>', { maxWidth: 280, minWidth: 220 });
        window._mapLayers.push(marker);
    });
};

window.renderMapZones = function() {
    updateMapPins();
    const listaZonas = document.getElementById('zonas-list');
    if (listaZonas && appState.data.zonas) {
        if (appState.data.zonas.length === 0) {
            listaZonas.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">Hacé clic en el mapa para añadir frentes.</div>';
        } else {
            listaZonas.innerHTML = appState.data.zonas.map(function(z, i) {
                return '<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;border-left:3px solid ' + (z.color || '#ea580c') + ';">' +
                       '<div><strong>' + z.nombre + '</strong><br><small>Lat: ' + parseFloat(z.lat).toFixed(4) + ' | Lng: ' + parseFloat(z.lng).toFixed(4) + '</small></div>' +
                       '<div style="display:flex;gap:6px;"><button onclick="window.map.setView([' + z.lat + ',' + z.lng + '],17)"><i class="ph-bold ph-crosshair"></i></button>' +
                       '<button onclick="renombrarZona(' + i + ')"><i class="ph-bold ph-pencil"></i></button>' +
                       '<button onclick="eliminarZona(' + i + ')"><i class="ph-bold ph-trash"></i></button></div></div>';
            }).join('');
        }
        
        const confZonas = document.getElementById('config-zonas-body');
        if (confZonas) {
            confZonas.innerHTML = appState.data.zonas.map(function(z, i) {
                return '<tr><td><div style="display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:50%;background:' + (z.color || '#ea580c') + ';"></div><strong>' + z.nombre + '</strong></div></td>' +
                       '<td><button onclick="renombrarZona(' + i + ')">✏️</button><button onclick="eliminarZona(' + i + ')">🗑️</button></td></tr>';
            }).join('');
        }
    }
    if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
};

window.renderConfigPanel = function() {
    const targets = appState.data.config.targets;
    const setVal = function(id, val) { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('target-primaria', targets['Planta Primaria'] || 450);
    setVal('target-planta1', targets['Planta 1'] || 320);
    setVal('target-planta2', targets['Planta 2'] || 280);
    setVal('config-valor-tn', appState.data.config.valorTnUSD || 15);

    const workersBody = document.getElementById('config-workers-body');
    if (workersBody) {
        workersBody.innerHTML = (appState.data.config.operarios || []).map(function(op, i) {
            return '<tr><td style="font-weight:600;">' + op + '</td><td><button onclick="eliminarOperario(' + i + ')" style="background:transparent;color:var(--danger);padding:4px;">🗑️</button></td></tr>';
        }).join('');
    }

    const prodBody = document.getElementById('config-productos-body');
    if (prodBody) {
        prodBody.innerHTML = (appState.data.config.productos || []).map(function(p, i) {
            return '<tr><td style="font-weight:600;">' + p.nombre + '</td><td style="color:var(--success);">USD ' + p.precio + '</td><td><button onclick="eliminarProducto(' + i + ')" style="background:transparent;color:var(--danger);padding:4px;">🗑️</button></td></tr>';
        }).join('');
    }

    if (window.actualizarSelectoresPlantistas) window.actualizarSelectoresPlantistas();
    aplicarModulosActivos();
    if (window.renderDbManager) window.renderDbManager();
};

window.aplicarModulosActivos = function() {
    const mods = appState.data.config.modulos || {};
    const setDisplay = function(id, condition) { const el = document.getElementById(id); if (el) el.style.display = condition ? 'block' : 'none'; };
    const setChecked = function(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; };

    const navVentas = document.getElementById('nav-ventas');
    if (navVentas) navVentas.style.display = mods.comercial ? 'flex' : 'none';
    
    setDisplay('modulo-automatizacion-card', mods.automatizacion);
    setChecked('toggle-mod-comercial', mods.comercial);
    setChecked('toggle-mod-rrhh', mods.rrhh);
    setChecked('toggle-mod-agro', mods.agro);
    setChecked('toggle-mod-automatizacion', mods.automatizacion);
};

window.renderFallasRecurrentes = function() {
    const tbody = document.getElementById('maint-recurrent-body'); if (!tbody) return;
    const filtroEl = document.getElementById('global-month-filter');
    const mesBuscado = filtroEl ? filtroEl.value : '';
    const conteo = {};
    (appState.data.mantenimiento || []).forEach(function(m) {
        if (!m.tarea || !m.fecha) return;
        let fn = String(m.fecha).replace(/\//g, '-');
        if (fn.split('-')[0].length === 2) { const p = fn.split('-'); fn = p[2] + '-' + p[1]; }
        if (fn.startsWith(mesBuscado)) {
            const key = m.equipo + '|||' + m.tarea;
            conteo[key] = (conteo[key] || { equipo: m.equipo, tarea: m.tarea, count: 0 });
            conteo[key].count++;
        }
    });
    const recurrentes = Object.values(conteo).sort((a, b) => b.count - a.count);
    const insightDiv = document.getElementById('maint-ai-insight');
    if (insightDiv) {
        if (recurrentes.length > 0 && recurrentes[0].count >= 4) {
            insightDiv.style.display = 'flex'; insightDiv.style.background = 'rgba(245,158,11,0.15)'; insightDiv.style.border = '1px solid var(--warning)';
            insightDiv.innerHTML = '<i class="ph-fill ph-lightbulb" style="color:var(--warning);font-size:1.2rem;margin-right:10px;"></i><div><b>Alerta Severa:</b> En ' + recurrentes[0].equipo + ' la tarea "<i>' + recurrentes[0].tarea + '</i>" se repitió <b>' + recurrentes[0].count + ' veces</b> este mes. Posible falla de raíz.</div>';
        } else insightDiv.style.display = 'none';
    }
    tbody.innerHTML = recurrentes.map(function(r) {
        return '<tr><td style="font-weight:600;">' + r.equipo + '</td><td style="font-size:0.85rem;">' + r.tarea + '</td><td><span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;font-weight:bold;">' + r.count + ' veces</span></td></tr>';
    }).join('');
    if (recurrentes.length === 0) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:20px;">Sin datos para ' + mesBuscado + '</td></tr>';
};

window.renderResumenHorasMaquinas = function() {
    const panel = document.getElementById('panel-resumen-horas');
    if (!panel) return;

    const maquinas = [
        { id: 'alteirac', nombre: 'Alteirac', planta: 'Primaria' },
        { id: 'n1560', nombre: 'N.1560', planta: 'Planta 1' },
        { id: 'hp400', nombre: 'HP400', planta: 'Planta 1' },
        { id: 'svedala', nombre: 'Svedala', planta: 'Planta 2' },
        { id: 'hp100', nombre: 'HP100', planta: 'Planta 2' }
    ];

    panel.innerHTML = maquinas.map(function(m) {
        const mach = WEAR_MACHINES[m.id];
        if (!mach) return '';

        let hrsTotal = 0;
        (appState.data.produccion || []).forEach(function(p) {
            if (p.sector !== mach.planta) return;
            if (p.maquinas && p.maquinas[m.id] !== undefined) hrsTotal += parseFloat(p.maquinas[m.id]) || 0;
            else hrsTotal += parseFloat(p.hrs || 0);
        });
        hrsTotal = Math.round(hrsTotal * 10) / 10;

        const piezaPrincipal = mach.piezas[0];
        const pk = m.id + '-' + piezaPrincipal.id;
        const vidaMaxima = (appState.data.piezas && appState.data.piezas[pk]) ? 
            parseFloat(appState.data.piezas[pk].vida) || piezaPrincipal.vida : piezaPrincipal.vida;
        
        const pct = Math.min(100, (hrsTotal / vidaMaxima) * 100);
        const col = pct >= 85 ? 'var(--danger)' : pct >= 60 ? 'var(--warning)' : 'var(--success,#22c55e)';
        const hrsRestantes = Math.max(0, vidaMaxima - hrsTotal);

        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
            '<div style="width:70px;font-size:0.75rem;font-weight:700;color:var(--text-main);">' + m.nombre + '</div>' +
            '<div style="flex:1;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
                    '<span style="font-size:0.68rem;color:' + col + ';font-weight:700;">' + pct.toFixed(0) + '% desgaste</span>' +
                    '<span style="font-size:0.68rem;color:var(--text-dim);">' + hrsTotal.toLocaleString('es-AR') + ' / ' + vidaMaxima + ' hs</span>' +
                '</div>' +
                '<div style="background:rgba(128,128,128,0.15);border-radius:4px;height:6px;">' +
                    '<div style="height:100%;width:' + pct.toFixed(0) + '%;background:' + col + ';border-radius:4px;transition:width 0.5s;"></div>' +
                '</div>' +
                '<div style="font-size:0.65rem;color:var(--text-dim);margin-top:2px;">Restante: <b style="color:' + col + ';">' + hrsRestantes.toLocaleString('es-AR') + ' hs</b> · ' + m.planta + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
};

window.actualizarPanelTurnoActivo = function() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const turnoActual = (hora >= 6 && hora < 15) ? 'Dia' : 'Noche';
    const setEl = function(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; };
    const setStyle = function(id, prop, val) { const e = document.getElementById(id); if (e) e.style[prop] = val; };

    setEl('turno-reloj', ahora.toTimeString().substring(0, 5));

    if (turnoActual === 'Dia') {
        setEl('turno-activo-icon', '☀️');
        setStyle('turno-activo-icon', 'background', 'rgba(251,191,36,0.15)');
        setEl('turno-activo-nombre', 'Turno Día');
        setEl('turno-activo-hora', '06:00 — 15:00');
        const fin = new Date(); fin.setHours(15, 0, 0, 0);
        const minVal = Math.max(0, Math.round((fin.getTime() - ahora.getTime()) / 60000));
        setEl('turno-tiempo-restante', minVal > 0 ? minVal + ' min hasta fin' : 'Cambio de turno');
    } else {
        setEl('turno-activo-icon', '🌙');
        setStyle('turno-activo-icon', 'background', 'rgba(99,102,241,0.15)');
        setEl('turno-activo-nombre', 'Turno Noche');
        setEl('turno-activo-hora', '15:00 — 06:00');
        const fin = new Date(); if (hora >= 15) fin.setDate(fin.getDate() + 1);
        fin.setHours(6, 0, 0, 0);
        const minVal = Math.max(0, Math.round((fin.getTime() - ahora.getTime()) / 60000));
        setEl('turno-tiempo-restante', minVal > 0 ? minVal + ' min hasta fin' : 'Cambio de turno');
    }

    const hoy = ahora.toISOString().split('T')[0];
    const turnos = (appState.data.produccion || []).filter(function(p) { return p.fecha === hoy && p.turno === turnoActual; });
    const stats = { primaria: { op: '—', tn: 0 }, planta1: { op: '—', tn: 0 }, planta2: { op: '—', tn: 0 } };

    turnos.forEach(function(t) {
        if (t.sector === 'Planta Primaria') { stats.primaria.op = t.operario || '—'; stats.primaria.tn += parseFloat(t.tn || 0); }
        if (t.sector === 'Planta 1') { stats.planta1.op = t.operario || '—'; stats.planta1.tn += parseFloat(t.tn || 0); }
        if (t.sector === 'Planta 2') { stats.planta2.op = t.operario || '—'; stats.planta2.tn += parseFloat(t.tn || 0); }
    });

    setEl('turno-plantista-primaria', stats.primaria.op);
    setEl('turno-plantista-planta1', stats.planta1.op);
    setEl('turno-plantista-planta2', stats.planta2.op);
    setEl('turno-tn-primaria', stats.primaria.tn > 0 ? stats.primaria.tn.toLocaleString('es-AR') + ' Tn' : '0 Tn');
    setEl('turno-tn-planta1', stats.planta1.tn > 0 ? stats.planta1.tn.toLocaleString('es-AR') + ' Tn' : '0 Tn');
    setEl('turno-tn-planta2', stats.planta2.tn > 0 ? stats.planta2.tn.toLocaleString('es-AR') + ' Tn' : '0 Tn');
};

window.eliminarOperario = function(index) { if (confirm('¿Eliminar este operario?')) { appState.data.config.operarios.splice(index, 1); syncAndRefreshData(); } };
window.eliminarProducto = function(index) { if (confirm('¿Eliminar este producto?')) { appState.data.config.productos.splice(index, 1); syncAndRefreshData(); } };
window.renombrarZona = function(index) {
    const zona = appState.data.zonas[index];
    const nuevo = prompt('Nuevo nombre para este frente:', zona.nombre);
    if (nuevo && nuevo.trim() !== '' && nuevo !== zona.nombre) {
        const viejo = zona.nombre; zona.nombre = nuevo.trim();
        appState.data.voladuras.forEach(function(v) { if (v.frente === viejo) v.frente = zona.nombre; });
        syncAndRefreshData();
    }
};
window.eliminarZona = function(index) { const zona = appState.data.zonas[index]; if (confirm('¿Eliminar el frente "' + zona.nombre + '" del mapa?')) { appState.data.zonas.splice(index, 1); syncAndRefreshData(); } };
window.eliminarVoladura = function(idx) { if (confirm('¿Eliminar este registro de voladura del historial?')) { appState.data.voladuras.splice(idx, 1); syncAndRefreshData(); } };

// ═══════════════════════════════════════════════════════════════════
// MÓDULO PESÓMETROS — BALANZAS DE CINTA
// ═══════════════════════════════════════════════════════════════════

window.renderPesometros = function() {
    const lecturas = window._lecturasPeso || [];
    const cfg = appState.data.configBalanzas || [];
    const cintasPresentes = [];
    PESO_CINTAS_ORDEN.forEach(function(c) {
        if(lecturas.some(function(l) { return l.valores[c] !== undefined; })) cintasPresentes.push(c);
    });
    cfg.forEach(function(b) { if(b.activa && !cintasPresentes.includes(b.id)) cintasPresentes.push(b.id); });

    renderPesoKPIs(lecturas, cintasPresentes, cfg);
    renderPesoTabla(lecturas, cintasPresentes);
    renderPesoGrafico(lecturas, cintasPresentes);
    renderPesoResumenTurno(lecturas, cintasPresentes);
    renderPesoHistorial();
};

function renderPesoKPIs(lecturas, cintas, cfg) {
    const cont = document.getElementById('peso-kpis');
    if(!cont) return;
    if(!lecturas.length) {
        cont.innerHTML = cintas.map(function(c) {
            const color = PESO_COLORES[c] || '#94a3b8';
            const cfgB = cfg.find(function(b) { return b.id===c; }) || {};
            return '<div class="peso-kpi-card" style="border-top:3px solid ' + color + ';">' +
                   '<div class="pnombre" style="color:' + color + ';">' + c + '</div>' +
                   '<div class="pval" style="color:var(--text-dim);">—</div>' +
                   '<div class="psub">' + (cfgB.desc||'') + '</div></div>';
        }).join('');
        return;
    }
    const toM = function(h) { const p=h.split(':'); return parseInt(p[0])*60+parseInt(p[1]); };
    const durMin = lecturas.length > 1
        ? (function() { const d = toM(lecturas[lecturas.length-1].hora) - toM(lecturas[0].hora); return d>=0?d:1440+d; })()
        : 60;
    const intervH = lecturas.length > 1 ? (durMin/60)/(lecturas.length-1) : 1;

    cont.innerHTML = cintas.map(function(c) {
        const color = PESO_COLORES[c] || '#94a3b8';
        const cfgB = cfg.find(function(b) { return b.id===c; }) || { rangoMax:500, desc:'' };
        const vals = lecturas.map(function(l) { return l.valores[c]; }).filter(function(v) { return v!==undefined && !isNaN(v); });
        if(!vals.length) return '<div class="peso-kpi-card" style="border-top:3px solid ' + color + ';"><div class="pnombre" style="color:' + color + ';">' + c + '</div><div class="pval">S/D</div></div>';
        
        const prom = vals.reduce(function(a,b){return a+b;},0)/vals.length;
        const total = vals.reduce(function(a,b){return a+b;},0) * intervH;
        const pct = Math.min((prom/cfgB.rangoMax)*100, 100);
        
        return '<div class="peso-kpi-card" style="border-top:3px solid ' + color + ';">' +
            '<div class="pnombre" style="color:' + color + ';">' + c + '</div>' +
            '<div class="pval" style="color:' + color + ';">' + prom.toFixed(1) + ' <small>Tn/h</small></div>' +
            '<div class="psub">Total: <b>' + total.toFixed(0) + ' Tn</b></div>' +
            '<div class="pbarra"><div class="pbarra-fill" style="width:' + pct + '%;background:' + color + ';"></div></div></div>';
    }).join('');
}

function renderPesoTabla(lecturas, cintas) {
    const tbody = document.getElementById('peso-tbody');
    if(!tbody) return;
    tbody.innerHTML = lecturas.map(function(l) {
        const celdas = PESO_CINTAS_ORDEN.map(function(c) {
            const v = l.valores[c];
            return '<td style="font-weight:700;color:' + (PESO_COLORES[c]||'inherit') + ';">' + (v !== undefined ? v.toFixed(1) : '—') + '</td>';
        }).join('');
        return '<tr><td>' + l.fecha + '</td><td>' + l.hora + '</td>' + celdas + '</tr>';
    }).join('');
}

function renderPesoHistorial() {
    const tbody = document.getElementById('peso-historial-tbody');
    if(!tbody) return;
    const turnos = (appState.data.pesometros || []).slice().reverse();
    tbody.innerHTML = turnos.length === 0 ? '<tr><td colspan="9">Sin turnos</td></tr>' : 
        turnos.map(function(t) {
            const celdas = PESO_CINTAS_ORDEN.map(function(c) {
                const s = t.stats && t.stats[c];
                return s ? '<td><b>' + s.prom.toFixed(1) + ' Tn/h</b><br><small>' + s.total.toFixed(0) + ' Tn</small></td>' : '<td>—</td>';
            }).join('');
            return '<tr><td>' + t.fecha + '</td><td>' + t.horaInicio + '-' + t.horaFin + '</td><td>' + t.lecturas + '</td><td>' + t.duracion + 'h</td>' + celdas + '</tr>';
        }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO INVENTARIO
// ═══════════════════════════════════════════════════════════════════

window.renderInventario = function() {
    const inv = appState.data.inventario || [];
    const tbody = document.getElementById('inv-tbody');
    if(!tbody) return;
    tbody.innerHTML = inv.length === 0 ? '<tr><td colspan="8">Sin ítems</td></tr>' : 
        inv.map(function(it) {
            const status = it.stockActual <= 0 ? 'SIN STOCK' : it.stockActual <= it.stockMinimo ? 'REPONER' : 'OK';
            const col = status === 'OK' ? 'var(--success)' : status === 'REPONER' ? 'var(--warning)' : 'var(--danger)';
            return '<tr>' +
                '<td>' + it.codigo + '</td><td>' + it.descripcion + '</td><td>' + it.maquina + '</td>' +
                '<td style="font-weight:800;color:' + col + ';">' + it.stockActual + '</td><td>' + it.stockMinimo + '</td>' +
                '<td><span style="color:' + col + ';">' + status + '</span></td><td>$' + (it.costoUSD||0) + '</td>' +
                '<td><button onclick="abrirModalInventario(\'' + it.id + '\')">Editar</button></td></tr>';
        }).join('');
    
    renderInvAlertas(inv);
    renderInvHistorial();
};

function renderInvAlertas(inv) {
    const banner = document.getElementById('inv-alertas-banner');
    if(!banner) return;
    const bajos = inv.filter(function(it) { return it.stockActual <= it.stockMinimo; });
    banner.innerHTML = bajos.map(function(it) { return '<div class="inv-alert">⚠️ ' + it.descripcion + ': ' + it.stockActual + ' ud. (Mín: ' + it.stockMinimo + ')</div>'; }).join('');
}

function renderInvHistorial() {
    const tbody = document.getElementById('inv-hist-tbody');
    if(!tbody) return;
    const hist = (appState.data.movimientosInventario || []).slice().reverse();
    tbody.innerHTML = hist.map(function(m) { return '<tr><td>' + m.fecha + '</td><td>' + m.descripcion + '</td><td>' + m.tipo + '</td><td>' + m.cantidad + '</td><td>' + m.stockResultante + '</td><td>' + (m.obs||'—') + '</td></tr>'; }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// MÓDULO PLAN MANTENIMIENTO
// ═══════════════════════════════════════════════════════════════════

window.renderPlanMantenimiento = function() {
    const paradas = appState.data.paradasProgramadas || [];
    const tbody = document.getElementById('plan-tbody');
    if(!tbody) return;
    
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    tbody.innerHTML = paradas.length === 0 ? '<tr><td colspan="7">Sin paradas</td></tr>' : 
        paradas.map(function(p) {
            const diff = Math.ceil((new Date(p.fecha+'T12:00:00') - hoy) / 86400000);
            const col = p.estado==='completado' ? 'var(--success)' : diff<=3 ? 'var(--danger)' : diff<=7 ? 'var(--warning)' : 'inherit';
            return '<tr>' +
                '<td><b>' + p.maquina + '</b></td><td>' + p.tipo + '</td><td>' + p.fecha + '</td>' +
                '<td>' + (p.duracion||'—') + 'h</td><td>' + (p.responsable||'—') + '</td>' +
                '<td style="color:' + col + ';">' + (p.estado==='completado' ? '✓ OK' : diff+'d') + '</td>' +
                '<td><button onclick="marcarParadaCompletada(\'' + p.id + '\')">✓</button></td></tr>';
        }).join('');

    renderAlertasDesgaste(appState.data.alertasDesgaste || []);
};

window.renderAlertasDesgaste = function(alertas) {
    const contenedores = ['alertas-desgaste-costos-1', 'alertas-desgaste-costos-2', 'alertas-desgaste-voladuras', 'alertas-desgaste-mant', 'alertas-desgaste-resumen'];
    const alertsToRender = alertas || appState.data.alertasDesgaste || [];
    
    contenedores.forEach(function(id) {
        const el = document.getElementById(id);
        if (!el) return;

        if (alertsToRender.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:15px;color:var(--success);font-size:0.82rem;font-weight:700;">✓ Sin anomalías detectadas en el desgaste</div>';
            return;
        }

        el.innerHTML = alertsToRender.map(function(a) {
            const color = a.nivel === 'critico' ? 'var(--danger)' : a.nivel === 'advertencia' ? 'var(--warning)' : 'var(--accent)';
            const bg = a.nivel === 'critico' ? 'rgba(248,113,113,0.08)' : a.nivel === 'advertencia' ? 'rgba(251,191,36,0.08)' : 'rgba(59,130,246,0.06)';
            const icon = a.nivel === 'critico' ? '🔴' : a.nivel === 'advertencia' ? '🟡' : '🔵';
            return '<div style="background:' + bg + ';border:1px solid ' + color + ';border-radius:8px;padding:12px;margin-bottom:8px;animation:fadeIn 0.3s ease;">' +
                   '<div style="font-weight:800;color:' + color + ';margin-bottom:4px;font-size:0.85rem;">' + icon + ' ' + a.mensaje + '</div>' +
                   '<div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:4px;">' + a.detalle + '</div>' +
                   (a.proyeccion ? '<div style="font-size:0.78rem;color:var(--text-main);font-weight:700;margin-bottom:4px;">⏱ ' + a.proyeccion + '</div>' : '') +
                   (a.frente ? '<div style="font-size:0.75rem;color:var(--purple);margin-bottom:4px;">📍 ' + a.frente + '</div>' : '') +
                   '<div style="font-size:0.75rem;color:var(--text-dim);font-style:italic;">💡 ' + a.accion + '</div></div>';
        }).join('');
    });
};

// ═══════════════════════════════════════════════════════════════════
// MÓDULO TURNO LIVE
// ═══════════════════════════════════════════════════════════════════

window.initTurnoLive = function() {
    renderTurnoLive();
    if (window._turnoLiveInterval) clearInterval(window._turnoLiveInterval);
    window._turnoLiveInterval = setInterval(function() {
        const clockEl = document.getElementById('turno-live-clock');
        if (clockEl) clockEl.textContent = new Date().toLocaleTimeString('es-AR');
        renderTurnoLive();
    }, 30000); // Actualizar cada 30s
};

window.renderTurnoLive = function() {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    const hora = hoy.getHours();
    const turnoActual = (hora >= 6 && hora < 15) ? 'Dia' : 'Noche';

    const regs = appState.data.produccion.filter(function(p) { return p.fecha === fechaHoy && p.turno === turnoActual; });
    const tnTurno = regs.reduce(function(s, p) { return s + parseFloat(p.tn || 0); }, 0);
    const hsTurno = regs.reduce(function(s, p) { return s + parseFloat(p.hs || 0); }, 0);
    const hsPerd = regs.reduce(function(s, p) { return s + parseFloat(p.hrsPerdidas || 0); }, 0);

    const kpisEl = document.getElementById('turno-kpis');
    if (kpisEl) {
        kpisEl.innerHTML = [
            { label: 'Turno Actual', val: turnoActual, sub: hoy.toLocaleDateString('es-AR'), color: 'var(--accent)' },
            { label: 'Producción Turno', val: tnTurno.toLocaleString('es-AR') + ' Tn', sub: 'Plantas Activas', color: 'var(--success)' },
            { label: 'Horas Trabajo', val: hsTurno.toFixed(1) + ' hs', sub: 'Perdidas: ' + hsPerd.toFixed(1), color: hsPerd > 1 ? 'var(--warning)' : 'var(--text-main)' }
        ].map(function(k) {
            return '<div class="kpi-card" style="border-top:3px solid ' + k.color + ';">' +
                   '<div style="font-size:0.72rem;color:var(--text-dim);font-weight:700;text-transform:uppercase;margin-bottom:6px;">' + k.label + '</div>' +
                   '<div style="font-size:1.8rem;font-weight:800;color:' + k.color + ';">' + k.val + '</div>' +
                   '<div style="font-size:0.78rem;color:var(--text-dim);margin-top:4px;">' + k.sub + '</div></div>';
        }).join('');
    }

    const alertasEl = document.getElementById('turno-alertas');
    if (alertasEl) {
        const alertas = appState.data.alertasDesgaste || [];
        alertasEl.innerHTML = alertas.length > 0 
            ? alertas.map(function(a) { return '<div style="font-size:0.8rem;padding:8px;margin-bottom:6px;border-radius:6px;background:rgba(248,113,113,0.1);color:var(--danger);">' + a.mensaje + '</div>'; }).join('')
            : '<div style="text-align:center;padding:20px;color:var(--success);font-weight:700;">✓ Sin alertas</div>';
    }
    
    // Plantas Estado
    const plantasEl = document.getElementById('turno-plantas-estado');
    if (plantasEl) {
        const plantas = [
            { nombre: 'Planta Primaria', sector: 'Planta Primaria', color: '#34d399' },
            { nombre: 'Planta 1', sector: 'Planta 1', color: '#60a5fa' },
            { nombre: 'Planta 2', sector: 'Planta 2', color: '#a78bfa' }
        ];
        plantasEl.innerHTML = plantas.map(function(pl) {
            const pr = appState.data.produccion.filter(function(p) { return p.fecha === fechaHoy && p.sector === pl.sector; });
            const activa = pr.length > 0;
            return '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:4px solid ' + (activa ? pl.color : 'var(--border)') + '">' +
                   '<div class="dot" style="background:' + (activa ? pl.color : 'var(--text-dim)') + '; ' + (activa ? 'box-shadow: 0 0 10px ' + pl.color : '') + '"></div>' +
                   '<div style="flex:1;">' +
                   '<div style="font-weight:700;">' + pl.nombre + '</div>' +
                   '<div style="font-size:0.75rem;color:var(--text-dim);">' + (activa ? 'Activa hoy' : 'Sin registros') + '</div></div>' +
                   '<div style="font-weight:800;color:' + (activa ? pl.color : 'var(--text-dim)') + ';">' + (activa ? 'ON' : 'OFF') + '</div></div>';
        }).join('');
    }
};

window.renderTnHistorial = function() {
    const tbody = document.getElementById('tn-historial-body');
    if(!tbody) return;
    const regs = (appState.data.tnManual || []).slice().reverse();
    tbody.innerHTML = regs.map(function(r) { return '<tr><td>' + r.mes + ' ' + r.anio + '</td><td>' + r.primaria + '</td><td>' + r.planta2 + '</td><td>' + (r.primaria+r.planta2) + '</td></tr>'; }).join('');
};

// ══════════════════════════════════════════════════════
// API KEY & CONFIGURATION
// ══════════════════════════════════════════════════════
window.guardarApiKey = function() {
    const keyEl = document.getElementById('config-api-key');
    const key = keyEl ? keyEl.value.trim() : '';
    if(!key) { alert('Ingresá una API key válida.'); return; }
    if(!appState.data.config) appState.data.config = {};
    appState.data.config.apiKey = key;
    dataSync.save();
    const status = document.getElementById('api-key-status');
    if(status) {
        status.innerHTML = '<span style="color:var(--success);">✅ API key guardada correctamente</span>';
        setTimeout(function() { status.textContent = ''; }, 3000);
    }
};

window.toggleApiKeyVisibility = function() {
    const inp = document.getElementById('config-api-key');
    if(inp) inp.type = inp.type === 'password' ? 'text' : 'password';
};

window.cargarApiKeyGuardada = function() {
    const inp = document.getElementById('config-api-key');
    if(inp && appState.data.config && appState.data.config.apiKey) {
        inp.value = appState.data.config.apiKey;
    }
};

window.analizarAlertasDesgaste = function() {
    var alertas = [];
    var historial = appState.data.historialCambios || [];
    var voladuras = appState.data.blasting || [];
    var produccion = appState.data.produccion || [];

    if(!historial.length) return alertas;

    var porMaquina = {};
    historial.forEach(function(c) {
        var key = c.maquina + '-' + c.pieza;
        if(!porMaquina[key]) porMaquina[key] = [];
        porMaquina[key].push(c);
    });

    Object.keys(porMaquina).forEach(function(key) {
        var cambios = porMaquina[key].filter(function(c){ return c.hrsReales > 0; });
        if(cambios.length < 2) return;

        var maquinaId = key.split('-')[0];
        var piezaId   = key.split('-').slice(1).join('-');
        var mach = typeof WEAR_MACHINES !== 'undefined' ? WEAR_MACHINES[maquinaId] : null;
        var nombreMaq = mach ? mach.nombre : maquinaId;

        var vidaTecnica = cambios[cambios.length-1].vidaTecnica || 2500;
        var promedioHistorico = cambios.reduce(function(s,c){ return s + c.hrsReales; }, 0) / cambios.length;
        var ultimosCambios = cambios.slice(-2);
        var promedioReciente = ultimosCambios.reduce(function(s,c){ return s + c.hrsReales; }, 0) / ultimosCambios.length;
        var diferenciaPct = ((promedioReciente - promedioHistorico) / promedioHistorico) * 100;

        if(diferenciaPct < -15) {
            var hrsAcumActual = 0;
            var fechaUltimoCambio = cambios[cambios.length-1].fecha || '2000-01-01';
            produccion.forEach(function(p) {
                if(p.fecha >= fechaUltimoCambio) {
                    if(p.maquinas && p.maquinas[maquinaId] !== undefined)
                        hrsAcumActual += parseFloat(p.maquinas[maquinaId]) || 0;
                    else if(mach && p.sector === mach.planta)
                        hrsAcumActual += parseFloat(p.hrs || 0);
                }
            });
            var hsRestantes = Math.max(0, promedioReciente - hrsAcumActual);
            var diasRestantes = Math.round(hsRestantes / 16);

            var frentesCounts = {};
            voladuras.forEach(function(v) {
                if(v.fecha >= fechaUltimoCambio) {
                    frentesCounts[v.frente] = (frentesCounts[v.frente] || 0) + 1;
                }
            });
            var frenteDominante = Object.keys(frentesCounts).sort(function(a,b){
                return frentesCounts[b] - frentesCounts[a];
            })[0];
            var totalV = Object.values(frentesCounts).reduce(function(a,b){return a+b;},0);
            var pctFrente = frenteDominante ? Math.round((frentesCounts[frenteDominante] / totalV) * 100) : 0;

            alertas.push({
                tipo: 'desgaste-acelerado',
                nivel: Math.abs(diferenciaPct) > 30 ? 'critico' : 'advertencia',
                maquina: nombreMaq, maquinaId: maquinaId, pieza: piezaId,
                mensaje: nombreMaq + ' — Desgaste acelerado: ' + Math.abs(diferenciaPct).toFixed(0) + '% menos que el promedio',
                detalle: 'Promedio: ' + Math.round(promedioHistorico) + ' hs · Reciente: ' + Math.round(promedioReciente) + ' hs',
                proyeccion: hsRestantes > 0 ? 'Estimado: ~' + Math.round(hsRestantes) + ' hs (' + diasRestantes + ' días)' : 'Cambio pronto',
                frente: frenteDominante ? 'Frente predominante: ' + frenteDominante + ' (' + pctFrente + '%)' : null,
                accion: 'Verificar abrasividad del frente activo.'
            });
        }
    });

    appState.data.alertasDesgaste = alertas;
    dataSync.save();
    renderAlertasDesgaste(alertas);
    return alertas;
};
