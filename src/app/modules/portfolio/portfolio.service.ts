import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import unlinkFile from '../../../shared/unlinkFile';
import { IPortfolio } from './portfolio.interface';
import { Portfolio } from './portfolio.model';

const createPortfolioItem = async (
  userId: string,
  payload: Partial<IPortfolio>,
): Promise<IPortfolio> => {
  const newPortfolio = await Portfolio.create({
    ...payload,
    artisan: userId,
  });

  const result = await Portfolio.findById(newPortfolio._id)
    .populate('category', 'name slug image ')
    .populate('artisan', 'name email image');

  return result as IPortfolio;
};

const getMyPortfolio = async (userId: string) => {
  const result = await Portfolio.find({ artisan: userId })
    .populate('category', 'name slug image services')
    .sort({ createdAt: -1 });

  return result;
};

const getArtisanPortfolio = async (artisanId: string) => {
  const result = await Portfolio.find({
    artisan: artisanId,
    isPublished: true,
  })
    .populate('category', 'name slug image ')
    .sort({ createdAt: -1 });

  return result;
};

const getSinglePortfolioItem = async (
  id: string,
): Promise<IPortfolio | null> => {
  const result = await Portfolio.findById(id)
    .populate('category', 'name slug image ')
    .populate('artisan', 'name email image ');

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Portfolio item not found');
  }

  return result;
};

const updatePortfolioItem = async (
  userId: string,
  id: string,
  payload: Partial<IPortfolio>,
): Promise<IPortfolio | null> => {
  const isExist = await Portfolio.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Portfolio item not found');
  }

  if (isExist.artisan.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this portfolio item',
    );
  }

  const result = await Portfolio.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('category', 'name slug image services');

  return result;
};

const deletePortfolioItem = async (
  userId: string,
  id: string,
): Promise<IPortfolio | null> => {
  const isExist = await Portfolio.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Portfolio item not found');
  }

  if (isExist.artisan.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this portfolio item',
    );
  }

  // Unlink stored image files
  if (isExist.images && isExist.images.length > 0) {
    for (const img of isExist.images) {
      const url = typeof img === 'string' ? img : (img as any)?.url;
      if (url && !url.startsWith('http')) {
        try {
          unlinkFile(url);
        } catch {
          // ignore unlink error
        }
      }
    }
  }

  const result = await Portfolio.findByIdAndDelete(id);
  return result;
};

export const PortfolioServices = {
  createPortfolioItem,
  getMyPortfolio,
  getArtisanPortfolio,
  getSinglePortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
};
