/**
 * reports.js
 * Funciones de reportes, smart summaries, expedientes y exportación.
 */

// ═══════════════════════════════════════════════════════════════════
// SMART SUMMARIES — Textos inteligentes por sección
// ═══════════════════════════════════════════════════════════════════

window.updateSmartSummaries = function() {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesNom = meses[currentMonth] + ' ' + currentYear;

    // === RESUMEN ===
    const prodMes  = appState.monthlyData.produccion[currentMonth] || 0;
    const despMes  = appState.monthlyData.despacho[currentMonth]   || 0;
    const fuelMes  = appState.monthlyData.diesel[currentMonth]     || 0;
    const ratio    = prodMes > 0 ? (fuelMes / prodMes).toFixed(2) : '—';
    const balance  = prodMes - despMes;
    const balSign  = balance >= 0 ? '+' : '';
    const resEl    = document.getElementById('smart-text-resumen');
    if (resEl) {
        if (prodMes === 0) {
            resEl.textContent = `Sin datos de producción para ${mesNom}. Importá el Excel de producción o registrá turnos manualmente.`;
        } else {
            resEl.textContent = `${mesNom}: ${prodMes.toLocaleString('es-AR')} Tn producidas / ${despMes.toLocaleString('es-AR')} Tn despachadas. Balance: ${balSign}${balance.toLocaleString('es-AR')} Tn. Ratio combustible: ${ratio} L/Tn.`;
        }
    }

    // === PRODUCCIÓN ===
    const prodSText = document.querySelector('#produccion .smart-text');
    if (prodSText) {
        const turnos = (appState.data.produccion || []).filter(p =>
            getMonthSafe(p.fecha) === currentMonth && getYearSafe(p.fecha) === currentYear
        );
        if (turnos.length === 0) {
            prodSText.textContent = `Sin turnos registrados para ${mesNom}.`;
        } else {
            const tnTotal = turnos.reduce((s, p) => s + parseFloat(p.tn || 0), 0);
            const hsTotal = turnos.reduce((s, p) => s + parseFloat(p.hrs || 0), 0);
            const efic    = hsTotal > 0 ? (tnTotal / hsTotal).toFixed(0) : '—';
            prodSText.textContent = `${mesNom}: ${turnos.length} turnos registrados. ${tnTotal.toLocaleString('es-AR')} Tn totales a ${efic} Tn/h promedio.`;
        }
    }

    // === COSTOS ===
    const costoSText = document.querySelector('#costos .smart-text');
    if (costoSText) {
        const total = (appState.monthlyData.otrosCostos[currentMonth] || 0)
                    + (appState.monthlyData.blastCost[currentMonth]   || 0)
                    + (appState.monthlyData.almacen[currentMonth]     || 0);
        if (total === 0) {
            costoSText.textContent = `Sin costos registrados para ${mesNom}. Cargá los insumos mensuales.`;
        } else {
            const costoTn = prodMes > 0 ? (total / prodMes).toFixed(2) : '—';
            costoSText.textContent = `${mesNom}: USD ${total.toLocaleString('es-AR')} en costos operativos. Costo unitario: USD ${costoTn}/Tn.`;
        }
    }

    // === VOLADURAS ===
    const blastSText = document.querySelector('#voladuras .smart-text');
    if (blastSText) {
        const vols = (appState.data.voladuras || []).filter(v =>
            getMonthSafe(v.fecha) === currentMonth && getYearSafe(v.fecha) === currentYear
        );
        if (vols.length === 0) {
            blastSText.textContent = `Sin voladuras registradas para ${mesNom}.`;
        } else {
            const tnVol  = vols.reduce((s, v) => s + parseFloat(v.tn   || 0), 0);
            const cosVol = vols.reduce((s, v) => s + parseFloat(v.cost || 0), 0);
            blastSText.textContent = `${mesNom}: ${vols.length} voladuras — ${tnVol.toLocaleString('es-AR')} Tn fragmentadas. Inversión: USD ${cosVol.toLocaleString('es-AR')}.`;
        }
    }

    // === MANTENIMIENTO FIJO ===
    const maintSText = document.querySelector('#mantenimiento-fijo .smart-text');
    if (maintSText) {
        const mantos = (appState.data.mantenimiento || []).filter(m =>
            m.fecha && m.fecha.startsWith(currentYear + '-' + String(currentMonth + 1).padStart(2, '0'))
        );
        if (mantos.length === 0) {
            maintSText.textContent = `Sin reportes de mantenimiento para ${mesNom}. Sincronizá con OneDrive o cargá manualmente.`;
        } else {
            const correctivos  = mantos.filter(m => m.tipo === 'Correctivo').length;
            const preventivos  = mantos.filter(m => m.tipo === 'Preventivo').length;
            maintSText.textContent = `${mesNom}: ${mantos.length} intervenciones — ${correctivos} correctivas, ${preventivos} preventivas.`;
        }
    }

    // === FLOTA LIVIANA ===
    const flotaSText = document.querySelector('#mantenimiento-movil .smart-text');
    if (flotaSText) {
        const gastos = (appState.data.gastosFlota || []).filter(g => {
            const mesesN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            return g.mes === mesesN[currentMonth] && g.anio === String(currentYear);
        });
        const totalFlota = gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
        const mesLabelEl = document.getElementById('flota-liviana-mes-label');
        if (mesLabelEl) mesLabelEl.textContent = mesNom;
        flotaSText.textContent = totalFlota > 0
            ? `${mesNom}: USD ${totalFlota.toLocaleString('es-AR')} en mantenimiento de flota liviana (${gastos.length} registros).`
            : `Sin gastos de flota liviana para ${mesNom}.`;
    }

    // Mes label flota pesada
    const flotaMesLabel = document.getElementById('flota-mes-label');
    if (flotaMesLabel) flotaMesLabel.textContent = mesNom;
};

