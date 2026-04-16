# # 🧠 Visualizador de IA Neuronal — Grafo de Conocimiento 3D

Una herramienta web poderosa para visualizar redes neuronales y grafos de conocimiento en entornos 3D interactivos. Construida con tecnologías web modernas para proporcionar una exploración intuitiva de modelos de IA complejos y relaciones de datos.

## ✨ Características

- **Visualización 3D**: Renderizado 3D interactivo de redes neuronales y grafos de conocimiento
- **Exploración en Tiempo Real**: Navegación dinámica a través de nodos y conexiones
- **Vistas Personalizables**: Múltiples modos de visualización y opciones de estilo
- **Basada en Web**: Sin instalación requerida, se ejecuta directamente en tu navegador
- **Diseño Responsivo**: Funciona perfectamente en escritorio y dispositivos móviles

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/MoralesMeridaxtzv1/Neuronal-Red.git
   cd neural-ai-viz
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```

4. Abre tu navegador y navega a `http://localhost:3000`

## 📖 Uso

1. Sube tu modelo de red neuronal o datos de grafo de conocimiento
2. Selecciona tu modo de visualización preferido
3. Interactúa con el grafo 3D:
   - Haz clic y arrastra para rotar la vista
   - Desplaza para hacer zoom
   - Pasa el mouse sobre los nodos para información detallada
   - Haz clic en los nodos para explorar conexiones

## 🛠️ Desarrollo

### Estructura del Proyecto

```
neural-ai-viz/
├── server.js          # Servidor backend
├── public/
│   ├── index.html     # Página HTML principal
│   └── script.js      # JavaScript frontend
├── package.json       # Dependencias del proyecto
└── README.md          # Este archivo
```

### Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm test` - Ejecuta las pruebas
- `npm run build` - Construye para producción

## 🤝 Contribuyendo

¡Las contribuciones son bienvenidas! Siéntete libre de enviar un Pull Request.

1. Haz fork del proyecto
2. Crea tu rama de características (`git checkout -b feature/CaracteristicaIncreible`)
3. Confirma tus cambios (`git commit -m 'Agrega alguna CaracteristicaIncreible'`)
4. Empuja a la rama (`git push origin feature/CaracteristicaIncreible`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

- **Autor**: MoralesMeridaxtzv1
- **GitHub**: [https://github.com/MoralesMeridaxtzv1/Neuronal-Red](https://github.com/MoralesMeridaxtzv1/Neuronal-Red)

---

⭐ ¡Si encuentras útil este proyecto, por favor dale una estrella!

> Visualización 3D futurista de redes neuronales generadas por IA en tiempo real.

---

## ✨ Vista previa

Un prompt → texto generado por IA → palabras clave extraídas → **grafo 3D animado** con:
- Nodos pulsantes con glow
- Partículas flotantes (neuronas de fondo)
- Líneas de conexión dinámicas
- Partículas de señal viajando por los edges
- Cámara orbitando con suavizado
- Interacción con mouse/touch

---

## 🗂️ Estructura del proyecto

```
neural-ai-viz/
├── server.js          ← Backend Express (Node.js)
├── package.json       ← Dependencias
├── README.md          ← Este archivo
└── public/
    ├── index.html     ← Frontend (UI panel)
    └── script.js      ← Three.js 3D engine
```

---

## 🚀 Instalación y ejecución

### 1. Clonar / descargar el proyecto

```bash
# Si tienes git:
git clone <URL_DEL_REPO>
cd neural-ai-viz

# O simplemente coloca los archivos en una carpeta
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor

```bash
# Modo normal:
npm start

# Modo desarrollo (auto-recarga):
npm run dev
```

### 4. Abrir en el navegador

```
http://localhost:3000
```

---

## 🔧 Configuración

### Modo simulado (sin API key) — funciona de inmediato
El servidor incluye un generador de texto simulado. No necesitas ninguna API key.

### Modo OpenAI GPT-4o-mini (opcional)
1. En la interfaz, marca la casilla **"Usar OpenAI GPT-4o-mini"**
2. Introduce tu API key (`sk-...`)
3. La key se envía al backend solo durante la petición (no se almacena)

Para usar la API de OpenAI directamente en el servidor (sin UI toggle):
```bash
OPENAI_API_KEY=sk-tu-clave node server.js
```

---

## 🎮 Controles

| Acción           | Descripción                     |
|------------------|---------------------------------|
| **Click + drag** | Rotar la cámara 3D              |
| **Rueda ratón**  | Zoom in / out                   |
| **Touch drag**   | Rotar (móvil)                   |
| **Pinch**        | Zoom (móvil)                    |
| **Enter**        | Generar (desde el textarea)     |

---

## 🛠️ Tecnologías

| Capa       | Tecnología                  |
|------------|-----------------------------|
| Frontend   | Three.js r128, HTML5, CSS3  |
| Backend    | Node.js, Express 4          |
| IA         | OpenAI GPT-4o-mini / Simulado |
| Gráficos   | WebGL, Canvas 2D (sprites)  |

---

## 📡 API del backend

### `POST /generate`

**Body:**
```json
{
  "prompt": "inteligencia artificial",
  "useOpenAI": false,
  "apiKey": null
}
```

**Response:**
```json
{
  "text": "Texto generado...",
  "keywords": ["inteligencia", "artificial", "neural", ...],
  "nodes": [{ "id": 0, "label": "inteligencia", "weight": 0.8, "group": 2 }],
  "edges": [{ "source": 0, "target": 1, "strength": 0.9 }],
  "mode": "simulated"
}
```

---

## 🔮 Posibles extensiones

- [ ] Embeddings reales para conexiones por similitud semántica
- [ ] Post-processing Three.js (UnrealBloomPass) para bloom real
- [ ] WebSockets para generación en streaming
- [ ] Guardar/exportar el grafo como PNG o JSON
- [ ] Modo VR con WebXR

---

## ⚡ Requisitos

- Node.js v18+
- Navegador moderno con WebGL 2 (Chrome, Firefox, Edge, Safari)#
