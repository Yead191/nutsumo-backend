import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ArtisanProfileServices } from './artisanProfile.service';

const upsertMyArtisanProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ArtisanProfileServices.upsertMyArtisanProfile(
    userId,
    req.body,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan profile saved successfully',
    data: result,
  });
});

const getMyArtisanProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await ArtisanProfileServices.getMyArtisanProfile(userId);

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My artisan profile fetched successfully',
    data: result,
  });
});

const getArtisanProfileById = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanProfileServices.getArtisanProfileById(
    req.params.id,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan profile retrieved successfully',
    data: result,
  });
});

const getArtisanProfileByUserId = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ArtisanProfileServices.getArtisanProfileByUserId(
      req.params.userId,
    );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Artisan profile retrieved successfully',
      data: result,
    });
  },
);

const getAllArtisanProfiles = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ArtisanProfileServices.getAllArtisanProfiles(req.query);

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Artisan profiles fetched successfully',
      data: result.profiles,
      pagination: result.pagination,
    });
  },
);

const updateArtisanProfileByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ArtisanProfileServices.updateArtisanProfileByAdmin(
      req.params.id,
      req.body,
    );

    return sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Artisan profile updated successfully',
      data: result,
    });
  },
);

const deleteArtisanProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ArtisanProfileServices.deleteArtisanProfile(
    req.params.id,
  );

  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan profile deleted successfully',
    data: result,
  });
});

export const ArtisanProfileController = {
  upsertMyArtisanProfile,
  getMyArtisanProfile,
  getArtisanProfileById,
  getArtisanProfileByUserId,
  getAllArtisanProfiles,
  updateArtisanProfileByAdmin,
  deleteArtisanProfile,
};
