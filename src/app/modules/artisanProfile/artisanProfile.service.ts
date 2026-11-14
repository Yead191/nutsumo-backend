import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../user/user.model';
import { IArtisanProfile } from './artisanProfile.interface';
import { ArtisanProfile } from './artisanProfile.model';
import {
  ensureArtisanDiscovery,
  rebuildArtisanSearchText,
} from './artisanSearch.sync';
import { ArtisanService } from '../artisanService/artisanService.model';
import { Service } from '../service/service.model';
import { ElasticArtisanRank } from '../job-matching/elasticRank';

const USER_POPULATE_FIELDS =
  'name email phone image location trade identityStatus verified status';

const upsertMyArtisanProfile = async (
  userId: string,
  payload: Partial<IArtisanProfile>,
): Promise<IArtisanProfile> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const allowedFields = [
    'businessName',
    'trade',
    'bio',
    'location',
    'postCode',
    'serviceLatitude',
    'serviceLongitude',
    'serviceRadiusKm',
    'experienceYears',
    'availabilityStatus',
    'hourlyRate',
    'startingRate',
    'completedJobs',
    'isProfilePublic',
  ];

  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if ((payload as any)[field] !== undefined) {
      updateData[field] = (payload as any)[field];
    }
  }

  if (
    typeof updateData.serviceLatitude === 'number' &&
    typeof updateData.serviceLongitude === 'number'
  ) {
    updateData.baseLocation = {
      type: 'Point',
      coordinates: [updateData.serviceLongitude, updateData.serviceLatitude],
    };
  }

  // Upsert profile
  const profile = await ArtisanProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).populate('user', USER_POPULATE_FIELDS);

  // Sync reference & common fields back to User
  const userUpdates: Record<string, any> = {
    artisanProfile: profile._id,
  };
  if (updateData.trade) userUpdates.trade = updateData.trade;
  if (updateData.location) userUpdates.location = updateData.location;
  if (updateData.postCode !== undefined) userUpdates.postCode = updateData.postCode;

  await User.findByIdAndUpdate(userId, { $set: userUpdates });
  await rebuildArtisanSearchText(userId);

  return profile;
};

const getMyArtisanProfile = async (
  userId: string,
): Promise<IArtisanProfile | null> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  let profile = await ArtisanProfile.findOne({ user: userId }).populate(
    'user',
    USER_POPULATE_FIELDS,
  );

  // If profile doesn't exist yet, auto-create a default one for this artisan
  if (!profile) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const created = await ArtisanProfile.create({
      user: userId,
      businessName: user.name ? `${user.name} Services` : '',
      trade: user.trade || '',
      location: (user as any).location || '',
      postCode: '',
      availabilityStatus: 'Available',
    });

    await User.findByIdAndUpdate(userId, {
      $set: { artisanProfile: created._id },
    });

    profile = await ArtisanProfile.findById(created._id).populate(
      'user',
      USER_POPULATE_FIELDS,
    );
  }

  return profile;
};

const getArtisanProfileById = async (
  id: string,
): Promise<IArtisanProfile | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid profile ID');
  }

  const profile = await ArtisanProfile.findById(id).populate(
    'user',
    USER_POPULATE_FIELDS,
  );

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan profile not found');
  }

  return profile;
};

const getArtisanProfileByUserId = async (
  userId: string,
): Promise<IArtisanProfile | null> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  let profile = await ArtisanProfile.findOne({ user: userId }).populate(
    'user',
    USER_POPULATE_FIELDS,
  );

  if (!profile) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan user not found');
    }

    // Auto-create default profile if user exists and is artisan
    const created = await ArtisanProfile.create({
      user: userId,
      businessName: user.name ? `${user.name} Services` : '',
      trade: user.trade || '',
      location: (user as any).location || '',
      postCode: '',
      availabilityStatus: 'Available',
    });

    await User.findByIdAndUpdate(userId, {
      $set: { artisanProfile: created._id },
    });

    profile = await ArtisanProfile.findById(created._id).populate(
      'user',
      USER_POPULATE_FIELDS,
    );
  }

  return profile;
};

