// api/transcribe.js
import Busboy from 'busboy';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener clave de OpenAI desde variables de entorno
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY no configurada');
      return res.status(500).json({ error: 'Clave de OpenAI no configurada en el servidor' });
    }

    // Leer el archivo enviado
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileMimeType = 'audio/webm';
    let fileName = 'audio.webm';

    await new Promise((resolve, reject) => {
      busboy.on('file', (fieldname, file, info) => {
        const chunks = [];
        fileMimeType = info.mimeType || 'audio/webm';
        fileName = info.filename || 'audio.webm';
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });
      busboy.on('error', reject);
      busboy.on('finish', resolve);
      req.pipe(busboy);
    });

    if (!fileBuffer) {
      console.error('❌ No se recibió archivo');
      return res.status(400).json({ error: 'No se recibió ningún archivo de audio' });
    }

    console.log(`📤 Archivo recibido: ${fileName}, tamaño: ${fileBuffer.length} bytes, tipo: ${fileMimeType}`);

    // Construir FormData para OpenAI
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: fileMimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    // Enviar a OpenAI
    console.log('📤 Enviando a OpenAI...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    // Leer la respuesta
    const responseText = await response.text();
    console.log(`📥 Respuesta de OpenAI: status ${response.status}, body: ${responseText.substring(0, 200)}`);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson?.error?.message || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error('La respuesta de OpenAI no es JSON válido');
    }

    if (!data.text) {
      throw new Error('La respuesta de OpenAI no contiene el campo "text"');
    }

    console.log('✅ Transcripción recibida:', data.text);
    return res.status(200).json({ text: data.text });

  } catch (error) {
    console.error('❌ Error en transcribe:', error);
    return res.status(500).json({ error: error.message || 'Error al transcribir el audio' });
  }
}
