
/**
 * main.js
 * Entry point for the Quarry Dashboard. Orchestrates initialization and real-time updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] Initializing Dashboard...');

    // 1. Initial State Sync
    if (typeof syncAndRefreshData === 'function') {
        syncAndRefreshData();
    }

    // 2. Setup Modules
    if (typeof setupTheme === 'function') setupTheme();
    if (typeof setupMesFilter === 'function') setupMesFilter();
    setupNavigation(); // Local definition below
    if (typeof setupForms === 'function') setupForms();
    if (typeof setupConfig === 'function') setupConfig();

    // 3. Initialize Visuals
    // NOTE: initMap() is NOT called here because the voladuras section is hidden (display:none)
    // at load time — Leaflet can't calculate container dimensions. It's initialized lazily
    // on first navigation to Voladuras (see showView below).
    if (typeof initCharts === 'function') initCharts();
    if (typeof initWearModule === 'function') initWearModule();

    // 4. Real-time Clock & Turn Updates
    const startRealTimeUpdates = () => {
        // Turno config: Dia 06-15, Noche 15-06
        const TURNO_DIA   = { inicio: 6,  fin: 15, label: 'Turno Día',   icon: '☀️', bgDark: 'rgba(251,191,36,0.15)', bgLight: 'rgba(180,83,9,0.12)',   colorDark: 'var(--warning)', colorLight: '#92400e' };
        const TURNO_NOCHE = { inicio: 15, fin: 6,  label: 'Turno Noche', icon: '🌙', bgDark: 'rgba(99,102,241,0.15)', bgLight: 'rgba(99,102,241,0.12)', colorDark: '#818cf8',        colorLight: '#4338ca' };

        // Update clock every second
        const updateReloj = () => {
            const ahora = new Date();
            const hStr = ahora.toTimeString().substring(0, 5);
            const el = document.getElementById('header-reloj-mini');
            if (el) el.textContent = hStr;
        };

        const updateTurno = () => {
            const ahora = new Date();
            const h = ahora.getHours();
            const esDia = h >= 6 && h < 15;
            const turno = esDia ? TURNO_DIA : TURNO_NOCHE;
            const isLight = document.body.classList.contains('theme-light');

            // Tiempo restante del turno actual
            let finTurno = new Date(ahora);
            if (esDia) {
                finTurno.setHours(15, 0, 0, 0);
            } else {
                if (h >= 15) {
                    finTurno.setDate(finTurno.getDate() + 1);
                    finTurno.setHours(6, 0, 0, 0);
                } else {
                    finTurno.setHours(6, 0, 0, 0);
                }
            }
            const minRestantes = Math.max(0, Math.round((finTurno - ahora) / 60000));
            const hRest = Math.floor(minRestantes / 60);
            const mRest = minRestantes % 60;
            const restStr = minRestantes > 0 ? hRest + 'h ' + String(mRest).padStart(2,'0') + 'm' : 'Cambio de turno';

            const iconEl  = document.getElementById('header-turno-icon');
            const textoEl = document.getElementById('header-turno-texto');
            const badge   = document.getElementById('header-turno-badge');
            const restEl  = document.getElementById('header-turno-restante');

            if (iconEl)  iconEl.textContent  = turno.icon;
            if (textoEl) textoEl.textContent = turno.label;
            if (restEl)  restEl.textContent  = restStr;
            if (badge) {
                badge.style.background = isLight ? turno.bgLight : turno.bgDark;
                badge.style.color      = isLight ? turno.colorLight : turno.colorDark;
            }

            if (typeof actualizarPanelTurnoActivo === 'function') {
                actualizarPanelTurnoActivo();
            }
        };

        updateReloj();
        updateTurno();
        setInterval(updateReloj, 1000);  // reloj cada segundo
        setInterval(updateTurno, 30000); // turno cada 30s
    };
    startRealTimeUpdates();

    // 5. External Data Sync (OneDrive/Google Sheets)
    setTimeout(() => {
        if (typeof sincronizarOneDrive === 'function') {
            sincronizarOneDrive();
        }
    }, 2500);

    // 6. Cleanup & Insights
    setTimeout(() => {
        if (typeof renderFallasRecurrentes === 'function') renderFallasRecurrentes();
        if (typeof analizarAlertasDesgaste === 'function') analizarAlertasDesgaste();
    }, 500);

    console.log('[Main] Initialization Complete.');
});

/**
 * setupNavigation
 * Sets up the event listeners for tab switching.
 */
function setupNavigation() {
    console.log('[Main] Setting up navigation...');
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const view = link.getAttribute('data-view');
            if (view) {
                showView(view);
            }
        });
    });
}

/**
 * showView
 * Switches the active section of the dashboard.
 * @param {string} viewId - The ID of the section to show.
 */
window.showView = function(viewId) {
    console.log('[Main] Switching to view:', viewId);
    
    // Update Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update Sections
    document.querySelectorAll('.view').forEach(section => {
        if (section.id === viewId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Trigger view-specific logic
    if (viewId === 'produccion' && typeof renderTurnosPanel === 'function') renderTurnosPanel();
    if (viewId === 'inventario' && typeof renderInventario === 'function') renderInventario();
    if (viewId === 'mantenimiento-plan' && typeof renderPlanMantenimiento === 'function') renderPlanMantenimiento();
    if (viewId === 'turno-live' && typeof initTurnoLive === 'function') initTurnoLive();
    if (viewId === 'pesometros' && typeof renderPesometros === 'function') renderPesometros();
    if (viewId === 'analytics' && typeof calcularCruceVoladuras === 'function') calcularCruceVoladuras();
    if (viewId === 'configuracion' && typeof setupConfig === 'function') setupConfig();
    if (viewId === 'configuracion' && typeof renderConfigPanel === 'function') renderConfigPanel();
    if (viewId === 'costos' && typeof renderConsumosGuardados === 'function') renderConsumosGuardados();
    if (viewId === 'flota-liviana' && typeof renderFlotaLiviana === 'function') renderFlotaLiviana();
    if (viewId === 'mantenimiento-fijo') {
        // El módulo se inicializa con la sección oculta (display:none) → getBoundingClientRect devuelve 0.
        // Esperamos dos frames de animación para garantizar que el navegador ya calculó el layout real
        // antes de intentar dibujar las zonas de desgaste sobre la imagen.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (typeof cambiarUbicacion === 'function') cambiarUbicacion();
                else if (typeof renderWearModule === 'function') renderWearModule();
            });
        });
    }

    // === MAPA DE VOLADURAS — inicialización diferida ===
    // El mapa SÓLO se puede inicializar cuando el contenedor es visible (tiene dimensiones reales).
    // Si intentamos initMap() con el contenedor oculto, Leaflet queda con tamaño 0×0 → pantalla gris.
    if (viewId === 'voladuras') {
        setTimeout(() => {
            const mapContainer = document.getElementById('quarry-map-container');
            if (!mapContainer) return;

            if (!window.map) {
                // Primera vez que se navega a Voladuras: inicializar el mapa
                if (typeof initMap === 'function') {
                    initMap();
                }
            } else {
                // Visitas subsiguientes: solo forzar recalculo de tamaño
                window.map.invalidateSize();
            }

            // Actualizar pines y zonas
            if (typeof updateMapPins === 'function') updateMapPins();
            if (typeof renderMapZones === 'function') renderMapZones();
            if (typeof updateBlastFrenteSelector === 'function') updateBlastFrenteSelector();
        }, 250);
    }
};
