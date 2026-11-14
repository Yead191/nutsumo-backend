import mongoose from 'mongoose';
import { logger } from '../../../shared/logger';
import { ArtisanService } from '../artisanService/artisanService.model';
import { User } from '../user/user.model';
import { ElasticArtisanRank, ArtisanSearchDoc } from '../job-matching/elasticRank';
import { ArtisanProfile } from './artisanProfile.model';
import { IArtisanProfile } from './artisanProfile.interface';

const TEXT_INDEX = 'artisan_discovery_text';
const PUBLIC_USER_FIELDS =
  'name email phone image location trade identityStatus verified status';

const nameOf = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('name' in value)) return '';
  const name = (value as { name?: unknown }).name;
  return typeof name === 'string' ? name : '';
};

const categoryIdOf = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in value) {
    return String((value as { _id?: unknown })._id || '');
  }
  return String(value);
};

const offeringView = (item: {
  customName?: string;
  service?: unknown;
  rateAmount?: number;
  rateType?: string;
}) => ({
  customName: item.customName || '',
  service:
    item.service && typeof item.service === 'object'
      ? { _id: (item.service as { _id?: unknown })._id, name: nameOf(item.service) }
      : null,
  rateAmount: item.rateAmount,
  rateType: item.rateType,
});

const syncArtisanSearchDocs = async (profiles: IArtisanProfile[]) => {
  if (!profiles.length) return;

  const userIds = profiles.map(profile => profile.user);
  const [users, offerings] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select(PUBLIC_USER_FIELDS)
      .lean(),
    ArtisanService.find({
      artisan: { $in: userIds },
      isActive: true,
      reviewStatus: { $ne: 'REJECTED' },
    })
      .populate('service', 'name')
      .populate('category', 'name')
      .select('artisan customName proposedCategory service category rateAmount rateType')
      .lean(),
  ]);

  const usersById = new Map(users.map(user => [String(user._id), user]));
  const offeringsByArtisan = new Map<string, typeof offerings>();
  for (const offering of offerings) {
    const key = String(offering.artisan);
    const list = offeringsByArtisan.get(key) || [];
    list.push(offering);
    offeringsByArtisan.set(key, list);
  }

  const updates: Array<{
    updateOne: {
      filter: { user: IArtisanProfile['user'] };
      update: { $set: { searchText: string } };
    };
  }> = [];
  const docs: ArtisanSearchDoc[] = [];

  for (const profile of profiles) {
    const artisanId = String(profile.user);
    const mine = offeringsByArtisan.get(artisanId) || [];
    const parts = [
      profile.businessName,
      profile.trade,
      profile.bio,
      profile.location,
      profile.postCode,
      ...mine.flatMap(item => [
        item.customName,
        item.proposedCategory,
        nameOf(item.service),
        nameOf(item.category),
      ]),
    ];
    const searchText = [...new Set(parts.map(part => (part || '').trim()).filter(Boolean))]
      .join(' ')
      .slice(0, 4000);
    const user = usersById.get(artisanId);
    const { searchText: _searchText, ...fields } = profile as IArtisanProfile & {
      searchText?: string;
    };

    updates.push({
      updateOne: {
        filter: { user: profile.user },
        update: { $set: { searchText } },
      },
    });
    docs.push({
      artisanId,
      text: searchText,
      acceptRate: profile.acceptRate,
      responseTimeMinutes: profile.responseTimeMinutes,
      rating: (profile.reviewsCount || 0) > 0 ? profile.rating : 0,
      lat: profile.serviceLatitude,
      lng: profile.serviceLongitude,
      isProfilePublic: profile.isProfilePublic !== false,
      availabilityStatus: profile.availabilityStatus,
      postCode: profile.postCode,
      locationText: profile.location,
      categoryIds: [
        ...new Set(mine.map(item => categoryIdOf(item.category)).filter(Boolean)),
      ],
      card: {
        ...fields,
        user: user
          ? {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              image: user.image,
              location: user.location,
              trade: user.trade,
              identityStatus: user.identityStatus,
              verified: user.verified,
              status: user.status,
            }
          : profile.user,
        offerings: mine.map(offeringView),
      },
    });
  }

  if (updates.length) {
    await ArtisanProfile.bulkWrite(updates, { ordered: false });
  }
  await ElasticArtisanRank.indexArtisans(docs);
};

export const reindexAllArtisans = async () => {
  const profiles = await ArtisanProfile.find().lean();
  for (let offset = 0; offset < profiles.length; offset += 100) {
    await syncArtisanSearchDocs(profiles.slice(offset, offset + 100));
  }
  return profiles.length;
};

export const rebuildArtisanSearchText = async (artisanUserId: string) => {
  if (!mongoose.Types.ObjectId.isValid(artisanUserId)) return;

  const profile = await ArtisanProfile.findOne({ user: artisanUserId }).lean();
  if (!profile) return;
  await syncArtisanSearchDocs([profile]);
};

let ready: Promise<void> | null = null;

const migrateTextIndex = async () => {
  const indexes = await ArtisanProfile.collection.indexes();
  for (const index of indexes) {
    const isText = Boolean(index.key && '_fts' in index.key);
    if (isText && index.name && index.name !== TEXT_INDEX) {
      await ArtisanProfile.collection.dropIndex(index.name);
    }
  }

  const current = await ArtisanProfile.collection.indexes();
  if (current.some(index => index.name === TEXT_INDEX)) return;

  await ArtisanProfile.collection.createIndex(
    {
      searchText: 'text',
      businessName: 'text',
      trade: 'text',
      bio: 'text',
      location: 'text',
      postCode: 'text',
    },
    {
      name: TEXT_INDEX,
      weights: {
        searchText: 10,
        trade: 6,
        businessName: 5,
        postCode: 4,
        location: 2,
        bio: 1,
      },
    },
  );
};

const backfillSearchText = async () => {
  const stale = await ArtisanProfile.find({
    $or: [{ searchText: { $exists: false } }, { searchText: '' }],
  }).lean();

  for (let offset = 0; offset < stale.length; offset += 100) {
    await syncArtisanSearchDocs(stale.slice(offset, offset + 100));
  }
};

/** One indexed document per artisan, rebuilt when the profile or an offering changes. */
export const ensureArtisanDiscovery = () => {
  if (!ready) {
    ready = (async () => {
      try {
        await migrateTextIndex();
      } catch (error: any) {
        logger.warn(`[discovery] Text index skipped: ${error?.message || error}`);
      }
      await ArtisanProfile.updateMany(
        {
          rating: { $gt: 0 },
          $or: [{ reviewsCount: 0 }, { reviewsCount: { $exists: false } }],
        },
        { $set: { rating: 0 } },
      );
      await backfillSearchText();
    })().catch(error => {
      ready = null;
      logger.warn(
        `[discovery] Search index was not ready: ${error?.message || error}`,
      );
    });
  }
  return ready;
};
