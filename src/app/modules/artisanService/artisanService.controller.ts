import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ArtisanServiceServices } from './artisanService.service';

const createArtisanService = catchAsync(async (req: Request, res: Response) => {
  const artisanId = req.user.id;
  const result = await ArtisanServiceServices.createArtisanService(
    artisanId,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Service added to artisan profile successfully',
    data: result,
  });
});

const getMyServices = catchAsync(async (req: Request, res: Response) => {
  const artisanId = req.user.id;
  const result = await ArtisanServiceServices.getMyServices(artisanId);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My services fetched successfully',
    data: result,
  });
});

const getArtisanServices = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.getArtisanServices(
    req.params.artisanId,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan services fetched successfully',
    data: result,
  });
});

const getAllArtisanServices = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.getAllArtisanServices(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan services list fetched successfully',
    data: result,
  });
});

const getSingleArtisanService = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.getSingleArtisanService(
    req.params.id,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan service fetched successfully',
    data: result,
  });
});

const updateArtisanService = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.updateArtisanService(
    req.params.id,
    req.user.id,
    req.user.role,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan service updated successfully',
    data: result,
  });
});

const reviewArtisanService = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.reviewArtisanService(
    req.params.id,
    req.body,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      req.body.decision === 'APPROVE'
        ? 'Custom service approved and added to the catalog'
        : 'Custom service rejected',
    data: result,
  });
});

const deleteArtisanService = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanServiceServices.deleteArtisanService(
    req.params.id,
    req.user.id,
    req.user.role,
  );
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan service removed successfully',
    data: result,
  });
});

export const ArtisanServiceController = {
  createArtisanService,
  getMyServices,
  getArtisanServices,
  getAllArtisanServices,
  getSingleArtisanService,
  updateArtisanService,
  deleteArtisanService,
  reviewArtisanService,
};
