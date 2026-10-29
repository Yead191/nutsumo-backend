import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../user/user.model';
import { IArtisanProfile } from './artisanProfile.interface';
import { ArtisanProfile } from './artisanProfile.model';

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

  await User.findByIdAndUpdate(userId, { $set: userUpdates });

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

  return profile;
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
  updateArtisanProfileByAdmin,
  deleteArtisanProfile,
};
