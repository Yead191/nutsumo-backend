import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IArtisanService } from './artisanService.interface';
import { ArtisanService } from './artisanService.model';
import { Service } from '../service/service.model';
import { Category } from '../category/category.model';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { generateSlug } from '../category/category.service';
import { normalizeServiceName } from './serviceMatch';
import { rebuildArtisanSearchText } from '../artisanProfile/artisanSearch.sync';

const refreshArtisanSearch = (artisanId: unknown) =>
  rebuildArtisanSearchText(String(artisanId || ''));

const populateOffering = (id: mongoose.Types.ObjectId | string) =>
  ArtisanService.findById(id)
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    })
    .populate('category', 'name slug image isActive');

const createArtisanService = async (
  artisanId: string,
  payload: {
    service?: string;
    category?: string;
    customName?: string;
    proposedCategory?: string;
    rateAmount: number;
    rateType: 'HOURLY' | 'DAILY';
    isActive?: boolean;
    description?: string;
  },
): Promise<IArtisanService> => {
  if (payload.service) {
    return createCatalogSelection(artisanId, {
      service: payload.service,
      rateAmount: payload.rateAmount,
      rateType: payload.rateType,
      isActive: payload.isActive,
      description: payload.description,
    });
  }

  return createCustomService(artisanId, {
    category: payload.category || '',
    customName: payload.customName || '',
    proposedCategory: payload.proposedCategory || '',
    rateAmount: payload.rateAmount,
    rateType: payload.rateType,
    isActive: payload.isActive,
    description: payload.description,
  });
};

const createCatalogSelection = async (
  artisanId: string,
  payload: {
    service: string;
    rateAmount: number;
    rateType: 'HOURLY' | 'DAILY';
    isActive?: boolean;
    description?: string;
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
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Selected catalog service does not exist',
    );
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
    source: 'CATALOG',
    service: payload.service,
    category: service.category,
    customName: service.name,
    normalizedName: normalizeServiceName(service.name),
    reviewStatus: 'APPROVED',
    rateAmount: payload.rateAmount,
    rateType: payload.rateType,
    description: payload.description || '',
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  const populated = await populateOffering(result._id);
  if (!populated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save service');
  }
  await refreshArtisanSearch(artisanId);
  return populated;
};

