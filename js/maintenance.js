/**
 * maintenance.js
 * Módulo de Plan de Mantenimiento y Paradas Programadas
 */

window.guardarParadaProgramada = function() {
    const fecha = document.getElementById('parada-fecha').value;
    const equipo = document.getElementById('parada-equipo').value;
    const motivo = document.getElementById('parada-motivo').value;
    const duracion = document.getElementById('parada-duracion').value;

    if(!fecha || !equipo) return alert('Complete fecha y equipo');

    const p = {
        id: Date.now(),
        fecha, equipo, motivo, duracion, completada: false
    };

    if(!appState.data.paradasProgramadas) appState.data.paradasProgramadas = [];
    appState.data.paradasProgramadas.push(p);
    syncAndRefreshData();
    alert('Parada programada guardada');
};

window.renderPlanMantenimiento = function() {
    const container = document.getElementById('maintenance-plan-list');
    if(!container) return;

    const paradas = appState.data.paradasProgramadas || [];
    if(paradas.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);">No hay paradas programadas.</div>';
        return;
    }

    container.innerHTML = paradas.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(p => `
        <div class="list-item-card" style="border-left:4px solid ${p.completada?'var(--success)':'var(--warning)'}; opacity:${p.completada?0.6:1};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <b style="font-size:0.95rem;color:var(--text-main);">${p.equipo}</b>
                    <br><span style="font-size:0.75rem;color:var(--text-dim);">${p.fecha} · ${p.duracion} hs estimadas</span>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.8rem;color:${p.completada?'var(--success)':'var(--warning)'};font-weight:700;">${p.completada?'COMPLETADA':'PENDIENTE'}</span>
                </div>
            </div>
            <div style="margin-top:8px;font-size:0.85rem;color:var(--text-dim);">
                ${p.motivo}
            </div>
            <div style="margin-top:10px;display:flex;gap:10px;">
                ${!p.completada?`<button onclick="marcarParadaCompletada(${p.id})" style="padding:4px 8px;border-radius:4px;border:none;background:var(--success);color:white;cursor:pointer;font-size:0.7rem;">Completar</button>`:''}
                <button onclick="eliminarParada(${p.id})" style="padding:4px 8px;border-radius:4px;border:none;background:rgba(239,68,68,0.1);color:var(--danger);cursor:pointer;font-size:0.7rem;">Eliminar</button>
            </div>
        </div>
    `).join('');
};

window.marcarParadaCompletada = function(id) {
    appState.data.paradasProgramadas = (appState.data.paradasProgramadas || []).map(p => p.id === id ? {...p, completada: true} : p);
    syncAndRefreshData();
};

window.eliminarParada = function(id) {
    if(!confirm('¿Eliminar esta parada?')) return;
    appState.data.paradasProgramadas = (appState.data.paradasProgramadas || []).filter(p => p.id !== id);
    syncAndRefreshData();
};
