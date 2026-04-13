/**
 * charts.js
 * Inicialización y actualización de todos los gráficos Chart.js
 */

window.initCharts = function() {
    // Destroy any stale chart instances on init
    [
        'chart-balance', 'chart-eficiencia-combustible',
        'chart-blast-mensual', 'chart-blast-eficiencia', 'chart-blast-mensual-vol-prod',
        'chart-gastos-pesada', 'chart-horas-maquinas', 'chart-motivos-parada',
        'chart-cruce-barras', 'chart-cruce-costo'
    ].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { var ch = Chart.getChart(el); if (ch) { try { ch.destroy(); } catch(e) {} } }
    });

    Chart.defaults.color = 'rgba(200,210,200,0.7)';
    Chart.defaults.borderColor = 'rgba(128,128,128,0.12)';
    Chart.defaults.font.family = "'Inter Tight', sans-serif";

    updateBalanceChart();
    updateEficienciaChart();
    updateBlastCharts();
    updateStopCharts();
    updateHorasMaquinasChart();
    updateCostsCharts();
    updateMaintChart();
};

// ── BALANCE OPERATIVO ──────────────────────────────────────────────
window.updateBalanceChart = function() {
    var ctx = document.getElementById('chart-balance');
    if (!ctx) return;
    var existing = Chart.getChart(ctx); if (existing) { try { existing.destroy(); } catch(e) {} }
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Producción (Tn)', data: appState.monthlyData.produccion, backgroundColor: 'rgba(74,222,128,0.5)', borderColor: '#4ade80', borderWidth: 1, borderRadius: 3, yAxisID: 'y' },
                { label: 'Despacho (Tn)',   data: appState.monthlyData.despacho,   backgroundColor: 'rgba(96,165,250,0.5)', borderColor: '#60a5fa', borderWidth: 1, borderRadius: 3, yAxisID: 'y' },
                { label: 'Costo Total (USD)', data: appState.monthlyData.produccion.map(function(_,i) {
                    return (appState.monthlyData.otrosCostos[i]||0) + (appState.monthlyData.blastCost[i]||0) + (appState.monthlyData.almacen[i]||0);
                }), type: 'line', borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', borderWidth: 2, tension: 0.4, pointRadius: 3, yAxisID: 'y2' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: {
                y:  { position: 'left',  grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 } } },
                y2: { position: 'right', grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
};

// ── EFICIENCIA COMBUSTIBLE ─────────────────────────────────────────
window.updateEficienciaChart = function() {
    var ctx = document.getElementById('chart-eficiencia-combustible');
    if (!ctx) return;
    var existing = Chart.getChart(ctx); if (existing) { try { existing.destroy(); } catch(e) {} }
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Use actual liters from litrosCombustible field (not diesel $ cost)
    var litrosPorMes = new Array(12).fill(0);
    (appState.data.litrosCombustible || []).forEach(function(item) {
        var m = getMonthSafe(item.fecha);
        var y = getYearSafe(item.fecha);
        if (m >= 0 && m < 12 && y === currentYear) {
            litrosPorMes[m] += parseFloat(item.litros || 0);
        }
    });

    var ratios = appState.monthlyData.produccion.map(function(prod, i) {
        var lts = litrosPorMes[i];
        return (prod > 0 && lts > 0) ? parseFloat((lts / prod).toFixed(2)) : null;
    });

    var hasData = ratios.some(function(v){ return v !== null; });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'L/Tn',
                data: ratios,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245,158,11,0.1)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#f59e0b',
                fill: true,
                spanGaps: false  // don't connect null points
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(ctx) {
                    return ctx.parsed.y !== null ? ctx.parsed.y.toFixed(2) + ' L/Tn' : 'Sin datos';
                }}}
            },
            scales: {
                y: {
                    grid: { color: 'rgba(128,128,128,0.08)' },
                    ticks: { font: { size: 10 }, callback: function(v) { return v + ' L/Tn'; } },
                    beginAtZero: true
                },
                x: { ticks: { font: { size: 10 } } }
            }
        }
    });

    // Show "no data" message if no liters loaded
    if (!hasData) {
        var parent = ctx.parentElement;
        var msg = parent.querySelector('.chart-no-data');
        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'chart-no-data';
            msg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--text-dim);font-size:0.82rem;text-align:center;pointer-events:none;';
            msg.innerHTML = '⛽ Desplegá el formulario de abajo<br>y cargá los litros del mes';
            parent.style.position = 'relative';
            parent.appendChild(msg);
        }
    } else {
        var existing2 = ctx.parentElement.querySelector('.chart-no-data');
        if (existing2) existing2.remove();
    }
};

