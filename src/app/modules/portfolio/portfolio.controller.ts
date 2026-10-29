import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import {
  getMultipleFilesPath,
  getSingleFilePath,
} from '../../../shared/getFilePath';
import sendResponse from '../../../shared/sendResponse';
import { IPortfolioImage } from './portfolio.interface';
import { PortfolioServices } from './portfolio.service';

interface ExtractedImage {
  filePath: string;
  type?: 'before' | 'after' | 'work';
}

const extractUploadedImages = (req: Request): ExtractedImage[] => {
  const result: ExtractedImage[] = [];

  // Explicit before images
  const beforeFiles = [
    ...(getMultipleFilesPath(req.files, 'beforeImages') || []),
    ...(getMultipleFilesPath(req.files, 'beforeImage') || []),
  ];
  const singleBefore = getSingleFilePath(req.files, 'beforeImage');
  if (singleBefore && !beforeFiles.includes(singleBefore)) {
    beforeFiles.push(singleBefore);
  }
  beforeFiles.forEach(fp => result.push({ filePath: fp, type: 'before' }));

  // Explicit after images
  const afterFiles = [
    ...(getMultipleFilesPath(req.files, 'afterImages') || []),
    ...(getMultipleFilesPath(req.files, 'afterImage') || []),
  ];
  const singleAfter = getSingleFilePath(req.files, 'afterImage');
  if (singleAfter && !afterFiles.includes(singleAfter)) {
    afterFiles.push(singleAfter);
  }
  afterFiles.forEach(fp => result.push({ filePath: fp, type: 'after' }));

  // General images (type assigned from metadata or default 'work')
  const generalFiles = [
    ...(getMultipleFilesPath(req.files, 'images') || []),
    ...(getMultipleFilesPath(req.files, 'image') || []),
    ...(getMultipleFilesPath(req.files, 'workImages') || []),
    ...(getMultipleFilesPath(req.files, 'workImage') || []),
  ];
  const singleGeneral = getSingleFilePath(req.files, 'image');
  if (singleGeneral && !generalFiles.includes(singleGeneral)) {
    generalFiles.push(singleGeneral);
  }
  generalFiles.forEach(fp => result.push({ filePath: fp }));

  return result;
};

const assemblePortfolioImages = (
  rawImagesMeta: any,
  uploaded: ExtractedImage[],
): IPortfolioImage[] => {
  let metaList: any[] = [];
  if (rawImagesMeta) {
    if (Array.isArray(rawImagesMeta)) {
      metaList = rawImagesMeta;
    } else if (typeof rawImagesMeta === 'string') {
      try {
        metaList = JSON.parse(rawImagesMeta);
      } catch {
        metaList = [];
      }
    }
  }

  const finalImages: IPortfolioImage[] = [];
  let uploadIndex = 0;

  for (const item of metaList) {
    if (typeof item === 'string') {
      finalImages.push({ url: item, type: 'work' });
    } else if (item && typeof item === 'object') {
      if (item.url) {
        finalImages.push({
          url: item.url,
          type: item.type || 'work',
        });
      } else if (uploadIndex < uploaded.length) {
        const up = uploaded[uploadIndex++];
        finalImages.push({
          url: up.filePath,
          type: (item.type as any) || up.type || 'work',
        });
      }
    }
  }

  while (uploadIndex < uploaded.length) {
    const up = uploaded[uploadIndex++];
    finalImages.push({
      url: up.filePath,
      type: up.type || 'work',
    });
  }

  return finalImages;
};

const normalizePayload = (body: any) => {
  const data = { ...body };
  if (typeof data.isPublished === 'string') {
    data.isPublished = data.isPublished === 'true';
  }
  return data;
};

const createPortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const data = normalizePayload(req.body);
  const uploadedImages = extractUploadedImages(req);

  data.images = assemblePortfolioImages(data.images, uploadedImages);

  const result = await PortfolioServices.createPortfolioItem(
    req.user.id,
    data,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Portfolio project created successfully',
    data: result,
  });
});

const getMyPortfolio = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.getMyPortfolio(req.user.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My portfolio fetched successfully',
    data: result,
  });
});

const getArtisanPortfolio = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.getArtisanPortfolio(
    req.params.artisanId,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan portfolio fetched successfully',
    data: result,
  });
});

const getSinglePortfolioItem = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PortfolioServices.getSinglePortfolioItem(
      req.params.id,
    );
    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Portfolio item fetched successfully',
      data: result,
    });
  },
);

const updatePortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const data = normalizePayload(req.body);
  const uploadedImages = extractUploadedImages(req);

  data.images = assemblePortfolioImages(data.images, uploadedImages);

  const result = await PortfolioServices.updatePortfolioItem(
    req.user.id,
    req.params.id,
    data,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Portfolio item updated successfully',
    data: result,
  });
});

const deletePortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.deletePortfolioItem(
    req.user.id,
    req.params.id,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Portfolio item deleted successfully',
    data: result,
  });
});

export const PortfolioController = {
  createPortfolioItem,
  getMyPortfolio,
  getArtisanPortfolio,
  getSinglePortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
};
