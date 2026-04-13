# Dashboard Cantera Guerrico — Estructura Modular

## Cómo usar
Abrí `index.html` con cualquier navegador moderno.
NO necesitás servidor web — funciona directamente desde archivo.

## Estructura
```
index.html          ← Página principal (HTML + referencias)
css/
  style.css         ← Todos los estilos visuales
js/
  appState.js       ← Estado global y constantes de máquinas
  utils.js          ← Helpers de fecha, tema, filtros, toggleSection
  dataSync.js       ← Motor de sincronización y cálculo de datos
  uiUpdates.js      ← Renderizado de KPIs, gauges, tablas
  charts.js         ← Inicialización de Chart.js
  reports.js        ← Smart summaries y exportación PDF
  forms.js          ← Formularios, tema, navegación
  blasting.js       ← Módulo de Voladuras y Análisis Cruce
  wear.js           ← Módulo de Desgaste de piezas
  fleet.js          ← Flota liviana y pesada
  assets.js         ← Imágenes de máquinas en base64
  production.js     ← Producción por turno
  inventory.js      ← Inventario de repuestos
  maintenance.js    ← Plan de mantenimiento
  scales.js         ← Pesómetros / balanzas de cinta
  live.js           ← Turno en vivo
  analytics.js      ← Análisis cruce voladuras→producción
  ai.js             ← Chatbot (Claude API) + análisis imagen (Gemini)
  ai_analysis.js    ← Preview de foto de voladura
  main.js           ← Entry point y navegación entre vistas
```

## IA / Chatbot
- **Chatbot**: usa Claude (Anthropic) automáticamente — no requiere configuración
- **Análisis de imagen (fragmentación)**: requiere API Key de Gemini en Ajustes
- **Análisis de voladuras**: usa Claude automáticamente, Gemini como fallback

## Correcciones aplicadas
- 4 IDs duplicados `alertas-desgaste-panel` → renombrados a IDs únicos por sección
- 22 IDs faltantes → añadidos al HTML (trend-*, header-turno-*, cruce-*, wear-*, panel-resumen-horas)
- Sección "Análisis" (cruce voladuras→producción) añadida al nav y al HTML
- Funciones duplicadas eliminadas (setupTheme, enviarMensajeChatbot, calcularCruceVoladuras)
- Variables duplicadas eliminadas (currentMonth/Year entre appState y utils)
- Chatbot actualizado a Claude API con fallback a Gemini