// ── BLAST CHARTS ───────────────────────────────────────────────────
window.updateBlastCharts = function() {
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // 1. Gasto Mensual Voladuras (USD)
    var ctxBM = document.getElementById('chart-blast-mensual');
    if (ctxBM) {
        var ex = Chart.getChart(ctxBM); if (ex) { try { ex.destroy(); } catch(e) {} }
        new Chart(ctxBM, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [{
                    label: 'USD Voladuras',
                    data: appState.monthlyData.blastCost,
                    backgroundColor: 'rgba(239,68,68,0.45)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 }, callback: function(v) { return '$ ' + v.toLocaleString('es-AR'); } } },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }

    // 2. Costo Específico (USD/Tn) — calculado mes a mes
    var ctxBE = document.getElementById('chart-blast-eficiencia');
    if (ctxBE) {
        var ex2 = Chart.getChart(ctxBE); if (ex2) { try { ex2.destroy(); } catch(e) {} }
        var costEsp = appState.monthlyData.blastCost.map(function(costo, i) {
            var prod = appState.monthlyData.produccion[i] || 0;
            return prod > 0 ? parseFloat((costo / prod).toFixed(3)) : 0;
        });
        new Chart(ctxBE, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'USD/Tn',
                    data: costEsp,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251,191,36,0.10)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fbbf24',
                    fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 }, callback: function(v) { return '$ ' + v; } } },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }

    // 3. Tn Voladas vs Tn Producidas (mensual) — NUEVO
    var ctxVP = document.getElementById('chart-blast-mensual-vol-prod');
    if (ctxVP) {
        var ex3 = Chart.getChart(ctxVP); if (ex3) { try { ex3.destroy(); } catch(e) {} }

        // Agrupar voladuras por mes
        var tnVoladasMes = new Array(12).fill(0);
        (appState.data.voladuras || []).forEach(function(v) {
            var m = getMonthSafe(v.fecha);
            if (m >= 0 && m < 12 && getYearSafe(v.fecha) === currentYear) {
                tnVoladasMes[m] += parseFloat(v.tn || 0);
            }
        });

        new Chart(ctxVP, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: 'Tn Voladas',
                        data: tnVoladasMes,
                        backgroundColor: 'rgba(248,113,113,0.55)',
                        borderColor: '#f87171',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'Tn Producidas (Primaria)',
                        data: appState.monthlyData.produccion,
                        type: 'line',
                        borderColor: '#4ade80',
                        backgroundColor: 'rgba(74,222,128,0.08)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#4ade80',
                        fill: true,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            afterBody: function(items) {
                                var mes = items[0].dataIndex;
                                var vol  = tnVoladasMes[mes];
                                var prod = appState.monthlyData.produccion[mes] || 0;
                                if (vol > 0 && prod > 0) return ['Ratio prod/vol: ' + (prod/vol).toFixed(2) + 'x'];
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { font: { size: 10 } } },
                    x: { ticks: { font: { size: 10 } } }
                }
            }
        });
    }
};

// ── PARADAS ────────────────────────────────────────────────────────
window.updateStopCharts = function() {
    var ctx = document.getElementById('chart-motivos-parada');
    if (!ctx) return;
    var motivos = {};
    (appState.data.produccion || []).forEach(function(p) {
        if (p.status && p.status !== 'Normal') {
            var m = getMonthSafe(p.fecha), y = getYearSafe(p.fecha);
            if (m === currentMonth && y === currentYear) motivos[p.status] = (motivos[p.status] || 0) + (parseFloat(p.hrsPerdidas) || 0);
        }
    });
    var labels = Object.keys(motivos), data = Object.values(motivos);
    var existing = Chart.getChart(ctx); if (existing) { try { existing.destroy(); } catch(e) {} }
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Horas Perdidas', data, backgroundColor: '#ef4444', borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
};