const getAllArtisanProfiles = async (query: Record<string, unknown>) => {
  const profileQuery = new QueryBuilder(
    ArtisanProfile.find().populate('user', USER_POPULATE_FIELDS),
    query,
  )
    .search(['businessName', 'trade', 'location', 'bio'])
    .filter()
    .sort()
    .paginate();

  const [profiles, pagination] = await Promise.all([
    profileQuery.modelQuery.lean(),
    profileQuery.getPaginationInfo(),
  ]);

  return { profiles, pagination };
};

const updateArtisanProfileByAdmin = async (
  id: string,
  payload: Partial<IArtisanProfile>,
): Promise<IArtisanProfile | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid profile ID');
  }

  const profile = await ArtisanProfile.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  ).populate('user', USER_POPULATE_FIELDS);

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan profile not found');
  }

  const owner = profile.user as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId;
  const ownerId =
    owner && typeof owner === 'object' && '_id' in owner ? String(owner._id) : String(owner);
  await rebuildArtisanSearchText(ownerId);

  return profile;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchTokens = (...parts: string[]) => {
  const tokens = parts
    .join(' ')
    .toLowerCase()
    .match(/[a-z0-9]{2,}/g);
  return [...new Set(tokens || [])].slice(0, 8);
};

const SORT_FIELDS = new Set(['rating', 'completedJobs', 'hourlyRate', 'createdAt']);

const plainSort = (sortKey: string): Record<string, 1 | -1> => {
  const descending = sortKey.startsWith('-');
  const field = descending ? sortKey.slice(1) : sortKey;
  if (!SORT_FIELDS.has(field)) return { rating: -1 };
  return { [field]: descending ? -1 : 1 };
};

const offeringLabel = (item: {
  customName?: string;
  service?: unknown;
}) => {
  if (item.customName) return item.customName;
  if (item.service && typeof item.service === 'object' && 'name' in item.service) {
    const name = (item.service as { name?: string }).name;
    return name || '';
  }
  return '';
};

