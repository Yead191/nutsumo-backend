import { Request } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiError';

interface FileUpload {
  name: string;
  type?: string[];
  maxCount?: number;
}

const fileUploadHandler = (customFile: FileUpload[] = []) => {
  const fileTypeArray: Required<FileUpload>[] = [
    {
      name: 'image',
      type: [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
        'application/octet-stream',
      ],
      maxCount: 3,
    },
    {
      name: 'media',
      type: [
        'video/mp4',
        'video/ogg',
        'video/webm',
        'audio/mpeg',
        'audio/ogg',
        'audio/webm',
        'audio/wav',
      ],
      maxCount: 3,
    },
    {
      name: 'doc',
      type: ['application/pdf'],
      maxCount: 3,
    },
  ];

  // merge custom config
  if (customFile.length) {
    for (const el of customFile) {
      const existingIndex = fileTypeArray.findIndex(f => f.name === el.name);
      const newConfig = {
        name: el.name,
        type: el.type?.length ? el.type : ['*'],
        maxCount: el.maxCount ?? 3,
      };

      if (existingIndex !== -1) {
        fileTypeArray[existingIndex] = newConfig;
      } else {
        fileTypeArray.push(newConfig);
      }
    }
  }

  const baseUploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
  }

  const createDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const config = fileTypeArray.find(f => f.name === file.fieldname);

      if (!config) {
        return cb(
          new ApiError(StatusCodes.BAD_REQUEST, 'Invalid file field'),
          '',
        );
      }

      const uploadDir = path.join(baseUploadDir, config.name);
      createDir(uploadDir);
      cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name =
        path
          .basename(file.originalname, ext)
          .toLowerCase()
          .replace(/\s+/g, '-') +
        '-' +
        Date.now();

      cb(null, name + ext);
    },
  });

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    const config = fileTypeArray.find(f => f.name === file.fieldname);

    if (!config) {
      return cb(new ApiError(StatusCodes.BAD_REQUEST, 'Invalid file field'));
    }

    if (config.type.includes('*') || config.type.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        `Only supports ${config.type.join(', ')}. Received: ${file.mimetype}`,
      ),
    );
  };

  return multer({
    storage,
    fileFilter,
  }).fields(
    fileTypeArray.map(f => ({
      name: f.name,
      maxCount: f.maxCount,
    })),
  );
};

export default fileUploadHandler;