// ── HORAS MÁQUINAS ─────────────────────────────────────────────────
window.updateHorasMaquinasChart = function() {
    var ctx = document.getElementById('chart-horas-maquinas');
    if (!ctx) return;
    var existing = Chart.getChart(ctx); if (existing) { try { existing.destroy(); } catch(e) {} }
    var maquinas = [
        { id: 'alteirac', name: 'Alteirac', col: '#34d399', sector: 'Planta Primaria' },
        { id: 'n1560',    name: 'N1560',    col: '#60a5fa', sector: 'Planta 1' },
        { id: 'hp400',    name: 'HP400',    col: '#a78bfa', sector: 'Planta 1' },
        { id: 'fc44',     name: '44FC',     col: '#fbbf24', sector: 'Planta 1' },
        { id: 'svedala',  name: 'Svedala',  col: '#f87171', sector: 'Planta 2' },
        { id: 'hp100',    name: 'HP100',    col: '#fb923c', sector: 'Planta 2' },
        { id: 'hp200',    name: 'HP200',    col: '#e879f9', sector: 'Planta 2' }
    ];
    var hours = maquinas.map(function(m) {
        var total = 0;
        (appState.data.produccion || []).forEach(function(p) {
            if (getMonthSafe(p.fecha) === currentMonth && getYearSafe(p.fecha) === currentYear) {
                if (p.maquinas && p.maquinas[m.id] !== undefined) total += parseFloat(p.maquinas[m.id]) || 0;
                else if (p.sector === m.sector) total += parseFloat(p.hrs || 0);
            }
        });
        return parseFloat(total.toFixed(1));
    });
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: maquinas.map(function(m) { return m.name; }),
            datasets: [{ label: 'Horas', data: hours, backgroundColor: maquinas.map(function(m) { return m.col + '99'; }), borderColor: maquinas.map(function(m) { return m.col; }), borderWidth: 1, borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: 'rgba(128,128,128,0.08)' } } }
        }
    });
};

