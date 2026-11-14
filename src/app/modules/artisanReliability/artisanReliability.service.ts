import { ArtisanProfile } from '../artisanProfile/artisanProfile.model';

const minutesBetween = (from: Date, to = new Date()) => {
  const diff = (to.getTime() - new Date(from).getTime()) / 60000;
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.min(diff, 60 * 24 * 14);
};

const recordQuoteResponse = async (artisanId: string, jobCreatedAt?: Date) => {
  const profile = await ArtisanProfile.findOne({ user: artisanId });
  if (!profile || !jobCreatedAt) return;

  const samples = profile.responseSamples || 0;
  const current = profile.responseTimeMinutes || 0;
  const minutes = minutesBetween(jobCreatedAt);

  profile.responseSamples = samples + 1;
  profile.responseTimeMinutes =
    (current * samples + minutes) / (samples + 1);
  profile.quotesSent = (profile.quotesSent || 0) + 1;
  profile.acceptRate = profile.quotesSent
    ? (profile.quotesAccepted || 0) / profile.quotesSent
    : 0;

  await profile.save();
};

const recordQuoteAccepted = async (artisanId: string) => {
  const profile = await ArtisanProfile.findOne({ user: artisanId });
  if (!profile) return;

  profile.quotesAccepted = (profile.quotesAccepted || 0) + 1;
  const sent = Math.max(profile.quotesSent || 0, profile.quotesAccepted);
  profile.quotesSent = sent;
  profile.acceptRate = sent ? profile.quotesAccepted / sent : 0;
  await profile.save();
};

export const ArtisanReliability = {
  recordQuoteResponse,
  recordQuoteAccepted,
};