// ═══════════════════════════════════════════════════════════════════
// EXPEDIENTE FLOTA LIVIANA
// ═══════════════════════════════════════════════════════════════════

window.renderExpedientesFlota = function() {
    const sel   = document.getElementById('select-expediente');
    const tbody = document.getElementById('expediente-body');
    const total = document.getElementById('expediente-total-usd');
    if (!tbody) return;

    const unidad = sel ? sel.value : null;
    const hist   = (appState.data.gastosFlota || []).filter(g => !unidad || g.unidad === unidad);
    const sum    = hist.reduce((s, g) => s + parseFloat(g.monto || 0), 0);

    tbody.innerHTML = hist.length === 0
        ? '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">Sin registros</td></tr>'
        : hist.slice().reverse().map(g =>
            `<tr>
                <td style="font-size:0.8rem;">${g.fecha || g.mes || '—'}</td>
                <td>${g.tarea || g.descripcion || '—'}<br><small style="color:var(--text-dim);">${g.taller || ''}</small></td>
                <td style="color:var(--danger);font-weight:700;">$ ${parseFloat(g.monto || 0).toLocaleString('es-AR')}</td>
            </tr>`).join('');

    if (total) total.textContent = '$ ' + sum.toLocaleString('es-AR');
};

// ═══════════════════════════════════════════════════════════════════
// EXPEDIENTE MANTENIMIENTO FIJO
// ═══════════════════════════════════════════════════════════════════

window.actualizarExpedienteMantenimiento = function() {
    if (typeof renderFallasRecurrentes === 'function') renderFallasRecurrentes();
    if (typeof renderDbManager          === 'function') renderDbManager();
};

// ═══════════════════════════════════════════════════════════════════
// EXCEL IMPORTADOR — FLOTA PESADA
// ═══════════════════════════════════════════════════════════════════

