import { JwtPayload } from 'jsonwebtoken';
import { IComment } from './comment.interface';
import { Blog } from '../blog/blog.model';
import { BLOG_STATUS } from '../blog/blog.constants';
import ApiError from '../../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { Comment } from './comment.model';
import QueryBuilder from '../../../builder/QueryBuilder';
import { User } from '../../user/user.model';
import { Notification } from '../../notification/notification.model';
import { Types } from 'mongoose';
import { USER_ROLES } from '../../../../enums/user';

const createCommentToDB = async (
  user: JwtPayload,
  blogIdOrSlug: string,
  payload: { text: string },
) => {
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

  const commentData = {
    text: payload.text,
    blog: blog._id,
    author: new Types.ObjectId(user.id),
  };

  const createdComment = await Comment.create(commentData);
  const result = await Comment.findById(createdComment._id).populate({
    path: 'author',
    select: 'name email image role',
  });

  // Increment totalComments count on Blog
  await Blog.findByIdAndUpdate(blog._id, {
    $inc: { totalComments: 1 },
  });

  // Send notification to blog author if commenter is someone else
  if (blog.author && blog.author.toString() !== user.id) {
    const commentedBy = await User.findById(user.id).select('name');
    const io = (global as any).socketServer;

    const notification = await Notification.create({
      receiver: blog.author,
      sender: new Types.ObjectId(user.id),
      title: `${commentedBy?.name || 'A user'} commented on your blog article`,
      message: `${commentedBy?.name || 'A user'} commented: "${payload.text.slice(0, 80)}${payload.text.length > 80 ? '...' : ''}"`,
      seen: false,
      path: `/blogs/${blog.slug}`,
      refId: blog._id,
      type: 'comment',
    });

    io?.emit(`getNotification::${blog.author}`, notification);
  }

  return result;
};

const getPostCommentsFromDB = async (
  blogIdOrSlug: string,
  query: Record<string, any>,
) => {
  const isObjectId = Types.ObjectId.isValid(blogIdOrSlug);
  const blog = await Blog.findOne(
    isObjectId ? { _id: blogIdOrSlug } : { slug: blogIdOrSlug.toLowerCase() },
  );

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found!');
  }

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = '-createdAt';
  }

  const commentsQuery = new QueryBuilder(
    Comment.find({ blog: blog._id }),
    queryParams,
  )
    .sort()
    .paginate()
    .fields()
    .populate(['author'], {
      author: 'name email image role',
    });

  const [comments, meta] = await Promise.all([
    commentsQuery.modelQuery.lean(),
    commentsQuery.getPaginationInfo(),
  ]);

  return { comments, meta };
};

const updateComment = async (
  commentId: string,
  user: JwtPayload,
  payload: { text: string },
) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found!');
  }

  if (user.id !== comment.author.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this comment!',
    );
  }

  const result = await Comment.findByIdAndUpdate(
    commentId,
    { text: payload.text },
    { new: true, runValidators: true },
  ).populate({
    path: 'author',
    select: 'name email image role',
  });

  return result;
};

const deleteComment = async (commentId: string, user: JwtPayload) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found!');
  }

  const isAdmin = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
    user.role,
  );
  if (user.id !== comment.author.toString() && !isAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to delete this comment!',
    );
  }

  const result = await Comment.findByIdAndDelete(commentId);

  // Decrement totalComments on Blog
  if (comment.blog) {
    const updatedBlog = await Blog.findByIdAndUpdate(
      comment.blog,
      { $inc: { totalComments: -1 } },
      { new: true, select: 'totalComments' },
    );
    if (updatedBlog && updatedBlog.totalComments < 0) {
      await Blog.findByIdAndUpdate(comment.blog, {
        $set: { totalComments: 0 },
      });
    }
  }

  return result;
};

// My commented blogs
const myCommentedPostsFromDB = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const commentsQuery = new QueryBuilder(
    Comment.find({ author: user.id })
      .populate('author', 'name email image role')
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

  const [posts, pagination] = await Promise.all([
    commentsQuery.modelQuery.lean(),
    commentsQuery.getPaginationInfo(),
  ]);

  return {
    posts,
    pagination,
  };
};

export const CommentServices = {
  createCommentToDB,
  getPostCommentsFromDB,
  updateComment,
  deleteComment,
  myCommentedPostsFromDB,
};
