// api/transcribe.js
import Busboy from 'busboy';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error('Clave de OpenAI no configurada');

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

    if (!fileBuffer) throw new Error('No se recibió archivo');

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: fileMimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text || '' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Error al transcribir' });
  }
}
