
/**
 * dataSync.js
 * Core synchronization engine and database management for the Quarry Dashboard.
 */

window.syncAndRefreshData = function() {
    const statusPill = document.getElementById('nav-status-pill');
    if(statusPill) statusPill.classList.add('syncing');

    try {
        localStorage.setItem('guerrico-db', JSON.stringify(appState.data));
    } catch(err) {
        console.error("Error saving to localStorage:", err);
    }

    setTimeout(() => { if(statusPill) statusPill.classList.remove('syncing'); }, 800);

    // Reset monthly data arrays
    Object.keys(appState.monthlyData).forEach(k => appState.monthlyData[k] = new Array(12).fill(0));

    let totalFuel = 0, totalLub = 0, totalElectric = 0, totalAlmacen = 0, totalOtros = 0, totalBlastCost = 0;
    let tnMensualPrimaria = 0, tnMensualPlanta1 = 0, tnMensualPlanta2 = 0;
    let blastTnMes = 0, blastCostMes = 0, blastKgMes = 0, blastPozosMes = 0, blastCountMes = 0;

    // Process Production Data
    appState.data.produccion.forEach(item => {
        const m = getMonthSafe(item.fecha);
        const tn = parseFloat(item.tn || 0);
        if (m >= 0 && m < 12) {
            appState.monthlyData.produccion[m] += tn;
            if (m === currentMonth && getYearSafe(item.fecha) === currentYear) {
                if (item.sector === 'Planta Primaria') tnMensualPrimaria += tn;
                if (item.sector === 'Planta 1') tnMensualPlanta1 += tn;
                if (item.sector === 'Planta 2') tnMensualPlanta2 += tn;
            }
        }
    });

    // Process Despacho Data
    appState.data.despacho.forEach(item => {
        const m = getMonthSafe(item.fecha);
        if (m >= 0 && m < 12) {
            appState.monthlyData.despacho[m] += parseFloat(item.tn || 0);
        }
    });

    // Process Consumos Data
    appState.data.consumos.forEach(item => {
        const m = getMonthSafe(item.fecha);
        if (m >= 0 && m < 12) {
            // If item has detailed 'items' array (Excel import), sum total cost from there
            if (item.items && item.items.length > 0) {
                const totalCosto = item.total || item.items.reduce((s,i)=>s+i.valor,0);
                appState.monthlyData.otrosCostos[m] += totalCosto;
                totalOtros += totalCosto;
                // Also fill individual fields for chart compatibility
                appState.monthlyData.almacen[m]  += parseFloat(item.almacen  || 0);
                appState.monthlyData.blastCost[m] += parseFloat(item.cost || 0);
            } else {
                // Legacy manual entry (individual fields)
                const d = parseFloat(item.diesel || 0), l = parseFloat(item.lub || 0),
                      e = parseFloat(item.electric || 0), a = parseFloat(item.almacen || 0),
                      c = parseFloat(item.cost || 0);
                appState.monthlyData.diesel[m] += d;
                appState.monthlyData.lub[m]    += l;
                appState.monthlyData.electric[m]+= e;
                appState.monthlyData.almacen[m] += a;
                appState.monthlyData.otrosCostos[m] += c;
                totalFuel += d; totalLub += l; totalElectric += e; totalAlmacen += a; totalOtros += c;
            }
        }
    });

    // Process litros de combustible (separate field — actual liters, not cost $)
    const litrosPorMes = new Array(12).fill(0);
    (appState.data.litrosCombustible || []).forEach(item => {
        const m = getMonthSafe(item.fecha);
        if (m >= 0 && m < 12 && getYearSafe(item.fecha) === currentYear) {
            litrosPorMes[m] += parseFloat(item.litros || 0);
        }
    });
    appState._litrosPorMes = litrosPorMes; // store for KPI calc

    // Process Voladuras Data
    appState.data.voladuras.forEach(vol => {
        const m = getMonthSafe(vol.fecha);
        if (m >= 0 && m < 12) {
            const cost = parseFloat(vol.cost || 0), tn = parseFloat(vol.tn || 0), 
                  kg = parseFloat(vol.kg || 0), pozos = parseInt(vol.pozos || 0);
            appState.monthlyData.blastCost[m] += cost;
            totalBlastCost += cost;
            if (m === currentMonth && getYearSafe(vol.fecha) === currentYear) {
                blastTnMes += tn; blastCostMes += cost; blastKgMes += kg; 
                blastPozosMes += pozos; blastCountMes++;
            }
        }
    });

    // Process Maintenance Data
    (appState.data.mantenimiento || []).forEach(m_item => {
        const m = getMonthSafe(m_item.fecha);
        if (m >= 0 && m < 12) {
            if (m_item.tipo === 'Preventivo') appState.monthlyData.maintPrev[m]++;
            else appState.monthlyData.maintCorr[m]++;
        }
    });

    const prodMes = appState.monthlyData.produccion[currentMonth] || 0;
    const despMes = appState.monthlyData.despacho[currentMonth] || 0;
    const fuelMes = appState.monthlyData.diesel[currentMonth] || 0;
    const costMes = (appState.monthlyData.otrosCostos[currentMonth] || 0) + 
                    (appState.monthlyData.blastCost[currentMonth] || 0) + 
                    (appState.monthlyData.almacen[currentMonth] || 0);

    // Numeric animations helper
    const animarNumero = (id, target, isDecimal) => {
        const el = document.getElementById(id); if (!el) return;
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const prog = Math.min((ts - start) / 1200, 1);
            const val = prog * target;
            el.innerText = isDecimal ? val.toFixed(2) : Math.floor(val).toLocaleString('es-AR');
            if (prog < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    // Update Main KPIs — HTML IDs
    animarNumero('kpi-mensual-produccion', prodMes, false);
    animarNumero('kpi-mensual-despacho', despMes, false);
    // RATIO COMBUSTIBLE — usa litros reales (no pesos)
    const litrosMes = (appState._litrosPorMes || [])[currentMonth] || 0;
    const ratioLTn  = (litrosMes > 0 && prodMes > 0) ? litrosMes / prodMes : 0;
    const ratioEl   = document.getElementById('kpi-ratio-combustible');
    if (ratioEl) ratioEl.textContent = litrosMes > 0 && prodMes > 0 ? ratioLTn.toFixed(2) : '—';

    // COSTO OPERATIVO — usa total del Excel importado en pesos ($/Tn)
    const consumoMesObj = (appState.data.consumos || []).find(c => {
        return c.fecha === currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    });
    const costoTotalPesos = consumoMesObj
        ? (consumoMesObj.total || (consumoMesObj.items || []).reduce((s,i)=>s+i.valor,0))
        : (appState.monthlyData.otrosCostos[currentMonth] || 0);
    const costoPorTn = (costoTotalPesos > 0 && prodMes > 0) ? costoTotalPesos / prodMes : 0;
    const costoTnEl = document.getElementById('kpi-costo-tn');
    if (costoTnEl) {
        if (costoPorTn > 0) {
            const formatted = costoPorTn >= 1000
                ? '$ ' + (costoPorTn/1000).toFixed(1) + ' K'
                : '$ ' + costoPorTn.toLocaleString('es-AR', {maximumFractionDigits:0});
            costoTnEl.textContent = formatted;
        } else {
            costoTnEl.textContent = '—';
        }
    }

    // BALANCE STOCK ACUMULADO — suma histórica de todo el año hasta mes actual
    let prodAcum = 0, despAcum = 0;
    for (let mi = 0; mi <= currentMonth; mi++) {
        prodAcum += appState.monthlyData.produccion[mi] || 0;
        despAcum += appState.monthlyData.despacho[mi] || 0;
    }
    const stockAcum = prodAcum - despAcum;
    animarNumero('kpi-mensual-balance', stockAcum, false);
    animarNumero('kpi-blast-tn-total', blastTnMes, false);
    animarNumero('kpi-blast-cost-avg', blastTnMes > 0 ? (blastCostMes / blastTnMes) : 0, true);
    animarNumero('kpi-blast-count', blastCountMes, false);
    animarNumero('kpi-blast-kg', blastKgMes, false);

    const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };

    // KPIs resumen
    setTxt('kpi-avg-dia', prodMes > 0 ? (prodMes / Math.max(1, new Date().getDate())).toFixed(0) : '0');
    const barProd = document.getElementById('kpi-prod-bar');
    if (barProd) barProd.style.width = Math.min(100, (prodMes / 15000) * 100).toFixed(0) + '%';
    const proyMes = (prodMes / Math.max(1, new Date().getDate())) * new Date(currentYear, currentMonth + 1, 0).getDate();
    setTxt('kpi-proy-mes', Math.round(proyMes).toLocaleString('es-AR'));
    setTxt('kpi-proy-despacho', Math.round((despMes / Math.max(1, new Date().getDate())) * new Date(currentYear, currentMonth + 1, 0).getDate()).toLocaleString('es-AR'));
    // Combustible subtext
    const litrosMesLabel = (appState._litrosPorMes||[])[currentMonth] || 0;
    if (litrosMesLabel > 0) {
        setTxt('kpi-comb-litros', litrosMesLabel.toLocaleString('es-AR') + ' Ltr cargados');
        const rc2 = prodMes > 0 ? litrosMesLabel / prodMes : 0;
        setTxt('kpi-comb-estado', rc2 <= 1.5 ? '✓ Eficiente' : rc2 <= 3 ? '⚡ Normal' : '⚠ Alto consumo');
    } else {
        setTxt('kpi-comb-litros', 'Cargá los litros en el gráfico ↓');
        setTxt('kpi-comb-estado', '');
    }
    // Costo operativo subtext
    if (costoTotalPesos > 0) {
        const fmtM = v => v >= 1e9 ? '$'+( v/1e9).toFixed(2)+'B' : v >= 1e6 ? '$'+(v/1e6).toFixed(0)+'M' : '$'+v.toLocaleString('es-AR',{maximumFractionDigits:0});
        setTxt('kpi-gasto-total', 'Total: ' + fmtM(costoTotalPesos));
        setTxt('kpi-costo-estado', '');
    } else {
        setTxt('kpi-gasto-total', 'Importá el Excel de costos');
        setTxt('kpi-costo-estado', '');
    }
    // Balance acumulado subtext
    const balanceEl = document.getElementById('kpi-balance-estado');
    if (balanceEl) {
        const diffMes = prodMes - despMes;
        balanceEl.textContent = diffMes >= 0 ? '+' + diffMes.toLocaleString('es-AR') + ' Tn este mes' : diffMes.toLocaleString('es-AR') + ' Tn este mes';
    }
    const acumEl = document.getElementById('kpi-balance-acum');
    if (acumEl) {
        acumEl.textContent = 'Acumulado ' + currentYear + ': ' + stockAcum.toLocaleString('es-AR') + ' Tn';
    }

    setTxt('kpi-blast-cost-total', '$ ' + blastCostMes.toLocaleString('es-AR'));
    setTxt('kpi-fuel-monthly', appState.monthlyData.diesel[currentMonth].toLocaleString('es-AR'));
    setTxt('kpi-lub-monthly', appState.monthlyData.lub[currentMonth].toLocaleString('es-AR'));
    setTxt('kpi-elec-monthly', appState.monthlyData.electric[currentMonth].toLocaleString('es-AR'));
    setTxt('kpi-almacen-monthly', '$ ' + appState.monthlyData.almacen[currentMonth].toLocaleString('es-AR'));
    setTxt('kpi-blast-monthly', '$ ' + appState.monthlyData.blastCost[currentMonth].toLocaleString('es-AR'));

    // Manual Tn integration
    const mesesES2 = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const _regTn = (appState.data.tnManual || []).find(r => r.mes === mesesES2[currentMonth] && r.anio === String(currentYear));
    if (_regTn) {
        tnMensualPrimaria += (_regTn.primaria || 0);
        tnMensualPlanta1 += (_regTn.planta1 || 0);
        tnMensualPlanta2 += (_regTn.planta2 || 0);
    }
    // Update Tn inputs with current values
    const tnActP = document.getElementById('tn-actual-primaria');
    const tnActP2 = document.getElementById('tn-actual-planta2');
    const tnMesLabel = document.getElementById('tn-manual-mes-label');
    if (tnActP) tnActP.textContent = tnMensualPrimaria.toLocaleString('es-AR');
    if (tnActP2) tnActP2.textContent = tnMensualPlanta2.toLocaleString('es-AR');
    if (tnMesLabel) tnMesLabel.textContent = mesesES2[currentMonth] + ' ' + currentYear;
    setTxt('kpi-mensual-primaria', tnMensualPrimaria.toLocaleString('es-AR'));
    setTxt('kpi-mensual-planta1', tnMensualPlanta1.toLocaleString('es-AR'));
    setTxt('kpi-mensual-planta2', tnMensualPlanta2.toLocaleString('es-AR'));
    setTxt('kpi-mensual-planta1-tn', tnMensualPlanta1.toLocaleString('es-AR'));
    setTxt('kpi-mensual-planta2-tn', tnMensualPlanta2.toLocaleString('es-AR'));
    if (typeof renderTnHistorial === 'function') renderTnHistorial();

    // Projections
    const fechaHoy = new Date();
    const diasEnMes = new Date(currentYear, currentMonth + 1, 0).getDate();
    const diasPasados = (currentMonth === fechaHoy.getMonth() && currentYear === fechaHoy.getFullYear()) ? fechaHoy.getDate() : diasEnMes;
    const promProd = prodMes / diasPasados;
    const proyDesp = (despMes / diasPasados) * diasEnMes;

    setHTML('smart-prod-proj', `Promedio: <b>${promProd.toLocaleString('es-AR', { maximumFractionDigits: 1 })} Tn/día</b>`);
    setHTML('smart-desp-proj', `Proyección fin de mes: <b>${proyDesp.toLocaleString('es-AR', { maximumFractionDigits: 0 })} Tn</b>`);

    const diffStock = prodMes - despMes;
    setHTML('smart-stock-info', diffStock >= 0
        ? `<span style="color:var(--success)">+${diffStock.toLocaleString('es-AR')} Tn</span> ganadas al stock`
        : `<span style="color:var(--danger)">${diffStock.toLocaleString('es-AR')} Tn</span> consumidas de playa`);

    const ratioVal = prodMes > 0 ? (fuelMes / prodMes) : 0;
    setHTML('smart-ratio-info', `Estado: <b>${ratioVal <= 1.0 ? '<span style="color:var(--success)">Óptimo</span>' : '<span style="color:var(--danger)">Alto</span>'}</b> (Target &lt; 1.0)`);
    setHTML('smart-cost-info', `Gasto Total: <b>USD ${costMes.toLocaleString('es-AR')}</b>`);

    const factorCargaGr = blastTnMes > 0 ? ((blastKgMes / blastTnMes) * 1000).toFixed(0) : 0;
    const kgPorPozo = blastPozosMes > 0 ? (blastKgMes / blastPozosMes).toFixed(0) : 0;
    setHTML('smart-blast-kg-factor', `Ratio: <b style="color:var(--accent);">${factorCargaGr} g/Tn</b> | <b style="color:var(--accent);">${kgPorPozo} Kg/pozo</b>`);
    setHTML('smart-cost-blast', `Gasto Total Mes: <b>USD ${blastCostMes.toLocaleString('es-AR')}</b>`);

    // Trends
    const calculateTrend = (id, cur, prev, invert = false) => {
        const el = document.getElementById(id); if (!el) return;
        if (!prev || prev === 0) { el.innerText = 'N/A'; el.className = 'trend-badge trend-neutral'; return; }
        const diff = ((cur - prev) / prev) * 100;
        const isGood = invert ? (diff <= 0) : (diff >= 0);
        el.innerText = `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1)}% vs mes ant.`;
        el.className = `trend-badge ${diff === 0 ? 'trend-neutral' : (isGood ? 'trend-up' : 'trend-down')}`;
    };
    calculateTrend('trend-prod', appState.monthlyData.produccion[currentMonth], appState.monthlyData.produccion[prevMonth]);
    calculateTrend('trend-desp', appState.monthlyData.despacho[currentMonth], appState.monthlyData.despacho[prevMonth]);
    
    const curRatio = prodMes > 0 ? (fuelMes / prodMes) : 0, 
          prevRatio = appState.monthlyData.produccion[prevMonth] > 0 ? (appState.monthlyData.diesel[prevMonth] / appState.monthlyData.produccion[prevMonth]) : 0;
    if (fuelMes === 0) { 
        const bF = document.getElementById('trend-fuel'); 
        if (bF) { bF.innerText = 'Sin datos'; bF.className = 'trend-badge trend-neutral'; } 
    } else calculateTrend('trend-fuel', curRatio, prevRatio, true);

    const curCostTn = prodMes > 0 ? (costMes / prodMes) : 0, 
          prevCostMes = (appState.monthlyData.otrosCostos[prevMonth] || 0) + (appState.monthlyData.blastCost[prevMonth] || 0) + (appState.monthlyData.almacen[prevMonth] || 0), 
          prevProd = appState.monthlyData.produccion[prevMonth] || 0, 
          prevCostTn = prevProd > 0 ? (prevCostMes / prevProd) : 0;
    if (costMes === 0) { 
        const bC = document.getElementById('trend-cost'); 
        if (bC) { bC.innerText = 'Falta cargar USD'; bC.className = 'trend-badge trend-neutral'; } 
    } else calculateTrend('trend-cost', curCostTn, prevCostTn, true);

    // Smart subtexts costs — siempre en $ (los valores del Excel son pesos)
    const fmtDiff = (val) => {
        const abs = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        if (abs >= 1e6) return sign + '$ ' + (abs/1e6).toFixed(1) + ' M';
        if (abs >= 1e3) return sign + '$ ' + (abs/1e3).toFixed(0) + ' K';
        return sign + '$ ' + abs.toLocaleString('es-AR', {maximumFractionDigits:0});
    };
    const updateSmartCost = (id, mesVal, prevVal) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (mesVal === 0) { el.innerHTML = '<span style="color:var(--text-dim)">Sin datos</span>'; return; }
        const diff = mesVal - (prevVal || 0);
        const color = diff <= 0 ? 'var(--success)' : 'var(--danger)';
        el.innerHTML = 'vs ant: <b style="color:' + color + '">' + fmtDiff(diff) + '</b>';
    };
    updateSmartCost('smart-cost-fuel',    fuelMes,                              appState.monthlyData.diesel[prevMonth]);
    updateSmartCost('smart-cost-lub',     appState.monthlyData.lub[currentMonth],     appState.monthlyData.lub[prevMonth]);
    updateSmartCost('smart-cost-elec',    appState.monthlyData.electric[currentMonth],appState.monthlyData.electric[prevMonth]);
    updateSmartCost('smart-cost-almacen', appState.monthlyData.almacen[currentMonth], appState.monthlyData.almacen[prevMonth]);

    // Blast list
    const blastListContainer = document.getElementById('blast-list');
    if (blastListContainer) {
        const ultimas = [...appState.data.voladuras].reverse().slice(0, 5);
        blastListContainer.innerHTML = ultimas.length === 0
            ? '<div class="empty-state"><i class="ph-fill ph-fire"></i><p>Sin voladuras registradas.<br>Completá el formulario <b>Registrar Evento</b> para agregar.</p></div>'
            : ultimas.map(v => `
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.05);padding:8px 0;align-items:center;">
                <span style="color:var(--text-main);">${v.fecha} — <b>${v.frente}</b></span>
                <div style="display:flex;gap:1.5rem;font-size:0.85rem;">
                    <span>${parseFloat(v.tn || 0).toLocaleString('es-AR')} Tn</span>
                    <span title="VPP">V: <span style="color:${(v.vpp || 0) > 5 ? 'var(--danger)' : 'var(--text-dim)'}">${v.vpp || '-'}</span></span>
                    <span title="P80">P80: <span style="color:var(--text-dim)">${v.p80 || '-'}</span></span>
                    <span style="color:var(--danger);">USD ${parseFloat(v.cost || 0).toLocaleString('es-AR')}</span>
                </div>
            </div>`).join('');
    }

    // Call all update functions (ensure they exist globally)
    if (typeof updateCharts === 'function') updateCharts(totalFuel, totalLub, totalElectric, totalBlastCost, totalOtros, totalAlmacen);
    if (typeof updateGauges === 'function') updateGauges();
    if (typeof updateWorkerRanking === 'function') updateWorkerRanking();
    if (typeof updateMapPins === 'function') updateMapPins();
    if (typeof renderMapZones === 'function') renderMapZones();
    if (typeof renderConfigPanel === 'function') renderConfigPanel();
    if (typeof aplicarModulosActivos === 'function') aplicarModulosActivos();
    if (typeof renderFallasRecurrentes === 'function') renderFallasRecurrentes();
    if (typeof renderExpedientesFlota === 'function') renderExpedientesFlota();
    if (typeof renderGraficoCombustibleManual === 'function') renderGraficoCombustibleManual();
    if (typeof updateFlotaTable === 'function') updateFlotaTable();
    if (typeof actualizarSelectCamionetas === 'function') actualizarSelectCamionetas();
    if (typeof updateFlotaPesadaTable === 'function') updateFlotaPesadaTable();
    if (typeof actualizarSelectPesada === 'function') actualizarSelectPesada();
    if (typeof renderExpedienteTablaPesada === 'function') renderExpedienteTablaPesada();
    if (typeof actualizarExpedientePesado === 'function') actualizarExpedientePesado();
    if (typeof updateBlastCharts === 'function') updateBlastCharts();
    if (typeof updateCostsCharts === 'function') updateCostsCharts();
    if (typeof renderConsumosKPIs === 'function') renderConsumosKPIs();
    if (typeof renderConsumosGuardados === 'function') renderConsumosGuardados();
    if (typeof updateFlotaLivianaCharts === 'function' && document.getElementById('chart-gastos-movil')) updateFlotaLivianaCharts();
    if (typeof updateFlotaPesadaCharts === 'function' && document.getElementById('chart-gastos-pesada')) updateFlotaPesadaCharts();
    if (typeof updateMaintChart === 'function') updateMaintChart();
    if (typeof updateStopCharts === 'function') updateStopCharts();
    if (typeof updateSmartSummaries === 'function') updateSmartSummaries();
    if (typeof actualizarExpedienteMantenimiento === 'function') actualizarExpedienteMantenimiento();
    if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
    if (typeof updateHorasMaquinasChart === 'function') updateHorasMaquinasChart();
    if (typeof renderResumenHorasMaquinas === 'function') renderResumenHorasMaquinas();
    
    // ANALIZADOR PREDICTIVO DE DESGASTE
    if (typeof analizarAlertasDesgaste === 'function') {
        const alertas = analizarAlertasDesgaste();
        if (typeof renderAlertasDesgaste === 'function') renderAlertasDesgaste(alertas);
    }
};