// ── COSTOS MENSUALES (Consumos section) ────────────────────────────
window.updateCostsCharts = function() {
    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Helper: build per-month totals by category from items (Excel import)
    var CATS = ['combustible','lubricantes','electricidad','almacen','explosivos','manoObra','camionetas','amortizacion','reparaciones','ferrosur','otros'];
    var CAT_COLORS = {
        combustible:'rgba(251,191,36,0.75)', lubricantes:'rgba(52,211,153,0.75)',
        electricidad:'rgba(96,165,250,0.75)', almacen:'rgba(167,139,250,0.75)',
        explosivos:'rgba(248,113,113,0.75)', manoObra:'rgba(251,146,60,0.75)',
        ivaCompras:'rgba(56,189,248,0.75)', camionetas:'rgba(74,222,128,0.75)',
        amortizacion:'rgba(148,163,184,0.6)', reparaciones:'rgba(251,191,36,0.5)',
        ferrosur:'rgba(232,121,249,0.75)', otros:'rgba(107,114,128,0.5)'
    };
    var CAT_LABELS = {
        combustible:'Combustible', lubricantes:'Lubricantes', electricidad:'Electricidad',
        almacen:'Almacén', explosivos:'Explosivos', manoObra:'Mano de Obra',
        ivaCompras:'IVA / Compras', camionetas:'Flota Liviana', amortizacion:'Amortización',
        reparaciones:'Reparaciones', ferrosur:'Ferrosur', otros:'Otros'
    };

    // Build monthly totals per category from stored consumos items
    var monthTotals = {}; // cat → array[12]
    CATS.forEach(function(c) { monthTotals[c] = new Array(12).fill(0); });

    (appState.data.consumos || []).forEach(function(cons) {
        var m = parseInt((cons.fecha||'').split('-')[1]) - 1;
        var y = parseInt((cons.fecha||'').split('-')[0]);
        if (isNaN(m) || m < 0 || m > 11 || y !== currentYear) return;
        if (cons.items && cons.items.length > 0) {
            cons.items.forEach(function(it) {
                if (monthTotals[it.categoria]) monthTotals[it.categoria][m] += it.valor;
                else monthTotals['otros'][m] += it.valor;
            });
        } else {
            // Legacy manual entry
            monthTotals['combustible'][m]  += parseFloat(cons.diesel || 0);
            monthTotals['lubricantes'][m]  += parseFloat(cons.lub    || 0);
            monthTotals['electricidad'][m] += parseFloat(cons.electric|| 0);
            monthTotals['almacen'][m]      += parseFloat(cons.almacen || 0);
            monthTotals['explosivos'][m]   += parseFloat(cons.cost    || 0);
        }
    });

    // Only include categories that have any data
    var activeCats = CATS.filter(function(c) { return monthTotals[c].some(function(v){return v>0;}); });

    // y-axis formatter for big numbers
    var fmtY = function(v) {
        if (v >= 1e9) return '$' + (v/1e9).toFixed(1) + 'B';
        if (v >= 1e6) return '$' + (v/1e6).toFixed(0) + 'M';
        if (v >= 1e3) return '$' + (v/1e3).toFixed(0) + 'K';
        return '$' + v;
    };

    // Evolución Mensual — stacked bar (only active categories)
    var ctxBar = document.getElementById('chart-costs-monthly-bar');
    if (ctxBar) {
        var ex = Chart.getChart(ctxBar); if (ex) { try { ex.destroy(); } catch(e) {} }
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: meses,
                datasets: activeCats.map(function(c) {
                    return { label: CAT_LABELS[c], data: monthTotals[c], backgroundColor: CAT_COLORS[c], borderRadius: 2 };
                })
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, filter: function(item) { return item.text !== ''; } } },
                    tooltip: { callbacks: { label: function(ctx) {
                        var v = ctx.parsed.y;
                        return ctx.dataset.label + ': $ ' + v.toLocaleString('es-AR', {maximumFractionDigits:0});
                    }}}
                },
                scales: {
                    x: { stacked: true, ticks: { font: { size: 10 } } },
                    y: { stacked: true, grid: { color: 'rgba(128,128,128,0.08)' },
                         ticks: { font: { size: 10 }, callback: fmtY } }
                }
            }
        });
    }

    // Distribución del Gasto — doughnut del mes actual (from items)
    var ctxPie = document.getElementById('chart-costs-distribution-pie');
    if (ctxPie) {
        var ex2 = Chart.getChart(ctxPie); if (ex2) { try { ex2.destroy(); } catch(e) {} }

        var slices = activeCats.map(function(c) {
            return { label: CAT_LABELS[c], val: monthTotals[c][currentMonth], color: CAT_COLORS[c] };
        }).filter(function(s) { return s.val > 0; });

        var pieParent = ctxPie.parentElement;
        var noData = pieParent.querySelector('.no-data-label');

        if (slices.length === 0) {
            ctxPie.style.display = 'none';
            if (!noData) {
                noData = document.createElement('div');
                noData.className = 'no-data-label';
                noData.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--text-dim);font-size:0.82rem;text-align:center;';
                noData.textContent = 'Importá el Excel para ver la distribución';
                pieParent.style.position = 'relative';
                pieParent.appendChild(noData);
            }
        } else {
            ctxPie.style.display = 'block';
            if (noData) noData.remove();
            var total = slices.reduce(function(s,sl){return s+sl.val;},0);
            new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: slices.map(function(s){return s.label;}),
                    datasets: [{ data: slices.map(function(s){return s.val;}),
                                 backgroundColor: slices.map(function(s){return s.color;}),
                                 borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', hoverOffset: 6 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 },
                            generateLabels: function(chart) {
                                return chart.data.labels.map(function(label, i) {
                                    var val = chart.data.datasets[0].data[i];
                                    var pct = total > 0 ? (val/total*100).toFixed(1) : 0;
                                    return { text: label + ' ' + pct + '%',
                                             fillStyle: chart.data.datasets[0].backgroundColor[i],
                                             index: i };
                                });
                            }
                        }},
                        tooltip: { callbacks: { label: function(ctx) {
                            var v = ctx.parsed;
                            var pct = total > 0 ? (v/total*100).toFixed(1) : 0;
                            return ctx.label + ': $ ' + v.toLocaleString('es-AR',{maximumFractionDigits:0}) + ' (' + pct + '%)';
                        }}}
                    }
                }
            });
        }
    }
};

