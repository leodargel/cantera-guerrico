// Inventory Management Module
window.registrarMovimientoInventario = function() {
    const pieza = document.getElementById('inv-pieza').value;
    const tipo = document.getElementById('inv-tipo').value;
    const cant = parseFloat(document.getElementById('inv-cantidad').value);
    const obs = document.getElementById('inv-obs').value;
    
    if(!pieza || isNaN(cant)) return alert('Complete los campos');

    const m = {
        id: Date.now(),
        fecha: new Date().toISOString().split('T')[0],
        pieza,
        tipo,
        cantidad: cant,
        observaciones: obs
    };

    if(!appState.data.movimientosInventario) appState.data.movimientosInventario = [];
    appState.data.movimientosInventario.push(m);
    
    // Actualizar stock actual
    if(!appState.data.stock) appState.data.stock = {};
    const factor = (tipo === 'Entrada') ? 1 : -1;
    appState.data.stock[pieza] = (appState.data.stock[pieza] || 0) + (cant * factor);

    syncAndRefreshData();
    alert('Movimiento registrado');
};

window.renderInventario = function() {
    const container = document.getElementById('inventory-panel');
    if(!container) return;
    
    const stock = appState.data.stock || {};
    const items = Object.keys(stock).sort();

    container.innerHTML = `
    <div class="glass-card">
        <h3 class="section-title">Stock de Repuestos Críticos</h3>
        <div style="display:grid;grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));gap:15px;">
            ${items.map(item => `
                <div class="kpi-card-glass" style="text-align:center;">
                    <div class="kpi-label">${item}</div>
                    <div class="kpi-value" style="color:${stock[item]<2?'var(--danger)':'var(--success)'}">${stock[item]}</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">Unidades en pañol</div>
                </div>
            `).join('')}
        </div>
    </div>
    <div class="glass-card" style="margin-top:20px;">
        <h3 class="section-title">Últimos Movimientos</h3>
        <div id="inv-history-list"></div>
    </div>`;

    const history = document.getElementById('inv-history-list');
    const movs = appState.data.movimientosInventario || [];
    if(movs.length === 0) {
        history.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-dim);">No hay movimientos registrados.</p>';
    } else {
        history.innerHTML = movs.slice(-10).reverse().map(m => `
        <div style="padding:10px;border-bottom:1px solid rgba(128,128,128,0.1);display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:0.85rem;">
                <b>${m.pieza}</b> · <span style="color:${m.tipo==='Entrada'?'var(--success)':'var(--danger)'}">${m.tipo}</span>
                <br><small style="color:var(--text-dim);">${m.fecha} - ${m.observaciones}</small>
            </div>
            <div style="font-weight:700;">${m.cantidad} un</div>
        </div>`).join('');
    }
};