window.analizarAlertasDesgaste = function() {
    const alertas = [];
    const historial = appState.data.historialCambios || [];
    const blasting = appState.data.blasting || [];
    const produccion = appState.data.produccion || [];

    if (historial.length === 0) return alertas;

    // Agrupar historial por máquina+pieza
    const porPin = {};
    historial.forEach(c => {
        const key = `${c.maquina}-${c.pieza}`;
        if (!porPin[key]) porPin[key] = [];
        porPin[key].push(c);
    });

    Object.keys(porPin).forEach(key => {
        const cambios = porPin[key].filter(c => c.hrsReales > 0);
        if (cambios.length < 2) return;

        const maquinaId = key.split('-')[0];
        const piezaId = key.split('-').slice(1).join('-');
        const mach = WEAR_MACHINES[maquinaId];
        const nombreMaq = mach ? mach.nombre : maquinaId;

        const promedioHistorico = cambios.reduce((s, c) => s + c.hrsReales, 0) / cambios.length;
        const ultimos = cambios.slice(-2);
        const promedioReciente = ultimos.reduce((s, c) => s + c.hrsReales, 0) / ultimos.length;
        const diferenciaPct = ((promedioReciente - promedioHistorico) / promedioHistorico) * 100;

        // Alerta: Desgaste Acelerado
        if (diferenciaPct < -15) {
            let hrsAcumActual = 0;
            const fechaUltimoCambio = cambios[cambios.length - 1].fecha || '2000-01-01';
            
            produccion.forEach(p => {
                if (p.fecha >= fechaUltimoCambio) {
                    if (p.maquinas && p.maquinas[maquinaId] !== undefined) hrsAcumActual += parseFloat(p.maquinas[maquinaId]) || 0;
                    else if (mach && p.sector === mach.planta) hrsAcumActual += parseFloat(p.hrs || 0);
                }
            });

            const hsRestantes = Math.max(0, promedioReciente - hrsAcumActual);
            const diasRestantes = Math.round(hsRestantes / 16); 

            alertas.push({
                tipo: 'desgaste-acelerado',
                nivel: Math.abs(diferenciaPct) > 30 ? 'critico' : 'advertencia',
                maquina: nombreMaq,
                mensaje: `${nombreMaq}: Desgaste acelerado detectado (${Math.abs(diferenciaPct).toFixed(0)}% menos vida)`,
                detalle: `Histórico: ${Math.round(promedioHistorico)}hs | Reciente: ${Math.round(promedioReciente)}hs`,
                proyeccion: `Cambio estimado en ~${Math.round(hsRestantes)} hs (${diasRestantes} días)`,
                accion: 'Revisar material de alimentación (dureza/abrasividad) y frecuencia de lubricación.'
            });
        }
    });

    appState.data.alertasDesgaste = alertas;
    return alertas;
};