// ── DISTRIBUCIÓN MANTENIMIENTO (Mante. Fijo section) ───────────────
window.updateMaintChart = function() {
    var ctx = document.getElementById('chart-maint-type');
    var noDataEl = document.getElementById('maint-no-data');
    if (!ctx) return;

    var prev = Chart.getChart(ctx); if (prev) { try { prev.destroy(); } catch(e) {} }

    var prev_counts = { Preventivo: 0, Correctivo: 0 };
    var prev_costs  = { Preventivo: 0, Correctivo: 0 };
    (appState.data.mantenimiento || []).forEach(function(m) {
        var mm = getMonthSafe(m.fecha), yy = getYearSafe(m.fecha);
        if (mm === currentMonth && yy === currentYear) {
            var tipo = m.tipo || 'Correctivo';
            prev_counts[tipo] = (prev_counts[tipo] || 0) + 1;
            prev_costs[tipo]  = (prev_costs[tipo]  || 0) + parseFloat(m.cost || 0);
        }
    });

    var total = prev_counts.Preventivo + prev_counts.Correctivo;
    if (total === 0) {
        if (noDataEl) noDataEl.style.display = 'block';
        return;
    }
    if (noDataEl) noDataEl.style.display = 'none';

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Preventivo (' + prev_counts.Preventivo + ')', 'Correctivo (' + prev_counts.Correctivo + ')'],
            datasets: [{
                data: [prev_costs.Preventivo, prev_costs.Correctivo],
                backgroundColor: ['rgba(74,222,128,0.8)', 'rgba(248,113,113,0.8)'],
                borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: function(c) { return ' USD ' + c.parsed.toLocaleString('es-AR'); } } }
            }
        }
    });
};