const discoverArtisans = async (query: Record<string, unknown>) => {
  await ensureArtisanDiscovery();

  const q = String(query.q || query.searchTerm || '').trim();
  const trade = String(query.trade || '').trim();
  const place = String(query.location || query.postCode || '').trim();
  const availability = String(query.availabilityStatus || '').trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(query.limit) || 12));
  const sortKey = String(query.sort || '-rating');
  const minRating =
    query.rating && query.rating !== 'all' ? Number(query.rating) : 0;

  const tokens = searchTokens(q, trade);
  const filter: Record<string, unknown> = {
    isProfilePublic: { $ne: false },
  };

  if (availability && availability !== 'all') {
    filter.availabilityStatus = availability;
  }
  if (minRating > 0) {
    filter.rating = { $gte: minRating };
  }
  if (place) {
    const placeRegex = new RegExp(escapeRegex(place), 'i');
    filter.$and = [{ $or: [{ location: placeRegex }, { postCode: placeRegex }] }];
  }

  const categoryId = String(query.category || '').trim();
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const catalogServices = await Service.find({
      category: categoryId,
      isActive: true,
    })
      .select('_id')
      .lean();
    const rows = await ArtisanService.find({
      isActive: true,
      reviewStatus: { $ne: 'REJECTED' },
      $or: [
        { category: categoryId },
        ...(catalogServices.length
          ? [{ service: { $in: catalogServices.map(item => item._id) } }]
          : []),
      ],
    })
      .select('artisan')
      .lean();
    const ids = [...new Set(rows.map(row => String(row.artisan)))];
    if (!ids.length) {
      return {
        profiles: [],
        pagination: { total: 0, limit, page, totalPage: 0 },
      };
    }
    filter.user = { $in: ids };
  }

  const run = async (useText: boolean) => {
    const nextFilter = { ...filter };
    if (useText && tokens.length) {
      nextFilter.$text = { $search: tokens.map(token => `"${token}"`).join(' ') };
    } else if (tokens.length) {
      nextFilter.searchText = new RegExp(tokens.map(escapeRegex).join('|'), 'i');
    }

    const ranking: Record<string, 1 | -1 | { $meta: 'textScore' }> = useText
      ? { score: { $meta: 'textScore' }, ...plainSort(sortKey) }
      : plainSort(sortKey);
    const [profiles, total] = await Promise.all([
      ArtisanProfile.find(nextFilter, useText ? { score: { $meta: 'textScore' } } : undefined)
        .populate('user', USER_POPULATE_FIELDS)
        .sort(ranking)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ArtisanProfile.countDocuments(nextFilter),
    ]);

    return { profiles, total };
  };

  let usedText = false;
  let result = { profiles: [] as Array<Record<string, unknown>>, total: 0 };
  const elastic = tokens.length
    ? await ElasticArtisanRank.searchPage(tokens.join(' '), page, limit)
    : null;

  if (elastic?.ids.length) {
    const categoryIds = Array.isArray((filter.user as { $in?: unknown[] } | undefined)?.$in)
      ? new Set((filter.user as { $in: unknown[] }).$in.map(id => String(id)))
      : null;
    const ids = elastic.ids.filter(id => !categoryIds || categoryIds.has(id));
    const found = ids.length
      ? await ArtisanProfile.find({ ...filter, user: { $in: ids } })
          .populate('user', USER_POPULATE_FIELDS)
          .lean()
      : [];
    if (found.length) {
      const order = new Map(ids.map((id, index) => [id, index]));
      const idOf = (profile: { user?: { _id?: unknown } | unknown }) => {
        const user = profile.user;
        if (user && typeof user === 'object' && '_id' in user) return String(user._id);
        return String(user || '');
      };
      found.sort(
        (left, right) => (order.get(idOf(left)) ?? 99) - (order.get(idOf(right)) ?? 99),
      );
      result = { profiles: found, total: elastic.total };
      usedText = true;
    }
  }

  if (!usedText && tokens.length) {
    try {
      result = await run(true);
      usedText = true;
    } catch {
      usedText = false;
    }
  }
  if (!usedText || (tokens.length > 0 && result.total === 0)) {
    result = await run(false);
  }

  const artisanIds = result.profiles
    .map(profile => {
      const user = profile.user as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId;
      if (user && typeof user === 'object' && '_id' in user) return user._id;
      return profile.user as mongoose.Types.ObjectId;
    })
    .filter(Boolean);

  const offerings = artisanIds.length
    ? await ArtisanService.find({
        artisan: { $in: artisanIds },
        isActive: true,
        reviewStatus: { $ne: 'REJECTED' },
      })
        .populate('service', 'name')
        .select('artisan customName service rateAmount rateType')
        .lean()
    : [];

  const byArtisan = new Map<string, typeof offerings>();
  for (const offering of offerings) {
    const key = String(offering.artisan);
    const list = byArtisan.get(key) || [];
    list.push(offering);
    byArtisan.set(key, list);
  }

  const profiles = result.profiles.map(profile => {
    const user = profile.user as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId;
    const userId =
      user && typeof user === 'object' && '_id' in user ? String(user._id) : String(user);
    const list = byArtisan.get(userId) || [];
    const scoreOf = (item: (typeof list)[number]) => {
      const label = offeringLabel(item).toLowerCase();
      return tokens.reduce((sum, token) => sum + (label.includes(token) ? 1 : 0), 0);
    };
    const ranked = [...list].sort((left, right) => scoreOf(right) - scoreOf(left));
    const best = ranked[0] && scoreOf(ranked[0]) > 0 ? ranked[0] : undefined;
    const cheapest = [...list]
      .filter(item => Number(item.rateAmount) > 0)
      .sort((left, right) => left.rateAmount - right.rateAmount)[0];
    const offerOf = (item: (typeof list)[number]) => ({
      name: offeringLabel(item),
      rateAmount: item.rateAmount,
      rateType: item.rateType,
    });
    return {
      ...profile,
      matchedOffering: best ? offerOf(best) : null,
      startingOffer: cheapest ? offerOf(cheapest) : null,
    };
  });

  return {
    profiles,
    pagination: {
      total: result.total,
      limit,
      page,
      totalPage: Math.ceil(result.total / limit) || 0,
    },
  };
};

const deleteArtisanProfile = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid profile ID');
  }

  const profile = await ArtisanProfile.findByIdAndDelete(id);
  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Artisan profile not found');
  }

  await User.findByIdAndUpdate(profile.user, {
    $unset: { artisanProfile: 1 },
  });

  return profile;
};

export const ArtisanProfileServices = {
  upsertMyArtisanProfile,
  getMyArtisanProfile,
  getArtisanProfileById,
  getArtisanProfileByUserId,
  getAllArtisanProfiles,
  discoverArtisans,
  updateArtisanProfileByAdmin,
  deleteArtisanProfile,
};