window.renderDbManager = function() {
    const selector = document.getElementById('db-selector');
    const tbody = document.getElementById('db-table-body');
    if (!selector || !tbody) return;
    const tableKey = selector.value;
    const dataArray = appState.data[tableKey] || [];
    const rows = dataArray.map((item, index) => {
        let detalle = 'Registro', impacto = '-';
        if (tableKey === 'produccion') { detalle = `${item.sector} (${item.turno}) — Op: ${item.operario}`; impacto = `<b>${item.tn} Tn</b> en ${item.hrs} Hs`; }
        else if (tableKey === 'voladuras') { detalle = `Frente: ${item.frente}`; impacto = `<b>${item.tn} Tn</b> / USD ${item.cost}`; }
        else if (tableKey === 'consumos') { detalle = 'Cierre de Insumos'; impacto = `<b>${item.diesel} Ltr Diesel</b>`; }
        else if (tableKey === 'despacho') { detalle = 'Salida por Balanza'; impacto = `<b>${item.tn} Tn</b>`; }
        else if (tableKey === 'mantenimientoExterno') { detalle = `${item.unidad} en ${item.taller}`; impacto = `<b>USD ${item.costo}</b>`; }
        else if (tableKey === 'mantenimientoPesado') { detalle = `${item.unidad} — ${item.tarea}`; impacto = `<b>USD ${item.costo}</b>`; }
        return { index, html: `<tr><td style="font-size:0.8rem;color:var(--text-dim);">${item.fecha || '-'}</td><td style="font-size:0.85rem;font-weight:600;">${detalle}</td><td style="font-size:0.85rem;color:var(--warning);">${impacto}</td><td style="text-align:right;"><button type="button" onclick="eliminarRegistroDB('${tableKey}',${index})" style="background:transparent;color:var(--danger);padding:5px;box-shadow:none;" title="Eliminar"><i class="ph-bold ph-trash"></i></button></td></tr>` };
    });
    tbody.innerHTML = rows.reverse().map(r => r.html).join('');
    if (dataArray.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:15px;">Sin registros</td></tr>';
};

window.eliminarRegistroDB = function(tableKey, index) {
    if (confirm('¿Eliminar este registro? Todos los gráficos se recalcularán.')) {
        appState.data[tableKey].splice(index, 1);
        syncAndRefreshData();
    }
};

window.sincronizarOneDrive = async function() {
    const statusEl = document.getElementById('nav-fecha-hoy');
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0k_x9fkTKDF9f08C7oq-6wgH2S0u3JLVdQsn2DMe-Yh3p_X35ihBdgg9NbyCSuoS9jGOxJKQrNKAC/pub?gid=878326454&single=true&output=csv';
    if (statusEl) statusEl.textContent = 'Descargando...';
    try {
        let csvText = '';
        try {
            const proxy1 = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl + '&t=' + Date.now())}`;
            const res1 = await fetch(proxy1); if (!res1.ok) throw new Error('Proxy1 fail');
            const json = await res1.json(); csvText = json.contents;
        } catch (e) {
            const proxy2 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(csvUrl + '&t=' + Date.now())}`;
            const res2 = await fetch(proxy2); if (!res2.ok) throw new Error('Proxy2 fail');
            csvText = await res2.text();
        }
        if (!csvText || csvText.length < 10) throw new Error('CSV vacío');
        const workbook = XLSX.read(csvText, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (filas.length < 2) throw new Error('Sin filas');
        let idxF = -1, idxE = -1, idxT = -1, filaInicio = -1;
        for (let i = 0; i < Math.min(10, filas.length); i++) {
            if (!filas[i]) continue;
            const fStr = filas[i].map(c => String(c || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
            if (fStr.includes('FECHA')) { idxF = fStr.indexOf('FECHA'); idxE = fStr.findIndex(c => c.includes('UBICACION') || c.includes('EQUIPO')); idxT = fStr.findIndex(c => c.includes('DESCRIPCION') || c.includes('TAREA')); filaInicio = i + 1; break; }
        }
        if (idxF === -1 || idxE === -1) throw new Error('Columnas no encontradas');
        appState.data.mantenimiento = [];
        let procesadas = 0;
        for (let i = filaInicio; i < filas.length; i++) {
            const f = filas[i]; if (!f || !f[idxF]) continue;
            let fRaw = f[idxF], fFinal = '';
            if (String(fRaw).includes('/')) { const p = String(fRaw).trim().split('/'); if (p.length === 3) fFinal = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`; }
            else if (String(fRaw).includes('-')) fFinal = String(fRaw).split(' ')[0];
            if (fFinal.match(/^\d{4}-/)) { appState.data.mantenimiento.push({ fecha: fFinal, equipo: String(f[idxE] || '').trim(), tarea: idxT !== -1 ? String(f[idxT] || 'Mantenimiento').trim() : 'Mantenimiento', tipo: 'Correctivo', cost: 0, hrs: 0 }); procesadas++; }
        }
        syncAndRefreshData();
        if (typeof renderFallasRecurrentes === 'function') renderFallasRecurrentes();
        if (statusEl) statusEl.textContent = `✓ ${procesadas} Órdenes`;
    } catch (error) {
        console.error('OneDrive sync:', error);
        if (statusEl) statusEl.textContent = 'Sin conexión';
        const fechaHoyEl = document.getElementById('nav-fecha-hoy');
        if (fechaHoyEl && (fechaHoyEl.textContent === 'Sincronizar' || fechaHoyEl.textContent === 'Descargando...')) {
            const hoy = new Date();
            const opts = { day: '2-digit', month: 'short', year: 'numeric' };
            fechaHoyEl.textContent = hoy.toLocaleDateString('es-AR', opts);
        }
    }
};
// Mantenimiento Pesado y Liviano Excel
window.procesarExcelProduccion = function(inputEl) {
    const file = (inputEl instanceof File) ? inputEl
               : (inputEl?.files?.[0]) ?? document.getElementById('file-produccion')?.files[0];
    if(!file) return;

    const statusEl = document.getElementById('prod-import-status');
    if (statusEl) { statusEl.style.display = 'flex'; statusEl.style.background = 'rgba(59,130,246,0.15)'; statusEl.style.border = '1px solid var(--accent)'; statusEl.textContent = '⏳ Procesando Excel...'; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type:'array'});
            
            // Try to find sheet for current month
            const mesesES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            const mesActual = mesesES[currentMonth];
            let sheetName = wb.SheetNames.find(s => s.toUpperCase().includes(mesActual)) || wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, {header:1});

            if (json.length < 2) {
                if (statusEl) { statusEl.style.background = 'rgba(239,68,68,0.15)'; statusEl.style.border = '1px solid var(--danger)'; statusEl.textContent = '❌ El archivo no tiene datos válidos'; }
                return;
            }

            const headers = json[0].map(h => String(h || '').trim().toUpperCase());
            let newRecords = [];

            for (let i = 1; i < json.length; i++) {
                const row = json[i];
                if (!row || row.length === 0) continue;

                const getCol = (names) => {
                    for (const n of names) {
                        const idx = headers.findIndex(h => h.includes(n));
                        if (idx >= 0 && row[idx] !== undefined && row[idx] !== '') return row[idx];
                    }
                    return null;
                };

                const fechaRaw = getCol(['FECHA','DATE']);
                let fecha = '';
                if (fechaRaw) {
                    if (typeof fechaRaw === 'number') {
                        // Excel serial date
                        const d = new Date(Math.round((fechaRaw - 25569) * 86400 * 1000));
                        fecha = d.toISOString().split('T')[0];
                    } else {
                        fecha = String(fechaRaw).trim();
                        // Normalize DD/MM/YY or DD/MM/YYYY
                        if (fecha.includes('/')) {
                            const p = fecha.split('/');
                            if (p.length === 3) fecha = (p[2].length === 2 ? '20'+p[2] : p[2]) + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0');
                        }
                    }
                }
                if (!fecha || !fecha.match(/^\d{4}-/)) continue;
                const mes = parseInt(fecha.split('-')[1]) - 1;
                if (mes !== currentMonth) continue;

                const turno = String(getCol(['TURNO','SHIFT']) || 'Dia').trim();
                const tnTotal = parseFloat(getCol(['TN','TON','TONELADAS','PRODUCCION']) || 0);
                const hs = parseFloat(getCol(['HS','HORAS','TRABAJO']) || 0);
                const obs = String(getCol(['OBS','OBSERVACION','NOTA']) || '').trim();

                if (tnTotal <= 0 && hs <= 0) continue;

                newRecords.push({
                    fecha, sector: 'Planta Primaria', turno, operario: '',
                    tn: tnTotal, hrs: hs, hrsPerdidas: Math.max(0, 9 - hs),
                    estado: 'Normal', obs, fromExcel: true
                });
            }

            if (newRecords.length > 0) {
                // Remove existing excel records for this month to avoid duplicates
                appState.data.produccion = appState.data.produccion.filter(r => {
                    if (!r.fromExcel) return true;
                    const m = getMonthSafe(r.fecha);
                    const y = getYearSafe(r.fecha);
                    return !(m === currentMonth && y === currentYear);
                });
                appState.data.produccion.push(...newRecords);
                syncAndRefreshData();
                if (statusEl) {
                    statusEl.style.background = 'rgba(34,197,94,0.15)';
                    statusEl.style.border = '1px solid var(--success)';
                    statusEl.textContent = '✅ ' + newRecords.length + ' registros importados de "' + sheetName + '"';
                }
                if (typeof renderTurnosPanel === 'function') renderTurnosPanel(newRecords);
            } else {
                if (statusEl) {
                    statusEl.style.background = 'rgba(245,158,11,0.15)';
                    statusEl.style.border = '1px solid var(--warning)';
                    statusEl.textContent = '⚠️ No se encontraron registros para ' + mesesES[currentMonth] + ' ' + currentYear + ' en la hoja "' + sheetName + '"';
                }
            }
        } catch(err) {
            console.error('Error procesando Excel produccion:', err);
            if (statusEl) { statusEl.style.background = 'rgba(239,68,68,0.15)'; statusEl.style.border = '1px solid var(--danger)'; statusEl.textContent = '❌ Error: ' + err.message; }
        }
    };
    reader.readAsArrayBuffer(file);
};

// Alias para el filtro global
window.updateDashboardFromFilter = function() {
    const filter = document.getElementById('global-month-filter');
    if (!filter || !filter.value) return;
    const [y, m] = filter.value.split('-');
    currentYear = parseInt(y);
    currentMonth = parseInt(m) - 1;
    prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    localStorage.setItem('guerrico-mes-activo', filter.value);
    syncAndRefreshData();
};

window.limpiarImportProduccion = function() {
    const fileEl = document.getElementById('file-produccion');
    if (fileEl) fileEl.value = '';
    const statusEl = document.getElementById('prod-import-status');
    if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
    const panel = document.getElementById('prod-turnos-panel');
    if (panel) panel.style.display = 'none';
};

window.renderTurnosPanel = function(records) {
    const panel = document.getElementById('prod-turnos-panel');
    const tbody = document.getElementById('prod-turnos-tbody');
    const count = document.getElementById('prod-turnos-count');
    if (!panel || !tbody) return;

    const data = records || appState.data.produccion.filter(r => {
        return r.fromExcel && getMonthSafe(r.fecha) === currentMonth && getYearSafe(r.fecha) === currentYear;
    });

    if (data.length === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    if (count) count.textContent = data.length + ' registros';

    const operarios = (appState.data.config.operarios || []);
    const opts = operarios.map(op => '<option value="' + op + '">' + op + '</option>').join('');

    tbody.innerHTML = data.map((r, i) => {
        return '<tr>' +
            '<td>' + r.fecha + '</td>' +
            '<td>' + r.turno + '</td>' +
            '<td>' + r.tn.toLocaleString('es-AR') + ' Tn</td>' +
            '<td>' + r.hrs + ' hs</td>' +
            '<td style="color:var(--danger);">' + (r.hrsPerdidas || 0).toFixed(1) + ' hs</td>' +
            '<td>' + r.sector + '</td>' +
            '<td>' + (r.obs || '—') + '</td>' +
            '<td><select class="op-selector" data-idx="' + i + '" style="width:100%;padding:3px 5px;border-radius:5px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-main);font-size:0.78rem;"><option value="">Sin asignar</option>' + opts + '</select></td>' +
        '</tr>';
    }).join('');
};

window.guardarOperariosAsignados = function() {
    const selectores = document.querySelectorAll('.op-selector');
    selectores.forEach(sel => {
        const idx = parseInt(sel.dataset.idx);
        const excelRecs = appState.data.produccion.filter(r => r.fromExcel && getMonthSafe(r.fecha) === currentMonth && getYearSafe(r.fecha) === currentYear);
        if (excelRecs[idx] && sel.value) excelRecs[idx].operario = sel.value;
    });
    dataSync.save();
    syncAndRefreshData();
    alert('Operarios asignados guardados.');
};

window.actualizarBadgeTurno = function() {
    const dateEl = document.getElementById('adv-date');
    const badge = document.getElementById('turno-semana-badge');
    if (!dateEl || !badge || !dateEl.value) return;
    const d = new Date(dateEl.value + 'T12:00:00');
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    badge.textContent = dias[d.getDay()] + ' ' + d.toLocaleDateString('es-AR', {day:'2-digit', month:'short'});
};

window.exportarDatos = function() {
    const backup = {
        data: appState.data,
        metadata: {
            version: '4.2',
            timestamp: new Date().toISOString(),
            usuario: 'Cantera Guerrico'
        }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_guerrico_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

window.importarDatos = function(input) {
    if(!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const wrap = JSON.parse(e.target.result);
            const data = wrap.data || wrap;
            if(confirm("¿Restaurar backup? Los datos actuales serán reemplazados.")) {
                appState.data = data;
                dataSync.save();
                location.reload();
            }
        } catch(err) {
            alert("Error al importar: " + err.message);
        }
    };
    reader.readAsText(input.files[0]);
};

window.borrarDatosMesActual = function() {
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    if(!confirm(`¿BORRAR TODOS los registros de ${meses[currentMonth]} ${currentYear}?`)) return;
    
    appState.data.produccion = appState.data.produccion.filter(r => {
        return !(getMonthSafe(r.fecha) === currentMonth && getYearSafe(r.fecha) === currentYear);
    });
    
    dataSync.save();
    syncAndRefreshData();
    alert("Cierre de mes realizado.");
};

// Global dataSync helper for simplicity
window.dataSync = {
    save: function() {
        localStorage.setItem('guerrico-db', JSON.stringify(appState.data));
    }
};
