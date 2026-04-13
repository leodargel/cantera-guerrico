// calcularCruceVoladuras is defined in blasting.js

window.renderCruceAnalytics = function() {
    const container = document.getElementById('analytics-crossover');
    if(!container) return;
    
    const data = calcularCruceVoladuras();

    container.innerHTML = `
    <div class="glass-card">
        <h3 class="section-title">Análisis de Fragmentación vs. Productividad</h3>
        <div class="dashboard-grid">
            <div class="kpi-card-glass">
                <div class="kpi-label">P80 Promedio (IA)</div>
                <div class="kpi-value">${data.avgFragmentation.toFixed(1)} mm</div>
            </div>
            <div class="kpi-card-glass">
                <div class="kpi-label">Rendimiento Primaria</div>
                <div class="kpi-value">${data.avgProductivity.toFixed(0)} tn/h</div>
            </div>
        </div>
        <div style="height:300px;margin-top:20px;background:rgba(255,255,255,0.02);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--text-dim);">
            <p>[ Gráfico de Correlación: Fragmentación vs Rendimiento Trituración ]</p>
        </div>
    </div>`;
};
