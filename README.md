<p align="center">
  <img src="public/logo.png" alt="KueStudio Logo" width="120" />
</p>

<h1 align="center">KueStudio</h1>

<p align="center">
  <strong>Editor de tiempos para generación de video con IA</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-8b5cf6?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/PWA-Ready-10b981?style=for-the-badge" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/Veo_3.1-Optimized-f59e0b?style=for-the-badge" alt="Veo Ready" />
</p>

---

## 🎬 ¿Qué es KueStudio?

KueStudio es una **Progressive Web App (PWA)** diseñada para crear "Kues" (puntos de corte con tiempo) sobre archivos de audio. Ideal para:

- 🎵 **Productores musicales** que crean videoclips
- 🎬 **Creadores de contenido** que sincronizan imágenes con música
- 🤖 **Usuarios de IA generativa** (Veo 3.1, Runway, etc.) que necesitan prompts por segmento

### El Problema que Resuelve

Cuando generas un video con IA como Veo 3.1, necesitas:
1. Dividir tu audio en segmentos de X segundos
2. Escribir un prompt visual para cada segmento
3. Copiar cada prompt con la duración exacta

**KueStudio automatiza este flujo**, permitiéndote marcar tiempos mientras escuchas y exportar todo listo para la IA.

---

## ✨ Features

### Core
| Feature | Descripción |
|---------|-------------|
| 📍 **Marcado de Kues** | Crea cortes en tiempo real mientras reproduces |
| ✂️ **Cortes Intermedios** | Divide segmentos existentes en cualquier punto |
| 🎨 **Colores Personalizables** | Diferencia visualmente cada Kue |
| 🖼️ **Storyboard** | Sube imágenes para cada segmento |
| ⏱️ **Precisión Milisegundos** | Tiempos exactos (MM:SS.mmm) |

### Optimizado para IA
| Feature | Descripción |
|---------|-------------|
| 📋 **Copiar para Veo** | Un tap = prompt formateado listo para pegar |
| 📤 **Export Guión IA** | Archivo .txt con todos los shots, duraciones y tips |
| ⚠️ **Advertencias** | Alerta si un shot excede 8s (límite de Veo) |
| 🎯 **Frames Calculados** | Muestra frames @24fps automáticamente |

### Mobile-First
| Feature | Descripción |
|---------|-------------|
| 📱 **PWA Instalable** | Funciona offline, icono en home screen |
| 👆 **Double-tap** | Play/Pause tocando dos veces |
| 📜 **Panel Deslizable** | Drawer desde abajo para editar Kues |
| 🔍 **Pinch-to-Zoom** | Zoom en waveform pellizcando |

---

## 🚀 Instalación

### Usar Online (Recomendado)
```
https://imlegendco55.github.io/Kue/
```

### Instalar como App
1. Abre la URL en Chrome/Safari
2. **Chrome**: Menú → "Añadir a pantalla de inicio"
3. **Safari iOS**: Compartir → "Añadir a inicio"

### Desarrollo Local
```bash
# Clonar
git clone https://github.com/imLeGEnDco55/Kue.git
cd Kue

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build

# Deploy a GitHub Pages
npm run deploy
```

---

## 📖 Flujo de Trabajo

### 1. Crear Proyecto
```
Home → + NUEVO PROYECTO → Seleccionar audio/video
```

### 2. Marcar Kues
```
▶️ Play → ⚡ INICIAR (comienza grabación)
→ ✂️ CORTAR (cierra segmento, abre el siguiente)
→ Repetir...
→ ⏹️ Pausar para terminar
```

### 3. Editar Prompts
```
En cada Kue → Escribe el prompt visual
Ejemplo: "Close-up of a girl dancing, neon lights, slow motion"
```

### 4. Exportar para Veo
**Opción A: Individual**
```
Toca 📋 en cada Kue → Pega en Veo → Genera
```

**Opción B: Batch**
```
📤 Exportar → Guión IA → Descargar .txt
```

---

## 🛠️ Tech Stack

| Tecnología | Uso |
|------------|-----|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Zustand** | State Management |
| **Dexie.js** | IndexedDB (persistencia local) |
| **Wavesurfer.js** | Waveform + Regions |
| **TailwindCSS** | Styling |
| **Vite-PWA** | Service Worker + Manifest |
| **Lucide React** | Icons |

---

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── Editor/
│   │   └── SegmentList.tsx     # Lista de Kues con copiar/color/imagen
│   ├── Player/
│   │   ├── VideoMonitor.tsx    # Reproduce audio (hidden)
│   │   └── StoryboardPlayer.tsx # Muestra imágenes sincronizadas
│   ├── Timeline/
│   │   └── Waveform.tsx        # Waveform con regiones
│   └── UI/
│       ├── Toast.tsx           # Notificaciones
│       ├── ExportModal.tsx     # Modal de exportación
│       └── MobileDrawer.tsx    # Panel deslizable móvil
├── store/
│   └── useProjectStore.ts      # Estado global (Zustand)
├── utils/
│   ├── audioAnalysis.ts        # BPM detection, formatTime
│   └── videoThumbnail.ts       # Captura de frames
├── db.ts                       # Dexie.js config
├── App.tsx                     # Componente principal
└── main.tsx                    # Entry point
```

---

## 🎨 Diseño

- **Tema**: Cyberpunk/Dark Mode
- **Color Principal**: `#8b5cf6` (Neon Purple)
- **Fondo**: `#0f0f1a` (Deep Dark)
- **Acento Secundario**: Pink/Amber para warnings

---

## 📄 Licencia

MIT License - Usa libremente para proyectos personales y comerciales.

---

## 🙏 Créditos

Desarrollado con 💜 por **elWaiEle - imLeGEnDco**

Con la ayuda de **Antigravity AI** (Google DeepMind)
ChatGPT 5 / Claude Opus 4.5 / Gémini 3 Pro

---

<p align="center">
  <strong>¡Feliz creación de videoclips! 🎬</strong>
</p>
