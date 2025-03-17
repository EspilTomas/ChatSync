# Chat en Tiempo Real con WebSockets

Aplicación de chat en tiempo real con WebSocket que permite la comunicación instantánea entre usuarios, salas de chat personalizadas y estado de conexión en vivo.

## Características

- 💬 Comunicación instantánea entre usuarios
- 🔄 Estado de conexión en tiempo real
- 👤 Nombres de usuario personalizados
- 🚪 Salas de chat personalizadas
- ⌨️ Indicador de escritura
- 👥 Lista de usuarios en línea
- 📱 Diseño responsive

## Requisitos

- Node.js (v14 o superior)
- npm (v6 o superior)

## Instalación

1. Clona este repositorio o descarga los archivos

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor:
```bash
npm start
```

4. Abre tu navegador y visita `http://localhost:3000`

## Estructura del Proyecto

```
├── server.js          # Servidor WebSocket y Express
├── package.json       # Configuración del proyecto
├── public/            # Archivos estáticos
│   ├── index.html     # Interfaz de usuario
│   └── style.css      # Estilos CSS
```

## Cómo usar

1. Abre la aplicación en tu navegador
2. Establece un nombre de usuario personalizado
3. Únete a una sala existente o crea una nueva
4. ¡Comienza a chatear con otros usuarios!

## Tecnologías

- **Backend**: Node.js, Express, ws (WebSocket)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Identificadores**: UUID para IDs únicos

## Personalización

- Puedes modificar los estilos en `public/style.css`
- Añadir nuevas funcionalidades en `server.js`
- Personalizar la interfaz de usuario en `public/index.html`

## Licencia

Este proyecto está bajo la Licencia MIT.
