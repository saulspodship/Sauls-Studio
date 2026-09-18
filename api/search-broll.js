// Free Pexels stock-footage search proxy.
// Keep PEXELS_API_KEY in Vercel Environment Variables only — never in browser code.

function text(value, fallback = '') {
  return String(value || fallback).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function requestValue(req, name) {
  const queryValue = req.query?.[name];
  if (typeof queryValue === 'string') return queryValue;
  try {
    return new URL(req.url || '', 'https://studio.saulspodship.com').searchParams.get(name) || '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }

  const query = text(requestValue(req, 'q'), 'biblical landscape');
  const requestedOrientation = text(requestValue(req, 'orientation'), 'portrait').toLowerCase();
  const orientation = requestedOrientation === 'landscape' ? 'landscape' : 'portrait';
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Free Pexels search needs a PEXELS_API_KEY in Vercel Environment Variables.',
      code: 'PEXELS_KEY_REQUIRED',
      setupUrl: 'https://www.pexels.com/api/'
    });
  }

  try {
    const endpoint = new URL('https://api.pexels.com/videos/search');
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('orientation', orientation);
    endpoint.searchParams.set('size', 'medium');
    endpoint.searchParams.set('per_page', '9');

    const response = await fetch(endpoint, {
      headers: { Authorization: apiKey, 'User-Agent': 'Sauls-Podship-Studio/1.0' }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = text(payload?.error || payload?.message, `Pexels returned ${response.status}.`);
      return res.status(response.status).json({ error: message || `Pexels returned ${response.status}.` });
    }

    const videos = Array.isArray(payload.videos) ? payload.videos : [];
    const results = videos.map((video) => {
      const files = Array.isArray(video.video_files) ? video.video_files : [];
      const preferred = files
        .filter((file) => file.file_type === 'video/mp4')
        .sort((a, b) => Math.abs((a.width || 0) - 1080) - Math.abs((b.width || 0) - 1080))[0] || files[0] || {};
      const picture = Array.isArray(video.video_pictures) ? video.video_pictures[0]?.picture : '';
      return {
        id: video.id,
        title: text(video.user?.name, 'Pexels contributor'),
        contributor: text(video.user?.name, 'Pexels contributor'),
        duration: Number(video.duration || 0),
        width: Number(video.width || 0),
        height: Number(video.height || 0),
        pageUrl: String(video.url || 'https://www.pexels.com/videos/'),
        previewImage: String(picture || ''),
        videoUrl: String(preferred.link || '')
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ source: 'Pexels', query, orientation, results });
  } catch (error) {
    return res.status(502).json({ error: `Pexels search could not be completed: ${text(error?.message, 'Unknown error')}` });
  }
}
