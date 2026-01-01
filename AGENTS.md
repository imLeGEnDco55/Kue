# AGENTS.md - Guía para Agentes de IA

Este documento contiene instrucciones para agentes de IA que trabajen en el proyecto KueStudio.

---

## 📋 Resumen del Proyecto

**KueStudio** es una PWA para crear "Kues" (puntos de corte temporales) sobre audio, diseñada para crear contenido audiovisual y/o generar prompts optimizados para IAs de video como Veo 3.1.

### Concepto Core
```
Audio → Marcar tiempos → Escribir descripciones → Exportar
```

### No es
- Un editor de video completo
- Una herramienta de edición de audio
- Un generador de video (solo puede preparar los prompts)

---

## 🏗️ Arquitectura

### State Management
```typescript
// Zustand store en: src/store/useProjectStore.ts
// Estado principal:
- segments: Segment[]        // Los Kues
- isRecording: boolean       // Modo grabación activo
- activeSegmentStart: number // Inicio del Kue actual
- currentTime: number        // Tiempo de reproducción
- isPlaying: boolean         // Estado de reproducción
```

### Persistencia
```typescript
// Dexie.js en: src/db.ts
// IndexedDB local, no hay backend
// Los proyectos se guardan con:
- audioBlob: Blob           // El archivo de audio completo
- segments: Segment[]       // Los Kues del proyecto
```

### Componentes Clave
| Componente | Responsabilidad |
|------------|-----------------|
| `App.tsx` | Routing entre HOME/EDITOR, lógica de corte |
| `SegmentList.tsx` | UI de lista de Kues, copiar, colores |
| `Waveform.tsx` | Visualización de audio con regions |
| `StoryboardPlayer.tsx` | Muestra imágenes sincronizadas |
| `ExportModal.tsx` | Genera JSON/CSV/Guión |

---

## 🎯 Prioridades de Diseño

### 1. Mobile-First
- El usuario principal usa la app en **móvil**
- Pantalla completa para waveform/storyboard
- Panel deslizable (drawer) para editar Kues
- Gestos táctiles (double-tap, pinch-to-zoom)

### 2. Offline-First
- PWA con Service Worker
- Todo se guarda en IndexedDB local
- No hay backend ni sincronización

### 3. Optimizado para IA
- Duración máxima recomendada: 8 segundos por shot
- Formato de prompt: `"Cinematic shot, [descripción], duration Xs"`
- Advertencias automáticas para shots largos

---

## ⚠️ Cosas que NO Hacer

1. **No agregar backend/servidor**
   - Es una herramienta local/personal
   - No hay cuentas de usuario

2. **No sobre-ingeniar**
   - El objetivo es simple: marcar tiempos + escribir prompts
   - Evitar features como: voice-to-text, LLM integrado, asset library

3. **No romper el flujo móvil**
   - Cualquier UI nueva debe funcionar bien en 375px de ancho
   - Usar drawer en lugar de dividir pantalla

4. **No cambiar el stack sin razón**
   - Zustand funciona bien, no migrar a Redux
   - Dexie.js es suficiente, no agregar SQLite/etc

---

## 🔧 Patrones de Código

### Agregar un nuevo campo a Segment
```typescript
// 1. Actualizar interface en useProjectStore.ts
export interface Segment {
    id: string;
    start: number;
    end: number;
    note: string;
    color?: string;
    thumbnail?: string;
    // nuevoField?: tipo;  // <- Agregar aquí
}

// 2. Actualizar la función updateSegment si es necesario
// 3. Actualizar SegmentList.tsx para mostrar/editar el campo
```

### Agregar nueva acción al store
```typescript
// En useProjectStore.ts, dentro de create():
nuevaAccion: (param) => {
    set((state) => ({
        // modificar estado
    }));
},
```

### Agregar nuevo formato de exportación
```typescript
// En ExportModal.tsx:
// 1. Agregar al type de activeTab
const [activeTab, setActiveTab] = useState<'json' | 'csv' | 'script' | 'nuevoFormato'>('script');

// 2. Crear función generateNuevoFormato()
// 3. Agregar tab en el UI
// 4. Agregar case en getContent()
```

---

## 🧪 Testing Manual

### Flujo básico
1. Crear proyecto con audio
2. Hacer 3+ cortes
3. Editar notas
4. Cambiar colores
5. Copiar prompt individual
6. Exportar guión IA

### Edge cases
- Borrar el último segmento mientras reproduce
- Hacer corte de <0.1s (debe ignorarse)
- Cargar video muy largo (>30min)
- Zoom extremo en waveform

---

## 📝 Convenciones

### Naming
- Componentes: `PascalCase.tsx`
- Utilidades: `camelCase.ts`
- Stores: `useNombreStore.ts`

### Estilos
- TailwindCSS siempre
- Colores del tema: `neon-purple`, `cyber-gray`, etc.
- Clases responsivas: `md:` para desktop

### Commits (sugerido)
```
feat: descripción corta
fix: descripción del bug
refactor: qué se mejoró
docs: actualización de documentación
```

---

## 🚀 Deploy

```bash
# Build y deploy a GitHub Pages
npm run deploy

# Esto ejecuta:
# 1. npm run build (tsc + vite build + PWA)
# 2. gh-pages -d dist
```

---

## 📞 Contexto del Usuario

El usuario:
- **No es programador** (Product Owner)
- Trabaja principalmente en **móvil**
- Usa la app para crear **videoclips musicales**
- Genera los videos en **IA video generators** externamente

Al proponer cambios, siempre pensar:
- ¿Mejora el flujo en móvil?
- ¿Simplifica el camino hacia IA video generators?
- ¿Es realmente necesario o es over-engineering?

---

*Última actualización: Enero 2026 - v1.0.4*
