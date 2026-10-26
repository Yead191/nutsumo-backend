import { JwtPayload } from 'jsonwebtoken';
import { Blog } from '../blog/blog.model';
import { BLOG_STATUS } from '../blog/blog.constants';
import ApiError from '../../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Like } from './like.model';
import QueryBuilder from '../../../builder/QueryBuilder';
import { Notification } from '../../notification/notification.model';
import { User } from '../../user/user.model';
import { Types } from 'mongoose';
import { USER_ROLES } from '../../../../enums/user';

const toggleLikeToDB = async (user: JwtPayload, blogIdOrSlug: string) => {
  const isObjectId = Types.ObjectId.isValid(blogIdOrSlug);
  const blog = await Blog.findOne(
    isObjectId ? { _id: blogIdOrSlug } : { slug: blogIdOrSlug.toLowerCase() },
  );

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found!');
  }

  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  );
  if (blog.status !== BLOG_STATUS.PUBLISHED && !isAdmin) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This blog is not published yet!',
    );
  }

  const existingLike = await Like.findOne({
    blog: blog._id,
    user: user.id,
  });

  const io = (global as any).socketServer;

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
  } else {
    const likedBy = await User.findById(user.id).select('name');
    await Like.create({
      blog: blog._id,
      user: user.id,
    });

    // Notify blog author if someone else liked their blog
    if (blog.author && blog.author.toString() !== user.id) {
      const notification = await Notification.create({
        receiver: blog.author,
        sender: new Types.ObjectId(user.id),
        title: `${likedBy?.name || 'A user'} liked your blog article`,
        message: `${likedBy?.name || 'A user'} liked "${blog.title}"`,
        seen: false,
        path: `/blogs/${blog.slug}`,
        refId: blog._id,
        type: 'like',
      });

      io?.emit(`getNotification::${blog.author}`, notification);
    }
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    blog._id,
    {
      $inc: {
        totalLikes: existingLike ? -1 : 1,
      },
    },
    {
      new: true,
      select: 'totalLikes',
    },
  );

  // Ensure totalLikes is not negative
  if (updatedBlog && updatedBlog.totalLikes < 0) {
    await Blog.findByIdAndUpdate(blog._id, { $set: { totalLikes: 0 } });
    updatedBlog.totalLikes = 0;
  }

  return {
    liked: !existingLike,
    totalLikes: updatedBlog?.totalLikes ?? 0,
  };
};

const getAllLikeFromDB = async (
  query: Record<string, any>,
  blogIdOrSlug: string,
) => {
  const isObjectId = Types.ObjectId.isValid(blogIdOrSlug);
  const blog = await Blog.findOne(
    isObjectId ? { _id: blogIdOrSlug } : { slug: blogIdOrSlug.toLowerCase() },
  );

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found!');
  }

  const qb = new QueryBuilder(Like.find({ blog: blog._id }), query)
    .sort()
    .paginate()
    .populate(['user'], {
      user: 'name email image role',
    });

  const [result, meta] = await Promise.all([
    qb.modelQuery.lean(),
    qb.getPaginationInfo(),
  ]);

  return { result, meta };
};

const getMyLikeFromDB = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const qb = new QueryBuilder(
    Like.find({ user: user.id })
      .populate('user', 'name email image')
      .populate({
        path: 'blog',
        select:
          'title slug image category author totalLikes totalComments isFeatured publishedAt createdAt',
        populate: [
          { path: 'author', select: 'name image role' },
          { path: 'category', select: 'name slug' },
        ],
      }),
    query,
  )
    .sort()
    .paginate();

  const [result, meta] = await Promise.all([
    qb.modelQuery.lean(),
    qb.getPaginationInfo(),
  ]);

  return { result, meta };
};

export const LikeServices = {
  toggleLikeToDB,
  getMyLikeFromDB,
  getAllLikeFromDB,
};