window.procesarExcelFlotaPesada = function(fileArg) {
    const file = (fileArg instanceof File) ? fileArg
               : (fileArg?.files?.[0]) ?? document.getElementById('file-pesada')?.files[0];
    if (!file) return;

    // Guardar referencia para re-procesar cuando cambia el filtro
    window._lastPesadaFile = file;

    const statusEl  = document.getElementById('pesada-status');
    const previewEl = document.getElementById('pesada-import-preview');
    const gridEl    = document.getElementById('pesada-expedientes-grid');
    const tbody     = document.getElementById('pesada-import-tbody');
    const filtro    = document.getElementById('pesada-filtro-costeo')?.value || 'TODOS';

    if (statusEl) { 
        statusEl.style.display = 'flex'; 
        statusEl.style.background = 'rgba(59,130,246,0.12)'; 
        statusEl.innerHTML = '<i class="ph-bold ph-spinner-gap" style="animation:spin 1s linear infinite;margin-right:8px;"></i> Procesando Flota Pesada...'; 
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            
            // Buscar hoja del mes actual o la primera
            const mesesES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            const mesActualNombre = mesesES[currentMonth];
            let sheetName = wb.SheetNames.find(s => s.toUpperCase().includes(mesActualNombre)) || wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            
            // Leer como JSON con encabezados para mayor flexibilidad
            const rowsRaw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rowsRaw.length < 2) throw new Error('El archivo parece estar vacío.');

            // Mapeo dinámico de columnas basado en el pedido del usuario
            // Col J(9): Tarea, Col S(18): Valor, Col X(23): Equipo, Col I(8): Nota Pedido
            // Buscamos la fila de encabezados (usualmente la 1 o donde diga FECHA/EQUIPO)
            let headerIdx = 0;
            for(let i=0; i<Math.min(10, rowsRaw.length); i++) {
                const rowStr = rowsRaw[i].join('|').toUpperCase();
                if(rowStr.includes('EQUIPO') || rowStr.includes('UBICACION') || rowStr.includes('FECHA')) {
                    headerIdx = i;
                    break;
                }
            }

            const headers = rowsRaw[headerIdx].map(h => String(h || '').toUpperCase().trim());
            
            // Función para encontrar columna por nombre o por índice fijo (fallback)
            const findCol = (names, fallbackIdx) => {
                const idx = headers.findIndex(h => names.some(n => h.includes(n)));
                return idx >= 0 ? idx : fallbackIdx;
            };

            const idxFecha  = findCol(['FECHA', 'DATE', 'CONTAB'], 1); // Fallback B
            const idxEquipo = findCol(['UBICACION', 'EQUIPO', 'MAQUINA'], 23); // Col X
            const idxDesc   = findCol(['DESCRIPCION', 'TAREA', 'TRABAJO'], 9); // Col J
            const idxCosto  = findCol(['VALOR', 'COSTO', 'IMPORTE', 'NETO'], 18); // Col S
            const idxCosteo = findCol(['COSTEO', 'CENTRO'], 10); // Col K?
            const idxNota   = findCol(['NOTA', 'PEDIDO', 'NRO'], 8); // Col I

            let registros = [];
            for (let i = headerIdx + 1; i < rowsRaw.length; i++) {
                const row = rowsRaw[i];
                if (!row || row.length === 0) continue;
                
                // Validar equipo y valor
                const unidad = String(row[idxEquipo] || '').trim();
                const monto  = _parseValFlota(row[idxCosto]);
                if (!unidad || monto === 0) continue;

                // Filtrado por centro de costeo si aplica
                const centro = String(row[idxCosteo] || '').trim();
                if (filtro !== 'TODOS' && !centro.toUpperCase().includes(filtro.toUpperCase())) continue;

                // Procesar Fecha
                let fecha = '';
                const fRaw = row[idxFecha];
                if (typeof fRaw === 'number') {
                    // Serial de Excel
                    const d = new Date(Math.round((fRaw - 25569) * 86400000));
                    fecha = d.toISOString().split('T')[0];
                } else if (fRaw) {
                    fecha = String(fRaw).trim();
                    if (fecha.includes('/')) {
                        const p = fecha.split('/');
                        if (p.length === 3) fecha = (p[2].length === 2 ? '20' + p[2] : p[2]) + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0');
                    }
                }

                // Si no hay fecha, intentar deducir del mes de la hoja
                const mesFila = fecha ? getMonthSafe(fecha) : currentMonth;
                if (mesFila !== currentMonth) continue;

                registros.push({
                    fecha:     fecha || (currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-01'),
                    unidad:    unidad,
                    tarea:     String(row[idxDesc] || 'Mantenimiento').trim(),
                    costo:     monto,
                    nota:      String(row[idxNota] || '').trim(),
                    costeo:    centro,
                    mesNum:    currentMonth + 1,
                    anio:      currentYear
                });
            }

            if (registros.length === 0) {
                throw new Error('No se encontraron registros para ' + mesActualNombre + '. Verificá las columnas del archivo.');
            }

            // Sincronizar con AppState
            if (!appState.data.mantenimientoPesado) appState.data.mantenimientoPesado = [];
            // Reemplazar mes actual
            appState.data.mantenimientoPesado = appState.data.mantenimientoPesado.filter(m => {
                const mm = getMonthSafe(m.fecha);
                const yy = getYearSafe(m.fecha);
                return !(mm === currentMonth && yy === currentYear);
            });
            appState.data.mantenimientoPesado.push(...registros);

            // Renderizar Preview en tabla
            if (tbody) {
                tbody.innerHTML = registros.slice(0, 15).map(r => `
                    <tr>
                        <td style="font-size:0.75rem;">${r.fecha}</td>
                        <td style="font-weight:700;color:var(--text-main);">${r.unidad}</td>
                        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.tarea}</td>
                        <td style="color:var(--danger);font-weight:800;">$ ${r.costo.toLocaleString('es-AR')}</td>
                    </tr>
                `).join('');
            }
            if (previewEl) previewEl.style.display = 'block';

            // Actualizar Grid de Expedientes y Ranking
            if (gridEl) {
                const porEquipo = {};
                registros.forEach(r => {
                    if (!porEquipo[r.unidad]) porEquipo[r.unidad] = { total: 0, count: 0, tareas: [] };
                    porEquipo[r.unidad].total += r.costo;
                    porEquipo[r.unidad].count++;
                    if (r.tarea && !porEquipo[r.unidad].tareas.includes(r.tarea)) porEquipo[r.unidad].tareas.push(r.tarea);
                });

                gridEl.innerHTML = Object.entries(porEquipo)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([nombre, d]) => `
                        <div class="chart-card" style="padding:14px;border-top:3px solid var(--warning);position:relative;overflow:hidden;">
                            <div style="position:absolute;top:0;right:0;padding:4px 8px;background:rgba(217,119,6,0.1);color:var(--warning);font-size:0.6rem;font-weight:800;border-radius:0 0 0 8px;">PESADA</div>
                            <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);margin-bottom:4px;">${nombre}</div>
                            <div style="font-size:1.6rem;font-weight:900;color:var(--danger);margin-bottom:4px;">$ ${d.total.toLocaleString('es-AR',{maximumFractionDigits:0})}</div>
                            <div style="font-size:0.75rem;color:var(--text-dim);">${d.count} documentos · ${d.count > 0 ? '$' + (d.total/d.count).toLocaleString('es-AR',{maximumFractionDigits:0}) + ' prom' : ''}</div>
                            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;">
                                ${d.tareas.slice(0,2).map(t => `<span style="font-size:0.6rem;background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:4px;color:var(--text-dim);">${t.substring(0,20)}...</span>`).join('')}
                            </div>
                        </div>
                    `).join('');
            }

            syncAndRefreshData();
            if (statusEl) { 
                statusEl.style.background = 'rgba(34,197,94,0.15)'; 
                statusEl.style.color = 'var(--success)';
                statusEl.innerHTML = `<b>✅ ${registros.length} registros cargados</b> correctamente.`; 
            }

        } catch (err) {
            console.error('[PesadaExcel]', err);
            if (statusEl) { 
                statusEl.style.background = 'rgba(239,68,68,0.15)'; 
                statusEl.style.color = 'var(--danger)';
                statusEl.innerHTML = `<b>❌ Error:</b> ${err.message}`; 
            }
        }
    };
    reader.readAsArrayBuffer(file);
};