// ══════════════════════════════════════════════════════════════
// FLOTA LIVIANA — Ranking gastos por unidad + evolución mensual
// ══════════════════════════════════════════════════════════════
window.updateFlotaLivianaCharts = function() {
    var gastos = appState.data.gastosFlota || [];
    var mns = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // ── Ranking por unidad (barras horizontales) ──────────────
    var ctxRank = document.getElementById('chart-gastos-movil');
    if (ctxRank) {
        var ex = Chart.getChart(ctxRank); if (ex) { try{ex.destroy();}catch(e){} }

        // Agrupar por unidad, sumar todos los meses del año
        var porUnidad = {};
        gastos.forEach(function(g) {
            var y = (g.fecha||'').split('-')[0];
            if (parseInt(y) !== currentYear) return;
            if (!porUnidad[g.unidad]) porUnidad[g.unidad] = 0;
            porUnidad[g.unidad] += parseFloat(g.monto||0);
        });

        var sorted = Object.entries(porUnidad)
            .sort(function(a,b){return b[1]-a[1];})
            .slice(0, 12); // top 12

        if (sorted.length === 0) {
            ctxRank.style.display='none';
            var noData = ctxRank.parentElement.querySelector('.no-data-fleet');
            if (!noData) {
                noData = document.createElement('div');
                noData.className = 'no-data-fleet';
                noData.style.cssText = 'padding:30px;text-align:center;color:var(--text-dim);font-size:0.82rem;';
                noData.textContent = 'Importá el Excel de camionetas para ver el ranking';
                ctxRank.parentElement.appendChild(noData);
            }
        } else {
            ctxRank.style.display = 'block';
            var nd = ctxRank.parentElement.querySelector('.no-data-fleet');
            if (nd) nd.remove();

            var labels = sorted.map(function(e){return e[0];});
            var values = sorted.map(function(e){return e[1];});
            var maxVal = Math.max.apply(null, values);

            // Gradient colors from warning to accent
            var colors = values.map(function(v, i) {
                var pct = values.length > 1 ? i / (values.length-1) : 0;
                var r = Math.round(245 - pct * 30);
                var g2= Math.round(158 + pct * 10);
                var b = Math.round(11  + pct * 100);
                return 'rgba('+r+','+g2+','+b+',0.8)';
            });

            new Chart(ctxRank, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gasto '+currentYear,
                        data: values,
                        backgroundColor: colors,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: function(ctx) {
                            return '$\u00a0' + ctx.parsed.x.toLocaleString('es-AR',{maximumFractionDigits:0});
                        }}}
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(128,128,128,0.08)' },
                            ticks: { font:{size:9}, callback: function(v) {
                                return v>=1e6 ? '$'+(v/1e6).toFixed(0)+'M' : v>=1e3 ? '$'+(v/1e3).toFixed(0)+'K' : '$'+v;
                            }}
                        },
                        y: { ticks: { font:{size:10} } }
                    }
                }
            });
        }

        // Update mes label
        var label = document.getElementById('flota-liviana-mes-label');
        if (label) label.textContent = sorted.length > 0 ? currentYear : '';
    }

    // ── Evolución mensual por unidad (líneas) ─────────────────
    var ctxEvo = document.getElementById('chart-flota-evolucion');
    if (ctxEvo) {
        var ex2 = Chart.getChart(ctxEvo); if (ex2) { try{ex2.destroy();}catch(e){} }

        // Top 5 unidades por gasto total
        var porUnidad2 = {};
        gastos.forEach(function(g) {
            var y = (g.fecha||'').split('-')[0];
            if (parseInt(y) !== currentYear) return;
            if (!porUnidad2[g.unidad]) porUnidad2[g.unidad] = new Array(12).fill(0);
            var m = parseInt((g.fecha||'').split('-')[1]||'1') - 1;
            if (m >= 0 && m < 12) porUnidad2[g.unidad][m] += parseFloat(g.monto||0);
        });

        var topUnidades = Object.entries(porUnidad2)
            .sort(function(a,b){ return b[1].reduce(function(s,v){return s+v;},0) - a[1].reduce(function(s,v){return s+v;},0); })
            .slice(0, 5);

        var COLORS_EVO = ['#f59e0b','#60a5fa','#34d399','#f87171','#a78bfa'];

        if (topUnidades.length > 0) {
            new Chart(ctxEvo, {
                type: 'line',
                data: {
                    labels: mns,
                    datasets: topUnidades.map(function(e, i) {
                        return {
                            label: e[0],
                            data: e[1].map(function(v){ return v > 0 ? v : null; }),
                            borderColor: COLORS_EVO[i % COLORS_EVO.length],
                            backgroundColor: COLORS_EVO[i % COLORS_EVO.length].replace(')',',0.1)').replace('rgb','rgba'),
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 4,
                            spanGaps: false
                        };
                    })
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position:'bottom', labels:{ font:{size:10}, boxWidth:12 } },
                        tooltip: { callbacks: { label: function(ctx) {
                            return ctx.dataset.label+': $\u00a0'+ctx.parsed.y.toLocaleString('es-AR',{maximumFractionDigits:0});
                        }}}
                    },
                    scales: {
                        x: { ticks:{font:{size:10}} },
                        y: { grid:{color:'rgba(128,128,128,0.08)'}, ticks:{font:{size:10},
                            callback:function(v){ return v>=1e6?'$'+(v/1e6).toFixed(0)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'K':'$'+v; }}}
                    }
                }
            });
        }
    }
};

