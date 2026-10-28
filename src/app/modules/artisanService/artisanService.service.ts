import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IArtisanService } from './artisanService.interface';
import { ArtisanService } from './artisanService.model';
import { Service } from '../service/service.model';
import { Category } from '../category/category.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';

const createArtisanService = async (
  artisanId: string,
  payload: {
    service: string;
    rateAmount: number;
    rateType: 'HOURLY' | 'DAILY';
    isActive?: boolean;
  },
): Promise<IArtisanService> => {
  if (!mongoose.Types.ObjectId.isValid(artisanId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
  }
  if (!mongoose.Types.ObjectId.isValid(payload.service)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');
  }

  // 1. Verify artisan profile exists
  const artisan = await User.findById(artisanId);
  if (!artisan) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan not found');
  }

  // 2. Verify service exists in catalog
  const service = await Service.findById(payload.service);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Selected catalog service does not exist');
  }

  // 3. Requirement: Validate service is active
  if (!service.isActive) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The selected service is currently inactive in the catalog and cannot be selected',
    );
  }

  // 4. Requirement: Validate service category is active
  const category = await Category.findById(service.category);
  if (!category || !category.isActive) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The category of the selected service is currently inactive and cannot be selected',
    );
  }

  // 5. Requirement: Prevent duplicate service selections for the same artisan
  const existingSelection = await ArtisanService.findOne({
    artisan: artisanId,
    service: payload.service,
  });
  if (existingSelection) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'You have already selected and configured this service in your profile',
    );
  }

  // 6. Requirement: Store selection in separate collection, never modify catalog service
  const result = await ArtisanService.create({
    artisan: artisanId,
    service: payload.service,
    rateAmount: payload.rateAmount,
    rateType: payload.rateType,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  // Also sync to User profile services array for seamless backward compatibility
  try {
    await User.findByIdAndUpdate(artisanId, {
      $push: {
        services: {
          category: service.category,
          serviceName: service.name,
          rateType: payload.rateType === 'DAILY' ? 'daily' : 'hourly',
          rate: payload.rateAmount,
          description: service.description || '',
        },
      },
    });
  } catch (syncErr) {
    // Non-blocking sync
  }

  return await result.populate({
    path: 'service',
    populate: { path: 'category', select: 'name slug image isActive' },
  });
};

const getMyServices = async (artisanId: string) => {
  if (!mongoose.Types.ObjectId.isValid(artisanId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
  }

  const services = await ArtisanService.find({ artisan: artisanId })
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    })
    .sort({ createdAt: -1 });

  return services;
};

const getArtisanServices = async (artisanId: string) => {
  if (!mongoose.Types.ObjectId.isValid(artisanId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
  }

  // Only return active services for clients/public view
  const services = await ArtisanService.find({
    artisan: artisanId,
    isActive: true,
  })
    .populate({
      path: 'service',
      match: { isActive: true },
      populate: {
        path: 'category',
        match: { isActive: true },
        select: 'name slug image isActive',
      },
    })
    .sort({ rateAmount: 1 });

  // Filter out any where service or category might be inactive
  return services.filter(s => s.service && (s.service as any).category);
};

const getAllArtisanServices = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {};

  if (query.artisan) {
    if (!mongoose.Types.ObjectId.isValid(query.artisan as string)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
    }
    filter.artisan = query.artisan;
  }

  if (query.service) {
    if (!mongoose.Types.ObjectId.isValid(query.service as string)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid service ID');
    }
    filter.service = query.service;
  }

  if (query.rateType) {
    filter.rateType = query.rateType;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const results = await ArtisanService.find(filter)
    .populate('artisan', 'name email profileImage trade location phoneNumber businessName identityStatus verified')
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    })
    .sort({ createdAt: -1 });

  return results;
};

const getSingleArtisanService = async (id: string): Promise<IArtisanService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const result = await ArtisanService.findById(id)
    .populate('artisan', 'name email profileImage trade location phoneNumber businessName identityStatus verified')
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan service selection not found');
  }

  return result;
};

const updateArtisanService = async (
  id: string,
  userId: string,
  userRole: string,
  payload: {
    rateAmount?: number;
    rateType?: 'HOURLY' | 'DAILY';
    isActive?: boolean;
  },
): Promise<IArtisanService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const artisanService = await ArtisanService.findById(id);
  if (!artisanService) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan service selection not found');
  }

  const isOwner = artisanService.artisan.toString() === userId;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(userRole as any);

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this service selection',
    );
  }

  // If activating, verify underlying catalog service and category are still active
  if (payload.isActive === true) {
    const service = await Service.findById(artisanService.service);
    if (!service || !service.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot activate: the catalog service is currently deactivated by admin',
      );
    }
    const category = await Category.findById(service.category);
    if (!category || !category.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot activate: the category for this service is currently deactivated by admin',
      );
    }
  }

  // Never modifies the catalog service! Only updates the artisan's selection
  const updateData: Partial<IArtisanService> = {};
  if (payload.rateAmount !== undefined) updateData.rateAmount = payload.rateAmount;
  if (payload.rateType !== undefined) updateData.rateType = payload.rateType;
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

  const result = await ArtisanService.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate({
    path: 'service',
    populate: { path: 'category', select: 'name slug image isActive' },
  });

  // Sync rate changes to User.services
  if (result && result.service && (payload.rateAmount !== undefined || payload.rateType !== undefined)) {
    try {
      const sName = (result.service as any).name;
      const setObj: Record<string, any> = {};
      if (payload.rateAmount !== undefined) setObj['services.$.rate'] = payload.rateAmount;
      if (payload.rateType !== undefined) setObj['services.$.rateType'] = payload.rateType === 'DAILY' ? 'daily' : 'hourly';
      await User.updateOne(
        { _id: artisanService.artisan, 'services.serviceName': sName },
        { $set: setObj },
      );
    } catch (e) {
      // non-blocking
    }
  }

  return result;
};

const deleteArtisanService = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<IArtisanService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const artisanService = await ArtisanService.findById(id).populate('service');
  if (!artisanService) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan service selection not found');
  }

  const isOwner = artisanService.artisan.toString() === userId;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(userRole as any);

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to remove this service selection',
    );
  }

  // Sync remove from User.services
  if (artisanService.service) {
    try {
      const sName = (artisanService.service as any).name;
      await User.findByIdAndUpdate(artisanService.artisan, {
        $pull: { services: { serviceName: sName } },
      });
    } catch (e) {
      // non-blocking
    }
  }

  const result = await ArtisanService.findByIdAndDelete(id);
  return result;
};

export const ArtisanServiceServices = {
  createArtisanService,
  getMyServices,
  getArtisanServices,
  getAllArtisanServices,
  getSingleArtisanService,
  updateArtisanService,
  deleteArtisanService,
};
