/**
 * APPSTATE.JS
 * Estado global y configuración inicial del Dashboard
 */

// === HELPERS DE FECHA GLOBALES ===
window.getMonthSafe = function(f) { 
    if(!f) return 0;
    const p = String(f).includes('/') ? String(f).split('/') : String(f).split('-');
    let m = parseInt(p[1]);
    if (isNaN(m)) return 0;
    return m - 1; 
};

window.getYearSafe = function(f) {
    if(!f) return 0;
    const p = String(f).includes('/') ? String(f).split('/') : String(f).split('-');
    let y = p.length === 3 ? (p[0].length === 4 ? p[0] : p[2]) : p[0];
    return parseInt(y);
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES Y CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════

window.WEAR_MACHINES = {
    'alteirac': {
        nombre: 'Mandíbula Altairac 120x90',
        planta: 'Planta Primaria',
        tipo: 'mandibula',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775946423150.jpg',
        piezas: [
            { id: 'fija',    nombre: 'Mandíbula Fija',        vida: 3500, color: '#facc15', zona: { x: 34, y: 25, w: 9, h: 60 } },
            { id: 'movil',   nombre: 'Mandíbula Móvil',       vida: 3800, color: '#dc2626', zona: { x: 44, y: 27, w: 8, h: 56 } }
        ]
    },
    'n1560': {
        nombre: 'Cónico Nordberg 1560',
        planta: 'Planta 1',
        tipo: 'conica',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775945301188.jpg',
        piezas: [
            { id: 'manto', nombre: 'Manto',      vida: 2800, color: '#84cc16', zona: { cx: 50, cy: 55, rx: 21, ry: 16 } },
            { id: 'bowl',  nombre: 'Cóncavo',    vida: 3000, color: '#3b82f6', zona: { cx: 50, cy: 38, rx: 27, ry: 18 } }
        ]
    },
    'hp400': {
        nombre: 'HP400 Secondary',
        planta: 'Planta 1',
        tipo: 'conica',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775945301376.png',
        piezas: [
            { id: 'manto', nombre: 'Manto',      vida: 3200, color: '#f59e0b', zona: { cx: 50, cy: 58, rx: 15, ry: 19 } },
            { id: 'bowl',  nombre: 'Bowl Liner', vida: 3400, color: '#60a5fa', zona: { cx: 50, cy: 50, rx: 35, ry: 40 } }
        ]
    },
    'fc44': {
        nombre: 'Cone 44FC Fine',
        planta: 'Planta 1',
        tipo: 'conica',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775945301329.png',
        piezas: [
            { id: 'manto', nombre: 'Manto',      vida: 2500, color: '#f59e0b', zona: { cx: 50, cy: 60, rx: 14, ry: 18 } },
            { id: 'bowl',  nombre: 'Bowl Liner', vida: 2600, color: '#60a5fa', zona: { cx: 50, cy: 50, rx: 32, ry: 38 } }
        ]
    },
    'svedala': {
        nombre: 'Primario Svedala (Planta 2)',
        planta: 'Planta 2',
        tipo: 'mandibula',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775946423236.png',
        piezas: [
            { id: 'fija',  nombre: 'Mandíbula Fija',  vida: 4000, color: '#facc15', zona: { x: 34, y: 24, w: 9, h: 63 } },
            { id: 'movil', nombre: 'Mandíbula Móvil', vida: 4200, color: '#dc2626', zona: { x: 45, y: 26, w: 9, h: 58 } }
        ]
    },
    'hp100': {
        nombre: 'HP100 Tertiary',
        planta: 'Planta 2',
        tipo: 'conica',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775945301100.jpg',
        piezas: [
            { id: 'manto', nombre: 'Manto',      vida: 2200, color: '#f59e0b', zona: { cx: 50, cy: 58, rx: 14, ry: 17 } },
            { id: 'bowl',  nombre: 'Bowl Liner', vida: 2400, color: '#60a5fa', zona: { cx: 50, cy: 50, rx: 33, ry: 37 } }
        ]
    },
    'hp200': {
        nombre: 'HP200 Tertiary',
        planta: 'Planta 2',
        tipo: 'conica',
        foto: '../../brain/a56bf1c1-0ff1-4756-bd7a-c77fc18cf7bb/media__1775945301147.jpg',
        piezas: [
            { id: 'manto', nombre: 'Manto',      vida: 2600, color: '#f59e0b', zona: { cx: 50, cy: 60, rx: 15, ry: 19 } },
            { id: 'bowl',  nombre: 'Bowl Liner', vida: 2800, color: '#60a5fa', zona: { cx: 50, cy: 50, rx: 34, ry: 39 } }
        ]
    }
};

window.MAQUINAS_POR_UBICACION = {
    'pozo': ['alteirac', 'svedala'],
    'planta1': ['n1560', 'hp400', 'fc44'],
    'planta2': ['hp100', 'hp200']
};

window.ROCA_DATA = {
    'granito': { densidad: '2.65-2.75 t/m³', dureza: '6-7 Mohs', resistencia: '150-250 MPa', factor_explosivo: '0.35-0.55 kg/t', abrasividad: 'Alta', nota: 'Alta abrasividad — acelera desgaste de mandíbulas y mantos.' },
    'caliza': { densidad: '2.20-2.60 t/m³', dureza: '3-4 Mohs', resistencia: '50-150 MPa', factor_explosivo: '0.20-0.40 kg/t', abrasividad: 'Baja-Media', nota: 'Baja abrasividad — buena vida útil de piezas.' },
    'basalto': { densidad: '2.80-3.00 t/m³', dureza: '5-6 Mohs', resistencia: '200-350 MPa', factor_explosivo: '0.40-0.65 kg/t', abrasividad: 'Alta', nota: 'Muy abrasivo y duro — requiere mayor factor de carga.' },
    'arenisca': { densidad: '2.00-2.50 t/m³', dureza: '6-7 Mohs', resistencia: '20-170 MPa', factor_explosivo: '0.25-0.45 kg/t', abrasividad: 'Media', nota: 'Resistencia muy variable.' },
    'cuarcita': { densidad: '2.60-2.70 t/m³', dureza: '7 Mohs', resistencia: '200-400 MPa', factor_explosivo: '0.50-0.70 kg/t', abrasividad: 'Muy Alta', nota: 'Extremadamente abrasiva.' },
    'marmol': { densidad: '2.50-2.70 t/m³', dureza: '3-4 Mohs', resistencia: '60-120 MPa', factor_explosivo: '0.20-0.35 kg/t', abrasividad: 'Baja', nota: 'Baja abrasividad, buena fragmentación.' }
};

window.PESO_COLORES = { 'CINTA 25': '#34d399', 'CINTA 20': '#60a5fa', 'CINTA 19': '#a78bfa', 'CINTA 13': '#fbbf24', 'CINTA 3':  '#f87171' };
window.PESO_CINTAS_ORDEN = ['CINTA 25','CINTA 20','CINTA 19','CINTA 13','CINTA 3'];

// ============================================================
// DATA.JS — ESTADO GLOBAL
// ============================================================
const defaultData = {
    produccion: [],
    despacho:   [],
    consumos:   [],
    voladuras: [],
    blasting: [],
    mantenimiento: [],
    gastosFlota: [],
    piezas: {},
    historialCambios: [],
    alertasDesgaste: [],
    inventario: [],
    movimientosInventario: [],
    paradasProgramadas: [],
    pesometros: [],
    novedadesTurno: [],
    insumosPerforadora: [],
    tnManual: [],
    config: {
        apiKey: '',
        operarios: ["Juan Pérez", "M. González", "R. Rodríguez", "A. Martínez", "D. Sánchez"],
        frentes: ["Banco 1 Norte", "Banco 2 Sur", "Frente Este", "Frente Oeste"],
        plantas: ["Planta Primaria", "Planta 1", "Planta 2"],
        targets: { 'Planta Primaria':450, 'Planta 1':320, 'Planta 2':280 },
        modulos: { comercial:false, alertasFlota:false, rrhh:false, agro:false, automatizacion:false, 'mod-inventario':false, 'mod-planmant':false, 'mod-turnolive':false, 'mod-pesometros':false }
    },
    configBalanzas: [
        { id: 'CINTA 25', desc: 'Salida Primaria', activa: true, rangoMax: 1200 },
        { id: 'CINTA 20', desc: 'Alimentación Planta 1', activa: true, rangoMax: 800 },
        { id: 'CINTA 19', desc: 'Retorno Planta 1', activa: true, rangoMax: 400 },
        { id: 'CINTA 13', desc: 'Salida Planta 1', activa: true, rangoMax: 800 },
        { id: 'CINTA 3',  desc: 'Salida Planta 2', activa: true, rangoMax: 600 }
    ],
    flota: [],
    flotaPesada: [],
    zonas: []
};

let savedDB;
try { 
    savedDB = JSON.parse(localStorage.getItem('guerrico-db')); 
    // Migrar datos si vienen de versión antigua
    if(savedDB && !savedDB._schemaVersion) {
        savedDB._schemaVersion = '4.2';
        // Preservar todos los datos existentes
        localStorage.setItem('guerrico-db', JSON.stringify(savedDB));
    }
} catch(e) { savedDB = null; }

// Guardar una copia de seguridad automática cada vez que hay datos
try {
    if(savedDB && (savedDB.gastosFlota||[]).length > 0) {
        localStorage.setItem('guerrico-db-autobackup', JSON.stringify(savedDB));
    }
} catch(e) {}

const appState = {
    currentView: 'resumen',
    data: savedDB || defaultData,
    monthlyData: {
        produccion: new Array(12).fill(0), despacho: new Array(12).fill(0),
        diesel: new Array(12).fill(0), lub: new Array(12).fill(0),
        electric: new Array(12).fill(0), almacen: new Array(12).fill(0),
        blastCost: new Array(12).fill(0), otrosCostos: new Array(12).fill(0),
        maintPrev: new Array(12).fill(0), maintCorr: new Array(12).fill(0)
    }
};

// Asegurar estructura de datos
if(!appState.data.config) appState.data.config = defaultData.config;

// Migrar voladuras→blasting si es necesario (compatibilidad)
try {
    if(savedDB && (savedDB.voladuras||[]).length > 0 && !(savedDB.blasting||[]).length) {
        savedDB.blasting = savedDB.voladuras;
        localStorage.setItem('guerrico-db', JSON.stringify(savedDB));
    }
} catch(e) {}

// Si los datos principales están vacíos pero hay autobackup, restaurar automáticamente
try {
    var _hasData = (appState.data.gastosFlota||[]).length > 0 || 
                   (appState.data.produccion||[]).length > 0 ||
                   (appState.data.blasting||[]).length > 0;
    if(!_hasData) {
        var _autobackup = localStorage.getItem('guerrico-db-autobackup');
        if(_autobackup) {
            var _abData = JSON.parse(_autobackup);
            var _abHasData = (_abData.gastosFlota||[]).length > 0 ||
                             (_abData.produccion||[]).length > 0;
            if(_abHasData) {
                console.log('[AutoRestore] Restaurando desde autobackup...');
                appState.data = _abData;
                localStorage.setItem('guerrico-db', _autobackup);
            }
        }
    }
} catch(e) { console.warn('[AutoRestore] Error:', e); }

if(!appState.data.config.modulos) appState.data.config.modulos = defaultData.config.modulos;
['comercial','alertasFlota','rrhh','agro','automatizacion'].forEach(m => {
    if(appState.data.config.modulos[m] === undefined) appState.data.config.modulos[m] = false;
});
if(!appState.data.config.productos) appState.data.config.productos = [];
if(!appState.data.flotaPesada) appState.data.flotaPesada = [];
if(!appState.data.mantenimientoPesado) appState.data.mantenimientoPesado = [];
if(!appState.data.gastosFlota) appState.data.gastosFlota = [];
if(!appState.data.consumoManualFlota) appState.data.consumoManualFlota = [];
if(!appState.data.piezas) appState.data.piezas = {};
if(!appState.data.zonas) appState.data.zonas = [];
if(!appState.data.mantenimientoExterno) appState.data.mantenimientoExterno = [];
if(!appState.data.inventario) appState.data.inventario = [];
if(!appState.data.movimientosInventario) appState.data.movimientosInventario = [];
if(!appState.data.paradasProgramadas) appState.data.paradasProgramadas = [];
if(!appState.data.pesometros) appState.data.pesometros = [];
if(!appState.data.novedadesTurno) appState.data.novedadesTurno = [];
if(!appState.data.insumosPerforadora) appState.data.insumosPerforadora = [];
if(!appState.data.tnManual) appState.data.tnManual = [];
if(!appState.data.alertasDesgaste) appState.data.alertasDesgaste = [];
if(!appState.data.configBalanzas) appState.data.configBalanzas = defaultData.configBalanzas;

// NOTE: currentYear/Month are initialized in utils.js as window globals.
// appState.js reads them after utils.js loads.
let charts = {};


let currentEditingPiece = null;
