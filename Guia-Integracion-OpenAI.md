# Guía de Integración con OpenAI

Esta guía explica cómo configurar la integración con OpenAI en el chat.

## Requisitos Previos

1. Node.js y npm instalados
2. Una clave API de OpenAI (puedes obtenerla en [OpenAI Platform](https://platform.openai.com/api-keys))

## Configuración

### 1. Configurar el archivo .env

El proyecto usa variables de entorno para gestionar las claves API y otras configuraciones. Crea un archivo llamado `.env` en la raíz del proyecto con el siguiente contenido:

```
# Configuración para API de OpenAI
OPENAI_API_KEY=tu-clave-api-de-openai

# Configuración del servidor
PORT=3000
```

**Nota:** Asegúrate de reemplazar `tu-clave-api-de-openai` con tu clave API real de OpenAI.

### 2. Instalar dependencias adicionales

El proyecto requiere algunas dependencias adicionales para la integración con OpenAI:

```bash
npm install node-fetch@2
```

## Uso

Para utilizar el asistente de IA en el chat:

1. Escribe `!gpt` seguido de tu pregunta o solicitud
2. Ejemplos:
   - `!gpt ¿Cuál es la capital de Francia?`
   - `!gpt Escribe un poema corto sobre la primavera`
   - `!gpt ¿Cómo puedo aprender a programar?`

## Modo de simulación

Si no se proporciona una clave API válida en el archivo `.env`, el sistema funcionará en modo de simulación, proporcionando respuestas predefinidas basadas en palabras clave en las consultas.

## Personalización

Puedes modificar la integración con OpenAI en los siguientes archivos:

- **server.js**: Contiene la función `getOpenAIResponse` que realiza la llamada a la API
- **chat-client.js**: Maneja la presentación de las respuestas de la IA en la interfaz

### Cambiar el modelo de OpenAI

Para cambiar el modelo de OpenAI (por ejemplo, de gpt-3.5-turbo a gpt-4), modifica la siguiente línea en `server.js`:

```javascript
model: "gpt-3.5-turbo",
```

### Cambiar la personalidad del asistente

Para modificar la personalidad del asistente, cambia el mensaje del sistema en `server.js`:

```javascript
{ role: "system", content: "Eres un asistente amigable llamado GPT Assistant. Responde de manera concisa, útil e informativa. Limita tus respuestas a 150 palabras." },
```

## Problemas comunes

- **Error de autenticación**: Verifica que la clave API sea correcta y esté correctamente formateada
- **Límites de tasa**: Las APIs de OpenAI tienen límites. Si recibes errores 429, estás haciendo demasiadas solicitudes
- **Costos**: Ten en cuenta que el uso de la API de OpenAI genera costos según su [estructura de precios](https://openai.com/pricing)

## Recursos

- [Documentación de OpenAI](https://platform.openai.com/docs/api-reference)
- [Guía de prompts](https://platform.openai.com/docs/guides/prompt-engineering)