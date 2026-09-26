// =============================================================
//  Local media upload — DEV SERVER ONLY (npm run dev)
//
//  Firebase Storage is not enabled on this project, so the CRM's "upload video" box
//  saves the file into public/videos/ instead, web-optimised with ffmpeg:
//  720p, H.264, no audio track (the hero plays muted), faststart. A 15MB WhatsApp clip
//  becomes ~2–4MB. The file then ships with the next deploy like any other static asset.
//
//  configureServer only runs under `vite` (dev) — nothing here exists in the build.
//  Requests are accepted from localhost only.
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const MAX_BYTES = 200 * 1024 * 1024;
const require = createRequire(import.meta.url);

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  try {
    const p = require('ffmpeg-static'); // optionalDependency
    if (p && fs.existsSync(p)) return p;
  } catch { /* not installed */ }
  return null;
}

function transcode(ffmpeg, input, output) {
  return new Promise((resolve) => {
    const args = ['-y', '-i', input,
      '-vf', "scale='min(1280,iw)':-2",   // ≤720p-class width, keeps aspect, even height
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p',
      '-an', '-movflags', '+faststart', output];
    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
    proc.on('close', (code) => resolve(code === 0 ? { ok: true } : { ok: false, error: err.split('\n').slice(-3).join(' ') }));
    proc.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export default function localMediaUpload() {
  return {
    name: 'oneline-local-media-upload',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root || process.cwd();
      const outDir = path.join(root, 'public', 'videos');

      server.middlewares.use('/__local-media-upload', (req, res) => {
        const ip = req.socket.remoteAddress || '';
        if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ip)) return json(res, 403, { ok: false, reason: 'forbidden' });
        if (req.method === 'GET') return json(res, 200, { ok: true, ffmpeg: Boolean(findFfmpeg()) });
        if (req.method !== 'POST') return json(res, 405, { ok: false, reason: 'method' });

        const type = String(req.headers['content-type'] || '');
        if (!/^video\/(mp4|webm|quicktime)$/.test(type)) return json(res, 415, { ok: false, reason: 'type' });
        const rawName = decodeURIComponent(String(req.headers['x-file-name'] || 'video'));
        const base = rawName.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).toLowerCase() || 'video';

        const tmpIn = path.join(os.tmpdir(), `oneline-upload-${Date.now()}${path.extname(rawName) || '.mp4'}`);
        const out = fs.createWriteStream(tmpIn);
        let size = 0;
        let aborted = false;
        req.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES && !aborted) { aborted = true; req.destroy(); out.destroy(); fs.rm(tmpIn, () => {}); json(res, 413, { ok: false, reason: 'size' }); }
        });
        req.pipe(out);
        out.on('finish', async () => {
          if (aborted) return;
          fs.mkdirSync(outDir, { recursive: true });
          const fileName = `${base}-${Date.now().toString(36)}.mp4`;
          const target = path.join(outDir, fileName);
          const ffmpeg = findFfmpeg();
          let optimised = false;
          if (ffmpeg) {
            const r = await transcode(ffmpeg, tmpIn, target);
            optimised = r.ok;
            if (!r.ok) server.config.logger.warn(`[local-media] ffmpeg failed, keeping original: ${r.error}`);
          }
          if (!optimised) {
            if (type !== 'video/mp4') { fs.rm(tmpIn, () => {}); return json(res, 422, { ok: false, reason: 'needs-ffmpeg' }); }
            fs.copyFileSync(tmpIn, target);
          }
          fs.rm(tmpIn, () => {});
          const bytesOut = fs.statSync(target).size;
          server.config.logger.info(`[local-media] saved public/videos/${fileName} (${(size / 1048576).toFixed(1)}MB → ${(bytesOut / 1048576).toFixed(1)}MB)`);
          json(res, 200, { ok: true, url: `/videos/${fileName}`, bytesIn: size, bytesOut, optimised });
        });
        out.on('error', (e) => json(res, 500, { ok: false, reason: e.message }));
      });
    }
  };
}
