import mongoose from 'mongoose';
import { logger } from '../../../shared/logger';
import { ArtisanService } from '../artisanService/artisanService.model';
import { ArtisanProfile } from './artisanProfile.model';
import { ElasticArtisanRank } from '../job-matching/elasticRank';

const TEXT_INDEX = 'artisan_discovery_text';

const nameOf = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('name' in value)) return '';
  const name = (value as { name?: unknown }).name;
  return typeof name === 'string' ? name : '';
};

export const rebuildArtisanSearchText = async (artisanUserId: string) => {
  if (!mongoose.Types.ObjectId.isValid(artisanUserId)) return;

  const [profile, offerings] = await Promise.all([
    ArtisanProfile.findOne({ user: artisanUserId })
      .select(
        'businessName trade bio location postCode serviceLatitude serviceLongitude rating reviewsCount acceptRate responseTimeMinutes',
      )
      .lean(),
    ArtisanService.find({
      artisan: artisanUserId,
      isActive: true,
      reviewStatus: { $ne: 'REJECTED' },
    })
      .populate('service', 'name')
      .populate('category', 'name')
      .select('customName proposedCategory service category')
      .lean(),
  ]);

  if (!profile) return;

  const parts = [
    profile.businessName,
    profile.trade,
    profile.bio,
    profile.location,
    profile.postCode,
    ...offerings.flatMap(item => [
      item.customName,
      item.proposedCategory,
      nameOf(item.service),
      nameOf(item.category),
    ]),
  ];

  const searchText = [...new Set(parts.map(part => (part || '').trim()).filter(Boolean))]
    .join(' ')
    .slice(0, 4000);

  await ArtisanProfile.updateOne({ user: artisanUserId }, { $set: { searchText } });
  await ElasticArtisanRank.indexArtisans([
    {
      artisanId: artisanUserId,
      text: searchText,
      acceptRate: profile.acceptRate,
      responseTimeMinutes: profile.responseTimeMinutes,
      rating: (profile.reviewsCount || 0) > 0 ? profile.rating : 0,
      lat: profile.serviceLatitude,
      lng: profile.serviceLongitude,
    },
  ]);
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
  })
    .select('user')
    .lean();

  for (const profile of stale) {
    await rebuildArtisanSearchText(String(profile.user));
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