const createCustomService = async (
  artisanId: string,
  payload: {
    category?: string;
    customName: string;
    proposedCategory?: string;
    rateAmount: number;
    rateType: 'HOURLY' | 'DAILY';
    isActive?: boolean;
    description?: string;
  },
): Promise<IArtisanService> => {
  if (!mongoose.Types.ObjectId.isValid(artisanId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
  }

  const artisan = await User.findById(artisanId);
  if (!artisan) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan not found');
  }

  const customName = payload.customName.trim();
  const normalizedName = normalizeServiceName(customName);
  if (!normalizedName) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Custom service name is required');
  }

  const proposedCategory = payload.proposedCategory?.trim() || '';
  let category = null;

  if (payload.category && mongoose.Types.ObjectId.isValid(payload.category)) {
    category = await Category.findById(payload.category);
    if (!category || !category.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Selected category is unavailable',
      );
    }
  } else if (proposedCategory) {
    const activeCategories = await Category.find({ isActive: true }).select('name');
    category =
      activeCategories.find(
        item => normalizeServiceName(item.name) === normalizeServiceName(proposedCategory),
      ) || null;
  }

  if (category) {
    const catalogServices = await Service.find({
      category: category._id,
      isActive: true,
    }).select('name category isActive');

    const officialMatch = catalogServices.find(
      item => normalizeServiceName(item.name) === normalizedName,
    );

    if (officialMatch) {
      return createCatalogSelection(artisanId, {
        service: String(officialMatch._id),
        rateAmount: payload.rateAmount,
        rateType: payload.rateType,
        isActive: payload.isActive,
        description: payload.description,
      });
    }
  }

  const existingCustom = await ArtisanService.findOne({
    artisan: artisanId,
    normalizedName,
    source: 'CUSTOM',
    ...(category
      ? { category: category._id }
      : { $or: [{ category: null }, { category: { $exists: false } }] }),
  });
  if (existingCustom) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'You already offer this custom service',
    );
  }

  const result = await ArtisanService.create({
    artisan: artisanId,
    source: 'CUSTOM',
    category: category?._id,
    proposedCategory: category ? '' : proposedCategory,
    customName,
    normalizedName,
    reviewStatus: 'PENDING_REVIEW',
    rateAmount: payload.rateAmount,
    rateType: payload.rateType,
    description: payload.description || '',
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  const populated = await populateOffering(result._id);
  if (!populated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save service');
  }
  await refreshArtisanSearch(artisanId);
  return populated;
};

const getMyServices = async (artisanId: string) => {
  if (!mongoose.Types.ObjectId.isValid(artisanId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan ID');
  }

  const services = await ArtisanService.find({ artisan: artisanId })
    .populate({
      path: 'service',
      populate: { path: 'category' },
    })
    .populate('category', 'name slug image isActive')
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
    reviewStatus: { $ne: 'REJECTED' },
  })
    .populate({
      path: 'service',
      match: { isActive: true },
      populate: {
        path: 'category',
        match: { isActive: true },
      },
    })
    .populate({
      path: 'category',
      match: { isActive: true },
    });

  return services.filter(item => {
    if ((item.source || 'CATALOG') === 'CUSTOM') {
      return Boolean(item.customName);
    }
    return Boolean(item.service && (item.service as any).category);
  });
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

  if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (typeof query.source === 'string' && query.source) {
    filter.source = query.source;
  }

  if (typeof query.reviewStatus === 'string' && query.reviewStatus) {
    filter.reviewStatus = query.reviewStatus;
  }

  const results = await ArtisanService.find(filter)
    .populate(
      'artisan',
      'name email image trade location phoneNumber businessName identityStatus verified',
    )
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    })
    .populate('category', 'name slug image isActive')
    .sort({ createdAt: -1 });

  return results;
};

const getSingleArtisanService = async (
  id: string,
): Promise<IArtisanService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const result = await ArtisanService.findById(id)
    .populate(
      'artisan',
      'name email image trade location phoneNumber businessName identityStatus verified',
    )
    .populate({
      path: 'service',
      populate: { path: 'category', select: 'name slug image isActive' },
    });

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Artisan service selection not found',
    );
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
    description?: string;
    customName?: string;
  },
): Promise<IArtisanService | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const artisanService = await ArtisanService.findById(id);
  if (!artisanService) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Artisan service selection not found',
    );
  }

  const isOwner = artisanService.artisan.toString() === userId;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    userRole as any,
  );

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this service selection',
    );
  }

  const source = artisanService.source || 'CATALOG';

  if (payload.isActive === true && source !== 'CUSTOM') {
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

  if (payload.isActive === true && source === 'CUSTOM') {
    if (artisanService.reviewStatus === 'REJECTED') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This custom service was rejected. Submit a new one to offer it again',
      );
    }
    const category = await Category.findById(artisanService.category);
    if (!category || !category.isActive) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot activate: the category for this service is currently deactivated by admin',
      );
    }
  }

  // Never modifies the catalog service! Only updates the artisan's selection
  const updateData: Partial<IArtisanService> = {};
  if (payload.rateAmount !== undefined)
    updateData.rateAmount = payload.rateAmount;
  if (payload.rateType !== undefined) updateData.rateType = payload.rateType;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
  if (
    payload.customName &&
    source === 'CUSTOM' &&
    artisanService.reviewStatus !== 'APPROVED'
  ) {
    const customName = payload.customName.trim();
    const normalizedName = normalizeServiceName(customName);
    const duplicate = await ArtisanService.findOne({
      _id: { $ne: artisanService._id },
      artisan: artisanService.artisan,
      category: artisanService.category,
      normalizedName,
      source: 'CUSTOM',
    });
    if (duplicate) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'You already offer this custom service in the selected category',
      );
    }
    updateData.customName = customName;
    updateData.normalizedName = normalizedName;
  }

  const result = await ArtisanService.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate({
    path: 'service',
    populate: { path: 'category', select: 'name slug image isActive' },
  });

  // Sync rate changes to User.services
  if (
    result &&
    result.service &&
    (payload.rateAmount !== undefined || payload.rateType !== undefined)
  ) {
    try {
      const sName = (result.service as any).name;
      const setObj: Record<string, any> = {};
      if (payload.rateAmount !== undefined)
        setObj['services.$.rate'] = payload.rateAmount;
      if (payload.rateType !== undefined)
        setObj['services.$.rateType'] =
          payload.rateType === 'DAILY' ? 'daily' : 'hourly';
      if (payload.description !== undefined)
        setObj['services.$.description'] = payload.description;
      await User.updateOne(
        { _id: artisanService.artisan, 'services.serviceName': sName },
        { $set: setObj },
      );
    } catch (e) {
      // non-blocking
    }
  }

  if (result) await refreshArtisanSearch(result.artisan);
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
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Artisan service selection not found',
    );
  }

  const isOwner = artisanService.artisan.toString() === userId;
  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    userRole as any,
  );

  if (!isOwner && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to remove this service selection',
    );
  }

  const result = await ArtisanService.findByIdAndDelete(id);
  await refreshArtisanSearch(artisanService.artisan);
  return result;
};

