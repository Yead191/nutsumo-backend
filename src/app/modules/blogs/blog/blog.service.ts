import { JwtPayload } from 'jsonwebtoken';
import { generateSlug } from '../../../../util/generateSlug';
import { BLOG_STATUS } from './blog.constants';
import { IBlog } from './blog.interface';
import { Blog } from './blog.model';
import { BlogCategory } from '../blogcategory/blogcategory.model';
import { USER_ROLES } from '../../../../enums/user';
import QueryBuilder from '../../../builder/QueryBuilder';
import ApiError from '../../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import unlinkFile from '../../../../shared/unlinkFile';
import { sendNotificationToAllUsers } from '../../notification/notification.util';
import { Like } from '../like/like.model';

const dispatchBlogPublishedNotification = (blog: any) => {
  if (!blog || !blog.title || !blog.slug) return;
  sendNotificationToAllUsers({
    title: `New Article: ${blog.title}`,
    message: `A new article "${blog.title}" has been published on iFundAyiti.`,
    path: `/blogs/${blog.slug}`,
    refId: blog._id,
    type: 'blog',
  }).catch(err => {
    console.error('Failed to dispatch blog publication notifications:', err);
  });
};

const createBlogToDB = async (payload: IBlog): Promise<IBlog> => {
  try {
    if (!payload.category || !Types.ObjectId.isValid(payload.category)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid category ID');
    }

    const categoryExists = await BlogCategory.findById(payload.category);
    if (!categoryExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found');
    }

    const slug = generateSlug(payload.title);
    const isSlugExists = await Blog.findOne({ slug });
    if (isSlugExists) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'A blog with this title already exists.',
      );
    }

    if (payload.status === BLOG_STATUS.PUBLISHED && !payload.publishedAt) {
      payload.publishedAt = new Date();
    }

    const blog = await Blog.create({ ...payload, slug });
    const populated = await Blog.findById(blog._id).populate([
      { path: 'author', select: 'name email image' },
      { path: 'category', select: 'name slug' },
    ]);

    if (blog.status === BLOG_STATUS.PUBLISHED) {
      dispatchBlogPublishedNotification(populated || blog);
    }

    return (populated || blog) as IBlog;
  } catch (error: any) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to create blog',
    );
  }
};

const getAllBlogsFromDB = async (
  user?: JwtPayload,
  query: Record<string, any> = {},
) => {
  const isAdmin =
    user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user?.role);

  const initQuery: Record<string, any> = isAdmin
    ? {}
    : { status: BLOG_STATUS.PUBLISHED };

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = '-publishedAt -createdAt';
  }

  // Support filtering by category slug or category ID
  if (queryParams.category && !Types.ObjectId.isValid(queryParams.category)) {
    const categoryDoc = await BlogCategory.findOne({
      slug: queryParams.category.toLowerCase(),
    });
    if (categoryDoc) {
      queryParams.category = categoryDoc._id.toString();
    }
  }

  const qb = new QueryBuilder(
    Blog.find(initQuery).populate([
      {
        path: 'author',
        select: 'name  image',
      },
      {
        path: 'category',
        select: 'name slug',
      },
    ]),
    queryParams,
  )
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    qb.modelQuery.lean(),
    qb.getPaginationInfo(),
  ]);

  return { data, pagination };
};

const getSingleBlogFromDB = async (idOrSlug: string, user?: JwtPayload) => {
  const isAdmin =
    user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user?.role);

  const filter: Record<string, any> = Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug.toLowerCase() };

  if (!isAdmin) {
    filter.status = BLOG_STATUS.PUBLISHED;
  }

  const result = await Blog.findOne(filter).populate([
    {
      path: 'author',
      select: 'name image',
    },
    {
      path: 'category',
      select: 'name slug',
    },
  ]);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  const blogObj: any = result.toObject ? result.toObject() : { ...result };
  if (user?.id) {
    const isLiked = await Like.isLikeByMe(user.id, result._id);
    blogObj.isLikedByMe = isLiked;
  } else {
    blogObj.isLikedByMe = false;
  }

  return blogObj;
};