// ══════════════════════════════════════════════════════════════
// FLOTA PESADA — Ranking + Evolución mensual
// ══════════════════════════════════════════════════════════════
window.updateFlotaPesadaCharts = function() {
    var gastos = appState.data.gastosFlotaPesada || [];
    var mns = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // ── Ranking por equipo ────────────────────────────────────
    var ctxRank = document.getElementById('chart-gastos-pesada');
    if (ctxRank) {
        var ex = Chart.getChart(ctxRank); if (ex) { try{ex.destroy();}catch(e){} }

        var porEquipo = {};
        gastos.forEach(function(g) {
            var y = (g.fecha||'').split('-')[0];
            if (parseInt(y) !== currentYear) return;
            if (!porEquipo[g.unidad]) porEquipo[g.unidad] = 0;
            porEquipo[g.unidad] += parseFloat(g.monto||0);
        });

        var sorted = Object.entries(porEquipo)
            .sort(function(a,b){return b[1]-a[1];})
            .slice(0, 15);

        if (sorted.length === 0) {
            ctxRank.style.display = 'none';
        } else {
            ctxRank.style.display = 'block';
            var colors2 = sorted.map(function(e, i) {
                var pct = sorted.length > 1 ? i/(sorted.length-1) : 0;
                return 'rgba('+(Math.round(245-pct*60))+','+(Math.round(158+pct*20))+','+(Math.round(11+pct*150))+',0.8)';
            });

            new Chart(ctxRank, {
                type: 'bar',
                data: {
                    labels: sorted.map(function(e){return e[0];}),
                    datasets: [{
                        label: 'Gasto '+currentYear,
                        data: sorted.map(function(e){return e[1];}),
                        backgroundColor: colors2,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: function(ctx) {
                            return '$\u00a0'+ctx.parsed.x.toLocaleString('es-AR',{maximumFractionDigits:0});
                        }}}
                    },
                    scales: {
                        x: { grid:{color:'rgba(128,128,128,0.08)'}, ticks:{font:{size:9},
                            callback:function(v){ return v>=1e6?'$'+(v/1e6).toFixed(0)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'K':'$'+v; }}},
                        y: { ticks:{font:{size:9}} }
                    }
                }
            });
        }
    }

    // ── Evolución mensual acumulada ───────────────────────────
    var ctxEvo2 = document.getElementById('chart-pesada-evolucion');
    if (ctxEvo2) {
        var ex3 = Chart.getChart(ctxEvo2); if (ex3) { try{ex3.destroy();}catch(e){} }

        var mensual = new Array(12).fill(0);
        gastos.forEach(function(g) {
            var y = (g.fecha||'').split('-')[0];
            if (parseInt(y) !== currentYear) return;
            var m = parseInt((g.fecha||'').split('-')[1]||'1') - 1;
            if (m >= 0 && m < 12) mensual[m] += parseFloat(g.monto||0);
        });

        var hasData = mensual.some(function(v){return v>0;});
        if (hasData) {
            new Chart(ctxEvo2, {
                type: 'bar',
                data: {
                    labels: mns,
                    datasets: [{
                        label: 'Gasto mensual '+currentYear,
                        data: mensual.map(function(v){ return v>0?v:null; }),
                        backgroundColor: 'rgba(245,158,11,0.7)',
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: function(ctx) {
                            return '$\u00a0'+ctx.parsed.y.toLocaleString('es-AR',{maximumFractionDigits:0});
                        }}}
                    },
                    scales: {
                        x: { ticks:{font:{size:10}} },
                        y: { grid:{color:'rgba(128,128,128,0.08)'}, beginAtZero:true,
                            ticks:{font:{size:10}, callback:function(v){ return v>=1e6?'$'+(v/1e6).toFixed(0)+'M':v>=1e3?'$'+(v/1e3).toFixed(0)+'K':'$'+v; }}}
                    }
                }
            });
        }
    }

    // Update tabla resumen
    var tbody = document.getElementById('flota-pesada-table-body');
    if (tbody && gastos.length > 0) {
        var porEquipo2 = {};
        gastos.forEach(function(g) {
            if (!porEquipo2[g.unidad]) porEquipo2[g.unidad] = {count:0, total:0};
            porEquipo2[g.unidad].count++;
            porEquipo2[g.unidad].total += parseFloat(g.monto||0);
        });
        var rows = Object.entries(porEquipo2).sort(function(a,b){return b[1].total-a[1].total;});
        tbody.innerHTML = rows.map(function(e){
            return '<tr><td><b>'+e[0]+'</b></td><td>'+e[1].count+'</td>'+
                '<td style="color:var(--warning);font-weight:700;">$\u00a0'+e[1].total.toLocaleString('es-AR',{maximumFractionDigits:0})+'</td></tr>';
        }).join('');
    }
};
