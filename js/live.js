// Turno Live (Real-time Shift Dashboard) Module
window.initTurnoLive = function() {
    const container = document.getElementById('turno-live-container');
    if(!container) return;
    
    // Check if there is an active shift record for today
    const hoy = new Date().toISOString().split('T')[0];
    const turnosHoy = appState.data.produccion.filter(t => t.fecha === hoy);
    
    renderTurnoLive(turnosHoy);
};

window.renderTurnoLive = function(turnos) {
    const container = document.getElementById('turno-live-container');
    if(!container) return;

    if(turnos.length === 0) {
        container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:40px;">
            <i class="ph-clock-countdown" style="font-size:3rem;color:var(--accent-glow);opacity:0.5;"></i>
            <p style="margin-top:15px;color:var(--text-dim);">No se ha iniciado el reporte para el turno actual.</p>
            <button onclick="switchTab('registro')" class="btn-primary" style="margin-top:15px;">Registrar Turno</button>
        </div>`;
        return;
    }

    const totalTn = turnos.reduce((sum, t) => sum + t.tn, 0);
    const avgHrs = turnos.reduce((sum, t) => sum + t.horometro, 0) / turnos.length;

    container.innerHTML = `
    <div class="dashboard-grid">
        <div class="kpi-card-glass">
            <div class="kpi-label">Tonelaje Turno Actual</div>
            <div class="kpi-value">${totalTn.toLocaleString()} tn</div>
            <div style="font-size:0.75rem;color:var(--success);">+5% vs promedio móvil</div>
        </div>
        <div class="kpi-card-glass">
            <div class="kpi-label">Rendimiento</div>
            <div class="kpi-value">${avgHrs>0?(totalTn/avgHrs).toFixed(0):0} tn/h</div>
        </div>
    </div>
    <div class="glass-card" style="margin-top:20px;">
        <h3 class="section-title">Novedades del Turno</h3>
        <div id="novedades-live-lista"></div>
        <div style="margin-top:15px;display:flex;gap:10px;">
            <input type="text" id="novedad-input" placeholder="Agregar novedad..." style="flex:1;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:6px;color:white;">
            <button onclick="guardarNovedadTurno()" class="btn-primary">Publicar</button>
        </div>
    </div>`;

    const list = document.getElementById('novedades-live-lista');
    list.innerHTML = turnos.filter(t=>t.novedades).map(t => `
        <div style="margin-bottom:10px;padding:10px;background:rgba(255,255,255,0.03);border-radius:6px;border-left:3px solid var(--accent-glow);">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px;">${t.sector.toUpperCase()} · ${t.supervisor}</div>
            <div style="font-size:0.88rem;">${t.novedades}</div>
        </div>
    `).join('');
};

window.guardarNovedadTurno = function() {
    const txt = document.getElementById('novedad-input').value;
    if(!txt) return;
    // In a real app, this would append to the current shift object
    alert('Novedad enviada: ' + txt);
    document.getElementById('novedad-input').value = '';
};
