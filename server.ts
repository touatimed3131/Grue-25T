import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyoAIMDxOENvDKSBhxAU3A408RPdU67Inr3M5SQsmT2r-_H70Vv6G6ePvZfg2XigDJU/exec';

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.get('/api/gas', async (req, res) => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const targetUrl = qs ? `${GAS_WEB_APP_URL}?${qs}` : GAS_WEB_APP_URL;

      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json({ ok: true, data: json });
      } catch {
        const errMatch = text.match(/class="errorMessage"[^>]*>([^<]+)</i);
        const upstreamError = errMatch ? errMatch[1].trim() : 'Upstream GAS returned non-JSON response';
        return res.status(200).json({
          ok: false,
          upstreamError,
          status: response.status,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error reaching GAS';
      return res.status(502).json({ ok: false, error: message });
    }
  });

  app.post('/api/gas', async (req, res) => {
    try {
      const payload = req.body;
      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json({ ok: true, data: json });
      } catch {
        const errMatch = text.match(/class="errorMessage"[^>]*>([^<]+)</i);
        const upstreamError = errMatch ? errMatch[1].trim() : 'Upstream GAS returned non-JSON response';
        return res.status(200).json({
          ok: false,
          upstreamError,
          status: response.status,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error posting to GAS';
      return res.status(502).json({ ok: false, error: message });
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, languageHint } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        languageHint?: string;
      };

      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      let cleanBase64 = audioBase64;
      let resolvedMime = mimeType || 'audio/webm';
      const dataUrlMatch = audioBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        resolvedMime = dataUrlMatch[1].split(';')[0];
        cleanBase64 = dataUrlMatch[2];
      }

      const promptText =
        languageHint === 'ar'
          ? 'Transcribe this crane driver voice note accurately. The speaker may speak Algerian Arabic (Darja), Modern Standard Arabic, or French. Output only the clean transcription text.'
          : 'Transcribe this crane operator voice note accurately. It may contain French, Algerian Arabic (Darja), or English terminology related to crane lifting and construction sites. Output only the clean transcription text.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMime,
                data: cleanBase64,
              },
            },
            { text: promptText },
          ],
        },
      });

      const transcription = (response.text ?? '').trim();
      return res.status(200).json({ transcription });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio transcription failed';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Grue 25T server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