const reviewArtisanService = async (
  id: string,
  payload: { decision: 'APPROVE' | 'REJECT'; reason?: string },
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid artisan service ID');
  }

  const offering = await ArtisanService.findById(id);
  if (!offering) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan service not found');
  }
  if (offering.source !== 'CUSTOM') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only custom services need catalog review',
    );
  }

  if (payload.decision === 'REJECT') {
    offering.reviewStatus = 'REJECTED';
    offering.isActive = false;
    offering.rejectionReason = payload.reason?.trim() || '';
    await offering.save();
    await refreshArtisanSearch(offering.artisan);
    return populateOffering(offering._id);
  }

  let category = offering.category
    ? await Category.findById(offering.category)
    : null;

  if (!category && offering.proposedCategory) {
    const proposedName = offering.proposedCategory.trim();
    const activeCategories = await Category.find({ isActive: true }).select('name slug');
    category =
      activeCategories.find(
        item => normalizeServiceName(item.name) === normalizeServiceName(proposedName),
      ) || null;

    if (!category) {
      category = await Category.create({
        name: proposedName,
        slug: generateSlug(proposedName),
        isActive: true,
      });
    }
    offering.category = category._id;
  }

  if (!category || !category.isActive) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot approve a service until it has an active category',
    );
  }

  const normalizedName =
    offering.normalizedName || normalizeServiceName(offering.customName);
  const catalogServices = await Service.find({
    category: category._id,
    isActive: true,
  });
  let catalogService =
    catalogServices.find(
      item => normalizeServiceName(item.name) === normalizedName,
    ) || null;

  if (!catalogService) {
    const slug = generateSlug(offering.customName || 'custom-service');
    try {
      catalogService = await Service.create({
        name: offering.customName,
        slug,
        category: category._id,
        description: offering.description || '',
        isActive: true,
      });
    } catch (error) {
      catalogService = await Service.findOne({ category: category._id, slug });
      if (!catalogService) throw error;
    }
  }

  const alreadyLinked = await ArtisanService.findOne({
    _id: { $ne: offering._id },
    artisan: offering.artisan,
    service: catalogService._id,
  });
  if (alreadyLinked) {
    await ArtisanService.findByIdAndDelete(offering._id);
    await refreshArtisanSearch(offering.artisan);
    return populateOffering(alreadyLinked._id);
  }

  offering.source = 'CATALOG';
  offering.service = catalogService._id;
  offering.reviewStatus = 'APPROVED';
  offering.rejectionReason = '';
  offering.customName = catalogService.name;
  offering.normalizedName = normalizeServiceName(catalogService.name);
  await offering.save();
  await refreshArtisanSearch(offering.artisan);

  return populateOffering(offering._id);
};

export const ArtisanServiceServices = {
  createArtisanService,
  getMyServices,
  getArtisanServices,
  getAllArtisanServices,
  getSingleArtisanService,
  updateArtisanService,
  deleteArtisanService,
  reviewArtisanService,
};
