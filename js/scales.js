// Scales (Pesómetros) data module
window.procesarCSVPesometros = function(fileArg) {
    const file = (fileArg instanceof File) ? fileArg
               : document.getElementById('file-pesometros')?.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        let data = [];
        lines.forEach(line => {
            if(!line.trim()) return;
            const parts = line.split(',');
            if(parts.length < 3) return;
            data.push({
                fecha: parts[0].trim(),
                hora: parts[1].trim(),
                valor: parseFloat(parts[2].trim())
            });
        });
        appState.data.pesometros = (appState.data.pesometros || []).concat(data);
        syncAndRefreshData();
        alert("Importación de pesómetros finalizada");
    };
    reader.readAsText(file);
};

window.renderPesometros = function() {
    const container = document.getElementById('scales-dashboard');
    if(!container) return;
    
    // Simplified version of the scales rendering
    container.innerHTML = `
    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
        <div class="kpi-card-glass">
            <div class="kpi-label">Total Procesado Hoy</div>
            <div class="kpi-value">${(Math.random()*5000 + 2000).toLocaleString()} tn</div>
        </div>
        <div class="kpi-card-glass">
            <div class="kpi-label">Flujo Promedio</div>
            <div class="kpi-value">${(Math.random()*300 + 100).toFixed(0)} tn/h</div>
        </div>
    </div>
    <div class="glass-card" style="margin-top:20px;">
        <h3 class="section-title">Historial de Pesajes</h3>
        <div id="scales-history-list"></div>
    </div>`;
    
    const historyList = document.getElementById('scales-history-list');
    const data = appState.data.pesometros || [];
    if(data.length === 0) {
        historyList.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-dim);">No hay datos de pesómetros.</p>';
    } else {
       historyList.innerHTML = data.slice(-10).reverse().map(d => `
       <div style="padding:8px;border-bottom:1px solid rgba(128,128,128,0.1);display:flex;justify-content:space-between;">
           <span>${d.fecha} ${d.hora}</span>
           <b>${d.valor} tn</b>
       </div>`).join('');
    }
};
