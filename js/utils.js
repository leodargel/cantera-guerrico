
/**
 * utils.js
 * Global utilities, date helpers, theme management, and filters.
 */

// Global state variables for filtering
window.currentMonth = new Date().getMonth();
window.currentYear = new Date().getFullYear();
window.prevMonth = window.currentMonth === 0 ? 11 : window.currentMonth - 1;

/**
 * getMonthSafe
 * Extracts the 0-indexed month from a YYYY-MM-DD string.
 */
window.getMonthSafe = function(dateStr) {
    if (!dateStr) return -1;
    const parts = dateStr.split('-');
    if (parts.length < 2) return -1;
    return parseInt(parts[1]) - 1;
};

/**
 * getYearSafe
 * Extracts the full year from a YYYY-MM-DD string.
 */
window.getYearSafe = function(dateStr) {
    if (!dateStr) return -1;
    const parts = dateStr.split('-');
    if (parts.length < 1) return -1;
    return parseInt(parts[0]);
};

// setupTheme and toggleTheme are defined in forms.js

/**
 * setupMesFilter
 * Initializes the global month selector and updates global period on change.
 */
window.setupMesFilter = function() {
    const filter = document.getElementById('global-month-filter');
    if(!filter) return;
    
    // Set default value to match starting state
    const currentVal = `${window.currentYear}-${String(window.currentMonth + 1).padStart(2, '0')}`;
    filter.value = currentVal;
    
    filter.addEventListener('change', function(e) {
        const val = e.target.value; // Expected: YYYY-MM
        const p = val.split('-');
        if (p.length === 2) {
            window.currentYear = parseInt(p[0]);
            window.currentMonth = parseInt(p[1]) - 1;
            window.prevMonth = window.currentMonth === 0 ? 11 : window.currentMonth - 1;
            
            console.log(`[Filter] Dashboard period adjusted to: ${window.currentMonth + 1}/${window.currentYear}`);
            if (typeof syncAndRefreshData === 'function') {
                syncAndRefreshData();
            }
        }
    });
};

/**
 * Global Exports/Imports (Database Management)
 */

window.exportarDatos = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState.data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `guerrico_db_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

window.importarDatosBackUp = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            appState.data = importedData;
            if (typeof syncAndRefreshData === 'function') syncAndRefreshData();
            alert('Base de datos restaurada correctamente');
        } catch(err) {
            alert('Error al importar el archivo JSON');
        }
    };
    reader.readAsText(file);
};

window.limpiarDatosDemo = function() {
    if(!confirm('¿Desea limpiar TODOS los datos del sistema? Esta acción no se puede deshacer.')) return;
    localStorage.removeItem('guerrico-db');
    location.reload();
};

/**
 * toggleSection
 * Colapsa/expande una sección con caret animado
 */
window.toggleSection = function(id) {
    var content = document.getElementById('content-' + id);
    var caret   = document.getElementById('caret-' + id);
    if (!content) return;
    var isHidden = content.style.display === 'none' || content.style.display === '';
    if (isHidden) {
        content.style.display = 'block';
        content.style.overflow = 'hidden';
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        content.style.transition = 'max-height 0.35s ease, opacity 0.25s ease';
        setTimeout(function() {
            content.style.maxHeight = content.scrollHeight + 200 + 'px';
            content.style.opacity = '1';
        }, 10);
        if (caret) caret.textContent = '▾';
    } else {
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        setTimeout(function() { content.style.display = 'none'; }, 320);
        if (caret) caret.textContent = '▸';
    }
};

window.renderLitrosHistorial = function() {
    var el = document.getElementById('litros-historial');
    if (!el) return;
    var data = (appState.data.litrosCombustible || [])
        .filter(function(x){ return x.litros > 0; })
        .sort(function(a,b){ return b.fecha.localeCompare(a.fecha); })
        .slice(0, 6);
    if (!data.length) { el.innerHTML = ''; return; }
    var mns=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">' +
        data.map(function(d) {
            var p=d.fecha.split('-');
            var lab=(mns[parseInt(p[1])-1]||p[1])+' '+p[0];
            return '<div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);border-radius:6px;padding:3px 8px;font-size:0.72rem;">' +
                   '<b style="color:var(--warning);">' + lab + '</b>: ' +
                   parseFloat(d.litros).toLocaleString('es-AR') + ' Ltr' +
                   '</div>';
        }).join('') + '</div>';
};
