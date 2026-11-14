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

const userIdOf = (profile: { user?: any }) => {
  const user = profile.user;
  if (user && typeof user === 'object' && '_id' in user) return String(user._id || '');
  return String(user || '');
};

const presentProfile = (
  profile: Record<string, any>,
  tokens: string[],
): Record<string, any> => {
  const list = Array.isArray(profile.offerings) ? profile.offerings : [];
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
  const {
    offerings: _offerings,
    userDoc: _userDoc,
    searchText: _searchText,
    ...rest
  } = profile;
  return {
    ...rest,
    matchedOffering: best ? offerOf(best) : null,
    startingOffer: cheapest ? offerOf(cheapest) : null,
  };
};

const castMatch = (match: Record<string, unknown>) => {
  const next = { ...match };
  const user = next.user as { $in?: unknown[] } | undefined;
  if (user?.$in) {
    next.user = {
      $in: user.$in.map(id =>
        id instanceof mongoose.Types.ObjectId
          ? id
          : new mongoose.Types.ObjectId(String(id)),
      ),
    };
  }
  return next;
};

const joinStages = (): mongoose.PipelineStage[] => [
  {
    $lookup: {
      from: ArtisanService.collection.name,
      let: { artisanId: '$user' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$artisan', '$$artisanId'] },
                { $eq: ['$isActive', true] },
                { $ne: ['$reviewStatus', 'REJECTED'] },
              ],
            },
          },
        },
        {
          $lookup: {
            from: Service.collection.name,
            localField: 'service',
            foreignField: '_id',
            as: 'service',
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $project: { customName: 1, service: 1, rateAmount: 1, rateType: 1 } },
      ],
      as: 'offerings',
    },
  },
  {
    $lookup: {
      from: User.collection.name,
      localField: 'user',
      foreignField: '_id',
      as: 'userDoc',
      pipeline: [
        {
          $project: {
            name: 1,
            email: 1,
            phone: 1,
            image: 1,
            location: 1,
            trade: 1,
            identityStatus: 1,
            verified: 1,
            status: 1,
          },
        },
      ],
    },
  },
  {
    $addFields: {
      user: { $ifNull: [{ $arrayElemAt: ['$userDoc', 0] }, null] },
    },
  },
  { $unset: ['userDoc', 'searchText'] },
];

const loadDiscoverPage = async (
  match: Record<string, unknown>,
  options: {
    page: number;
    limit: number;
    sortKey: string;
    tokens: string[];
    useText: boolean;
    paginate: boolean;
  },
) => {
  const sort: Record<string, 1 | -1> = options.useText
    ? { score: -1, ...plainSort(options.sortKey) }
    : plainSort(options.sortKey);
  const pipeline: mongoose.PipelineStage[] = [{ $match: castMatch(match) }];
  if (options.useText) {
    pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
  }

  const rows: mongoose.PipelineStage.FacetPipelineStage[] = [];
  if (options.paginate) {
    rows.push(
      { $sort: sort },
      { $skip: (options.page - 1) * options.limit },
      { $limit: options.limit },
    );
  }
  rows.push(...(joinStages() as mongoose.PipelineStage.FacetPipelineStage[]));

  pipeline.push({
    $facet: {
      rows,
      meta: [{ $count: 'total' }],
    },
  });

  const [aggregated] = await ArtisanProfile.aggregate<{
    rows: Array<Record<string, any>>;
    meta: Array<{ total: number }>;
  }>(pipeline);

  return {
    profiles: (aggregated?.rows || []).map(row => presentProfile(row, options.tokens)),
    total: aggregated?.meta?.[0]?.total || 0,
  };
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
  const placeRegex = place ? new RegExp(escapeRegex(place), 'i') : null;
  if (placeRegex) {
    filter.$and = [{ $or: [{ location: placeRegex }, { postCode: placeRegex }] }];
  }

  const categoryId = String(query.category || '').trim();
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    const serviceIds = await Service.find({
      category: categoryId,
      isActive: true,
    }).distinct('_id');
    const artisanIds = await ArtisanService.distinct('artisan', {
      isActive: true,
      reviewStatus: { $ne: 'REJECTED' },
      $or: [
        { category: categoryId },
        ...(serviceIds.length ? [{ service: { $in: serviceIds } }] : []),
      ],
    });
    if (!artisanIds.length) {
      return {
        profiles: [],
        pagination: { total: 0, limit, page, totalPage: 0 },
      };
    }
    filter.user = { $in: artisanIds };
  }

  const pageOptions = {
    page,
    limit,
    sortKey,
    tokens,
  };
  const cardMatches = (card: Record<string, any>) => {
    if (card.isProfilePublic === false) return false;
    if (availability && availability !== 'all' && card.availabilityStatus !== availability) {
      return false;
    }
    if (minRating > 0 && !(Number(card.rating) >= minRating)) return false;
    if (
      placeRegex &&
      !placeRegex.test(String(card.location || '')) &&
      !placeRegex.test(String(card.postCode || ''))
    ) {
      return false;
    }
    const allowed = (filter.user as { $in?: unknown[] } | undefined)?.$in;
    if (allowed && !allowed.map(id => String(id)).includes(userIdOf(card))) return false;
    return true;
  };

  let usedText = false;
  let result = { profiles: [] as Array<Record<string, unknown>>, total: 0 };
  const elastic = tokens.length
    ? await ElasticArtisanRank.searchPage(tokens.join(' '), page, limit)
    : null;

  if (elastic?.cards.length && elastic.cards.length === elastic.ids.length) {
    const profiles = elastic.cards
      .filter(card => cardMatches(card as Record<string, any>))
      .map(card => presentProfile(card as Record<string, any>, tokens));
    if (profiles.length) {
      result = { profiles, total: elastic.total };
      usedText = true;
    }
  } else if (elastic?.ids.length) {
    const categoryIds = Array.isArray((filter.user as { $in?: unknown[] } | undefined)?.$in)
      ? new Set((filter.user as { $in: unknown[] }).$in.map(id => String(id)))
      : null;
    const ids = elastic.ids.filter(id => !categoryIds || categoryIds.has(id));
    if (ids.length) {
      const loaded = await loadDiscoverPage(
        { ...filter, user: { $in: ids } },
        { ...pageOptions, useText: false, paginate: false },
      );
      if (loaded.profiles.length) {
        const order = new Map(ids.map((id, index) => [id, index]));
        loaded.profiles.sort(
          (left, right) =>
            (order.get(userIdOf(left)) ?? 99) - (order.get(userIdOf(right)) ?? 99),
        );
        result = { profiles: loaded.profiles, total: elastic.total };
        usedText = true;
      }
    }
  }

  if (!usedText && tokens.length) {
    try {
      result = await loadDiscoverPage(
        {
          ...filter,
          $text: { $search: tokens.map(token => `"${token}"`).join(' ') },
        },
        { ...pageOptions, useText: true, paginate: true },
      );
      usedText = true;
    } catch {
      usedText = false;
    }
  }
  if (!usedText || (tokens.length > 0 && result.total === 0)) {
    const nextFilter = { ...filter };
    if (tokens.length) {
      nextFilter.searchText = new RegExp(tokens.map(escapeRegex).join('|'), 'i');
    }
    result = await loadDiscoverPage(nextFilter, {
      ...pageOptions,
      useText: false,
      paginate: true,
    });
  }

  return {
    profiles: result.profiles,
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