const updateBlogToDB = async (id: string, payload: Partial<IBlog>) => {
  if (!Types.ObjectId.isValid(id)) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid blog ID');
  }

  const existingBlog = await Blog.findById(id);
  if (!existingBlog) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  // Validate category if updated
  if (payload.category) {
    if (!Types.ObjectId.isValid(payload.category)) {
      if (payload.image) {
        unlinkFile(payload.image);
      }
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid category ID');
    }
    const categoryExists = await BlogCategory.findById(payload.category);
    if (!categoryExists) {
      if (payload.image) {
        unlinkFile(payload.image);
      }
      throw new ApiError(StatusCodes.NOT_FOUND, 'Blog category not found');
    }
  }

  // Generate new slug if title is updated
  if (payload.title) {
    const slug = generateSlug(payload.title);

    const isSlugExists = await Blog.findOne({
      slug,
      _id: { $ne: id },
    });

    if (isSlugExists) {
      if (payload.image) {
        unlinkFile(payload.image);
      }
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Another blog with this title already exists',
      );
    }

    payload.slug = slug;
  }

  // Set publishedAt when blog is published
  if (
    payload.status === BLOG_STATUS.PUBLISHED &&
    !existingBlog.publishedAt &&
    !payload.publishedAt
  ) {
    payload.publishedAt = new Date();
  }

  // If a new image is uploaded, delete the old image
  if (
    payload.image &&
    existingBlog.image &&
    existingBlog.image !== payload.image
  ) {
    unlinkFile(existingBlog.image);
  }

  const result = await Blog.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate([
    {
      path: 'author',
      select: 'name email image',
    },
    {
      path: 'category',
      select: 'name slug',
    },
  ]);

  if (
    payload.status === BLOG_STATUS.PUBLISHED &&
    existingBlog.status !== BLOG_STATUS.PUBLISHED &&
    result
  ) {
    dispatchBlogPublishedNotification(result);
  }

  return result;
};

const updateBlogStatusToDB = async (id: string, status: BLOG_STATUS) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid blog ID');
  }

  const existing = await Blog.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  const updateDoc: Record<string, any> = { status };
  if (status === BLOG_STATUS.PUBLISHED && !existing.publishedAt) {
    updateDoc.publishedAt = new Date();
  }

  const result = await Blog.findByIdAndUpdate(id, updateDoc, {
    new: true,
    runValidators: true,
  }).populate([
    { path: 'author', select: 'name email image' },
    { path: 'category', select: 'name slug' },
  ]);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  if (status === BLOG_STATUS.PUBLISHED && existing.status !== BLOG_STATUS.PUBLISHED) {
    dispatchBlogPublishedNotification(result);
  }

  return result;
};

const toggleBlogFeaturedToDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid blog ID');
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  blog.isFeatured = !blog.isFeatured;
  await blog.save();

  return blog;
};

const deleteBlogFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid blog ID');
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  if (blog.image) {
    unlinkFile(blog.image);
  }

  const result = await Blog.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Unable to delete blog');
  }

  return result;
};

const blogStats = async () => {
  const [stats] = await Blog.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        published: {
          $sum: {
            $cond: [{ $eq: ['$status', BLOG_STATUS.PUBLISHED] }, 1, 0],
          },
        },
        draft: {
          $sum: {
            $cond: [{ $eq: ['$status', BLOG_STATUS.DRAFT] }, 1, 0],
          },
        },
        archived: {
          $sum: {
            $cond: [{ $eq: ['$status', BLOG_STATUS.ARCHIVED] }, 1, 0],
          },
        },
        featured: {
          $sum: {
            $cond: [{ $eq: ['$isFeatured', true] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    total: stats?.total || 0,
    published: stats?.published || 0,
    draft: stats?.draft || 0,
    archived: stats?.archived || 0,
    featured: stats?.featured || 0,
  };
};

export const BlogServices = {
  createBlogToDB,
  getAllBlogsFromDB,
  getSingleBlogFromDB,
  updateBlogToDB,
  updateBlogStatusToDB,
  toggleBlogFeaturedToDB,
  deleteBlogFromDB,
  blogStats,
};
