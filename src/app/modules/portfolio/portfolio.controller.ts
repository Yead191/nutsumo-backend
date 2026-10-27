import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PortfolioServices } from './portfolio.service';

const createPortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.createPortfolioItem(req.user.id, req.body);
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
  const result = await PortfolioServices.getArtisanPortfolio(req.params.artisanId);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Artisan portfolio fetched successfully',
    data: result,
  });
});

const getSinglePortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.getSinglePortfolioItem(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Portfolio item fetched successfully',
    data: result,
  });
});

const updatePortfolioItem = catchAsync(async (req: Request, res: Response) => {
  const result = await PortfolioServices.updatePortfolioItem(
    req.user.id,
    req.params.id,
    req.body,
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
