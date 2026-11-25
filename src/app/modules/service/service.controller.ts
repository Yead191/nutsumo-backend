import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ServiceServices } from './service.service';
import { getSingleFilePath } from '../../../shared/getFilePath';
import { revalidateFrontend } from '../../../helpers/revalidateFrontend';
import { Service } from './service.model';

// Cache tags used by the Next.js frontend for service data.
const serviceCacheTags = (...categoryIds: unknown[]) => [
  'services',
  ...categoryIds
    .filter(Boolean)
    .map(id => `category-services-${String((id as any)?._id ?? id)}`),
];

const createService = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const result = await ServiceServices.createService(data);
  revalidateFrontend(serviceCacheTags((result as any)?.category));
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Service created successfully',
    data: result,
  });
});

const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.getAllServices(req.user, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Services fetched successfully',
    data: result.services,
    pagination: result.pagination,
  });
});

const getSingleService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.getSingleService(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service fetched successfully',
    data: result,
  });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const image = getSingleFilePath(req.files, 'image');
  if (image) {
    data.image = image;
  }
  const before = await Service.findById(req.params.id).select('category').lean();
  const result = await ServiceServices.updateService(req.params.id, data);
  revalidateFrontend([
    ...serviceCacheTags(before?.category, (result as any)?.category),
    `service-${req.params.id}`,
  ]);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.deleteService(req.params.id);
  revalidateFrontend([
    ...serviceCacheTags((result as any)?.category),
    `service-${req.params.id}`,
  ]);
  return sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully',
    data: result,
  });
});

export const ServiceController = {
  createService,
  getAllServices,
  getSingleService,
  updateService,
  deleteService,
};
