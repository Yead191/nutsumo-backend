import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime';

export const fileStreamHandler = async (req: Request, res: Response) => {
  try {
    const { folder, file } = req.params;

    // Resolve file path
    const filePath = path.join(process.cwd(), 'uploads', folder, file);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const contentType = mime.getType(filePath) || 'application/octet-stream';

    // Handle HEAD requests for metadata only
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });
      return res.end();
    }

    const range = req.headers.range;

    if (!range) {
      // Stream entire file
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Parse Range header
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for large files
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

    if (start >= fileSize || end >= fileSize) {
      return res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
    }

    const contentLength = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Connection': 'keep-alive',
    });

    const stream = fs.createReadStream(filePath, { start, end });

    stream.on('open', () => stream.pipe(res));
    stream.on('error', (err) => {
      console.error(`Error streaming file ${filePath}:`, err);
      res.status(500).end('Error streaming file');
    });

  } catch (err) {
    console.error('File stream handler error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