window.limpiarImportPesada = function() {
    const fileEl = document.getElementById('file-pesada');
    if (fileEl) fileEl.value = '';
    const prev = document.getElementById('pesada-import-preview');
    if (prev) prev.style.display = 'none';
    const grid = document.getElementById('pesada-expedientes-grid');
    if (grid) grid.innerHTML = '';
    const status = document.getElementById('pesada-status');
    if (status) { status.style.display = 'none'; status.textContent = ''; }
    window._lastPesadaFile = null;
};

// ═══════════════════════════════════════════════════════════════════
// REGISTRAR MANTENIMIENTO (form-maint y form-mante-externo/pesada)
// ═══════════════════════════════════════════════════════════════════

window.setupMaintenanceForms = function() {
    // Mantenimiento fijo
    const fMaint = document.getElementById('form-maint');
    if (fMaint) fMaint.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            fecha  : document.getElementById('maint-date').value,
            equipo : document.getElementById('maint-eq').value,
            tipo   : document.getElementById('maint-type').value,
            cost   : parseFloat(document.getElementById('maint-cost').value) || 0,
            hrs    : parseFloat(document.getElementById('maint-hrs').value)  || 0,
            tarea  : document.getElementById('maint-eq').value
        };
        if (!entry.fecha || !entry.equipo) return alert('Completá los campos requeridos.');
        if (!appState.data.mantenimiento) appState.data.mantenimiento = [];
        appState.data.mantenimiento.push(entry);
        syncAndRefreshData();
        fMaint.reset();
        alert('Reporte cargado.');
    });

    // Mantenimiento externo (flota liviana)
    const fExt = document.getElementById('form-mante-externo');
    if (fExt) fExt.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            fecha   : new Date().toISOString().split('T')[0],
            unidad  : document.getElementById('ext-unidad').value,
            taller  : document.getElementById('ext-taller').value,
            tarea   : document.getElementById('ext-tarea').value,
            costo   : parseFloat(document.getElementById('ext-costo').value) || 0,
            km      : parseFloat(document.getElementById('ext-km').value)    || 0,
            factura : document.getElementById('ext-factura').value,
            mes     : ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][currentMonth],
            anio    : String(currentYear),
            monto   : parseFloat(document.getElementById('ext-costo').value) || 0
        };
        if (!entry.unidad || !entry.tarea) return alert('Completá los campos requeridos.');
        if (!appState.data.gastosFlota) appState.data.gastosFlota = [];
        if (!appState.data.mantenimientoExterno) appState.data.mantenimientoExterno = [];
        appState.data.gastosFlota.push(entry);
        appState.data.mantenimientoExterno.push(entry);

        // Actualizar KM del vehículo
        const veh = (appState.data.flota || []).find(v => v.nombre === entry.unidad);
        if (veh && entry.km > 0) veh.km = entry.km;

        syncAndRefreshData();
        fExt.reset();
        alert('Gasto externo registrado.');
    });

    // Alta vehículo flota liviana
    const fAlta = document.getElementById('form-alta-vehiculo');
    if (fAlta) fAlta.addEventListener('submit', function(e) {
        e.preventDefault();
        const v = {
            nombre    : document.getElementById('alta-nombre').value.trim(),
            km        : parseFloat(document.getElementById('alta-km').value) || 0,
            proxService: parseFloat(document.getElementById('alta-service').value) || 0,
            taller    : document.getElementById('alta-taller').value
        };
        if (!v.nombre) return alert('Ingresá el nombre del vehículo.');
        if (!appState.data.flota) appState.data.flota = [];
        appState.data.flota.push(v);
        syncAndRefreshData();
        fAlta.reset();
    });

    // Mantenimiento pesado
    const fPes = document.getElementById('form-mante-pesada');
    if (fPes) fPes.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            fecha  : new Date().toISOString().split('T')[0],
            unidad : document.getElementById('pes-unidad').value,
            tarea  : document.getElementById('pes-tarea').value,
            costo  : parseFloat(document.getElementById('pes-costo').value) || 0,
            mes    : ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][currentMonth],
            anio   : String(currentYear)
        };
        if (!entry.unidad || !entry.tarea) return alert('Completá los campos requeridos.');
        if (!appState.data.mantenimientoPesado) appState.data.mantenimientoPesado = [];
        appState.data.mantenimientoPesado.push(entry);
        syncAndRefreshData();
        fPes.reset();
    });

    // Alta equipo pesado
    const fAltaPes = document.getElementById('form-alta-pesada');
    if (fAltaPes) fAltaPes.addEventListener('submit', function(e) {
        e.preventDefault();
        const nombre = document.getElementById('alta-nombre-pes').value.trim();
        if (!nombre) return alert('Ingresá el nombre del equipo.');
        if (!appState.data.flotaPesada) appState.data.flotaPesada = [];
        appState.data.flotaPesada.push({ nombre });
        syncAndRefreshData();
        fAltaPes.reset();
    });

    // Combustible flota liviana
    const fComb = document.getElementById('form-combustible-manual');
    if (fComb) fComb.addEventListener('submit', function(e) {
        e.preventDefault();
        const entry = {
            vehiculo : document.getElementById('input-flota-vehiculo').value,
            litros   : parseFloat(document.getElementById('input-flota-litros').value) || 0,
            mes      : new Date().toISOString().slice(0, 7),
            fecha    : new Date().toLocaleDateString('es-AR')
        };
        if (!appState.data.consumoManualFlota) appState.data.consumoManualFlota = [];
        appState.data.consumoManualFlota.push(entry);
        syncAndRefreshData();
        fComb.reset();
        alert('Consumo de combustible registrado.');
    });

    // Expediente selector flota pesada
    const selPes = document.getElementById('select-expediente-pesado');
    if (selPes) selPes.addEventListener('change', function() {
        if (typeof renderExpedienteTablaPesada === 'function') renderExpedienteTablaPesada();
    });

    // Expediente selector flota liviana
    const selLiv = document.getElementById('select-expediente');
    if (selLiv) selLiv.addEventListener('change', function() {
        if (typeof renderExpedientesFlota === 'function') renderExpedientesFlota();
    });
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTAR CSV DESGASTE
// ═══════════════════════════════════════════════════════════════════

