import axios from 'axios';
import config from '../config';
import { errorLogger, logger } from '../shared/logger';

/**
 * Tells the Next.js frontend to drop cached data for the given tags so
 * changes show up on the website immediately.
 *
 * Fire-and-forget: never throws, so a frontend outage can't break the API response.
 */
export const revalidateFrontend = (tags: string[]): void => {
  const secret = process.env.REVALIDATE_SECRET;
  const uniqueTags = [...new Set(tags.filter(Boolean))];
  if (!secret || uniqueTags.length === 0) return;

  axios
    .post(
      `${config.frontend_url}/api/revalidate`,
      { tags: uniqueTags },
      { headers: { 'x-revalidate-secret': secret }, timeout: 5000 },
    )
    .then(() => logger.info(`Frontend revalidated: ${uniqueTags.join(', ')}`))
    .catch(error =>
      errorLogger.error(
        `Frontend revalidation failed for [${uniqueTags.join(', ')}]: ${error?.message}`,
      ),
    );
};