window.exportarDesgasteCSV = function() {
    const historial = appState.data.historialCambios || [];
    if (historial.length === 0) { alert('Sin cambios registrados para exportar.'); return; }
    const header = 'Máquina,Pieza,Fecha Colocación,Marca,Vida Técnica (hs),Horas Reales\n';
    const rows = historial.map(c =>
        `"${c.maquina}","${c.pieza}","${c.fecha}","${c.marca}",${c.vidaTecnica || ''},${c.hrsReales || ''}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `desgaste_guerrico_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTAR CSV PESÓMETROS
// ═══════════════════════════════════════════════════════════════════

window.exportarPesometrosCSV = function() {
    const turnos = appState.data.pesometros || [];
    if (turnos.length === 0) { alert('Sin datos de pesómetros para exportar.'); return; }
    const cintas = ['CINTA 25','CINTA 20','CINTA 19','CINTA 13','CINTA 3'];
    const header = 'Fecha,Hora Inicio,Hora Fin,Lecturas,Duración (h),' + cintas.map(c => c + ' Prom (Tn/h),' + c + ' Total (Tn)').join(',') + '\n';
    const rows = turnos.map(t => {
        const celdas = cintas.map(c => {
            const s = t.stats && t.stats[c];
            return s ? `${s.prom.toFixed(1)},${s.total.toFixed(0)}` : ',';
        }).join(',');
        return `"${t.fecha}","${t.horaInicio}","${t.horaFin}",${t.lecturas},${t.duracion},${celdas}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pesometros_guerrico_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════════
// PEGAR DESDE EXCEL (togglePasteArea / procesarTextoExcel)
// ═══════════════════════════════════════════════════════════════════

window.togglePasteArea = function() {
    const el = document.getElementById('paste-container');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.procesarTextoExcel = function() {
    const text  = document.getElementById('excel-text')?.value?.trim();
    if (!text)  { alert('Pegá los datos copiados de Excel primero.'); return; }
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { alert('Se necesita al menos una fila de datos.'); return; }

    const headers = lines[0].split('\t').map(h => h.trim().toUpperCase());
    let procesados = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const get = (names) => {
            for (const n of names) {
                const idx = headers.findIndex(h => h.includes(n));
                if (idx >= 0 && cols[idx] !== undefined) return cols[idx].trim();
            }
            return '';
        };

        let fecha = get(['FECHA','DATE']);
        if (fecha.includes('/')) {
            const p = fecha.split('/');
            if (p.length === 3) fecha = (p[2].length === 2 ? '20' + p[2] : p[2]) + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0');
        }
        if (!fecha.match(/^\d{4}-/)) continue;

        const equipo = get(['UBICACION','EQUIPO','MAQUINA']);
        const tarea  = get(['DESCRIPCION','TAREA']);
        const costo  = parseFloat(get(['VALOR','COSTO','IMPORTE'])) || 0;
        const tipo   = get(['TIPO']) || 'Correctivo';

        if (!equipo) continue;
        if (!appState.data.mantenimiento) appState.data.mantenimiento = [];
        appState.data.mantenimiento.push({ fecha, equipo, tarea, cost: costo, hrs: 0, tipo });
        procesados++;
    }

    if (procesados > 0) {
        syncAndRefreshData();
        alert(`✅ ${procesados} registros importados desde Excel.`);
        document.getElementById('excel-text').value = '';
        document.getElementById('paste-container').style.display = 'none';
    } else {
        alert('⚠️ No se pudo procesar ninguna fila. Verificá las columnas.');
    }
};

// ═══════════════════════════════════════════════════════════════════
// WEAR module — formulario cambio de pieza (form-cambio-pieza)
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // Formulario de recambio de pieza
    const fCambio = document.getElementById('form-cambio-pieza');
    if (fCambio) fCambio.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!currentEditingPiece) { alert('Seleccioná una pieza primero.'); return; }
        const pk = (window.wearCurrentMachine || 'alteirac') + '-' + currentEditingPiece;
        const mach = WEAR_MACHINES[window.wearCurrentMachine || 'alteirac'];
        const pieza = mach ? mach.piezas.find(p => p.id === currentEditingPiece) : null;

        const fechaCol   = document.getElementById('cp-fecha').value;
        const marca      = document.getElementById('cp-marca').value;
        const vidaTecnica = parseFloat(document.getElementById('cp-vida').value) || (pieza ? pieza.vida : 3000);

        if (!fechaCol) { alert('Seleccioná la fecha de colocación.'); return; }

        if (!appState.data.piezas) appState.data.piezas = {};
        // Guardar historial anterior si existe
        const anterior = appState.data.piezas[pk];
        if (anterior) {
            if (!appState.data.historialCambios) appState.data.historialCambios = [];
            let hrsReales = 0;
            (appState.data.produccion || []).forEach(p => {
                if (p.sector === (mach ? mach.planta : '')) {
                    if (anterior.fecha && p.fecha >= anterior.fecha) {
                        hrsReales += (p.maquinas && p.maquinas[window.wearCurrentMachine] !== undefined)
                            ? parseFloat(p.maquinas[window.wearCurrentMachine]) || 0
                            : parseFloat(p.hrs || 0);
                    }
                }
            });
            appState.data.historialCambios.push({
                maquina: window.wearCurrentMachine,
                pieza  : currentEditingPiece,
                fecha  : anterior.fecha,
                marca  : anterior.marca,
                vidaTecnica: anterior.vida,
                hrsReales: Math.round(hrsReales * 10) / 10
            });
        }

        // Registrar nueva pieza
        appState.data.piezas[pk] = { fecha: fechaCol, marca, vida: vidaTecnica };
        dataSync.save();
        if (typeof renderWearModule === 'function') renderWearModule();
        if (typeof analizarAlertasDesgaste === 'function') analizarAlertasDesgaste();
        fCambio.reset();
        const box = document.getElementById('cambio-pieza-box');
        if (box) box.style.display = 'none';
        alert('✅ Recambio registrado.');
    });

    // Init maintenance forms
    if (typeof setupMaintenanceForms === 'function') setupMaintenanceForms();
});
