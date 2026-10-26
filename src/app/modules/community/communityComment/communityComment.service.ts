import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../../errors/ApiError';
import QueryBuilder from '../../../builder/QueryBuilder';
import { Notification } from '../../notification/notification.model';
import { User } from '../../user/user.model';
import { Community } from '../community/community.model';
import {
  CommunityComment,
  CommunityCommentLike,
} from './communityComment.model';
import { USER_ROLES } from '../../../../enums/user';

const createCommentToDB = async (
  user: JwtPayload,
  postId: string,
  payload: { text: string },
) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await Community.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found!');
  }

  if (post.isLocked) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This discussion has been locked by administrators.',
    );
  }

  const text = payload.text || (payload as any).comment;
  if (!text) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Comment text is required');
  }

  const comment = await CommunityComment.create({
    post: postId,
    author: user.id,
    text,
    parentComment: null,
  });

  const populated = await CommunityComment.findById(comment._id).populate({
    path: 'author',
    select: 'name email image role',
  });

  // Increment totalComments on Community post
  await Community.findByIdAndUpdate(postId, {
    $inc: { totalComments: 1 },
  });

  // Notify post author if commenter is someone else
  if (post.author && post.author.toString() !== user.id) {
    const commenter = await User.findById(user.id).select('name');
    const io = (global as any).socketServer;

    const notification = await Notification.create({
      receiver: post.author,
      sender: new Types.ObjectId(user.id),
      title: `${commenter?.name || 'A community member'} commented on your post`,
      message: `"${payload.text.slice(0, 80)}${payload.text.length > 80 ? '...' : ''}"`,
      seen: false,
      path: `/community/${postId}`,
      refId: post._id,
      type: 'community',
    });

    io?.emit(`getNotification::${post.author}`, notification);
  }

  return populated;
};

const replyToCommentToDB = async (
  user: JwtPayload,
  parentCommentId: string,
  payload: { text: string },
) => {
  if (!Types.ObjectId.isValid(parentCommentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid parent comment ID');
  }

  const parentComment = await CommunityComment.findById(parentCommentId);
  if (!parentComment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parent comment not found!');
  }

  const post = await Community.findById(parentComment.post);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Associated post not found!');
  }

  if (post.isLocked) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'This discussion has been locked by administrators.',
    );
  }

  const text = payload.text || (payload as any).comment;
  if (!text) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reply text is required');
  }

  const reply = await CommunityComment.create({
    post: parentComment.post,
    author: user.id,
    text,
    parentComment: parentCommentId,
  });

  const populated = await CommunityComment.findById(reply._id).populate({
    path: 'author',
    select: 'name email image role',
  });

  // Increment replies count on parent comment and comments on post
  await Promise.all([
    CommunityComment.findByIdAndUpdate(parentCommentId, {
      $inc: { totalReplies: 1 },
    }),
    Community.findByIdAndUpdate(parentComment.post, {
      $inc: { totalComments: 1 },
    }),
  ]);

  // Notify parent comment author if replier is someone else
  if (parentComment.author && parentComment.author.toString() !== user.id) {
    const replier = await User.findById(user.id).select('name');
    const io = (global as any).socketServer;

    const notification = await Notification.create({
      receiver: parentComment.author,
      sender: new Types.ObjectId(user.id),
      title: `${replier?.name || 'A community member'} replied to your comment`,
      message: `"${payload.text.slice(0, 80)}${payload.text.length > 80 ? '...' : ''}"`,
      seen: false,
      path: `/community/${parentComment.post}`,
      refId: parentComment.post,
      type: 'community',
    });

    io?.emit(`getNotification::${parentComment.author}`, notification);
  }

  return populated;
};

const toggleCommentLikeToDB = async (user: JwtPayload, commentId: string) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await CommunityComment.findById(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found!');
  }

  const existingLike = await CommunityCommentLike.findOne({
    comment: commentId,
    user: user.id,
  });

  const io = (global as any).socketServer;

  if (existingLike) {
    await CommunityCommentLike.findByIdAndDelete(existingLike._id);
  } else {
    await CommunityCommentLike.create({
      comment: commentId,
      user: user.id,
    });

    // Notify comment author if someone else liked their comment
    if (comment.author && comment.author.toString() !== user.id) {
      const likedBy = await User.findById(user.id).select('name');
      const notification = await Notification.create({
        receiver: comment.author,
        sender: new Types.ObjectId(user.id),
        title: `${likedBy?.name || 'A community member'} liked your comment`,
        message: `"${comment.text.slice(0, 60)}${comment.text.length > 60 ? '...' : ''}"`,
        seen: false,
        path: `/community/${comment.post}`,
        refId: comment.post,
        type: 'community',
      });

      io?.emit(`getNotification::${comment.author}`, notification);
    }
  }

  const updatedComment = await CommunityComment.findByIdAndUpdate(
    commentId,
    {
      $inc: { totalLikes: existingLike ? -1 : 1 },
    },
    { new: true, select: 'totalLikes' },
  );

  if (updatedComment && updatedComment.totalLikes < 0) {
    await CommunityComment.findByIdAndUpdate(commentId, {
      $set: { totalLikes: 0 },
    });
    updatedComment.totalLikes = 0;
  }

  return {
    liked: !existingLike,
    totalLikes: updatedComment?.totalLikes ?? 0,
  };
};

const getPostCommentsFromDB = async (
  postId: string,
  query: Record<string, any>,
  user?: JwtPayload,
) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID');
  }

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = '-createdAt';
  }

  // Fetch only top-level comments for the post
  const commentsQuery = new QueryBuilder(
    CommunityComment.find({ post: postId, parentComment: null }),
    queryParams,
  )
    .sort()
    .paginate()
    .fields()
    .populate(['author'], {
      author: 'name email image role',
    });

  const [rawComments, meta] = await Promise.all([
    commentsQuery.modelQuery.lean(),
    commentsQuery.getPaginationInfo(),
  ]);

  // Compute isLiked for each comment if user is logged in
  const comments = await Promise.all(
    rawComments.map(async (c: any) => {
      const isLiked = user?.id
        ? await CommunityCommentLike.isLikeByMe(user.id, c._id)
        : false;
      return {
        ...c,
        isLikedByMe: isLiked,
      };
    }),
  );

  return { comments, meta };
};

const getCommentRepliesFromDB = async (
  commentId: string,
  query: Record<string, any>,
  user?: JwtPayload,
) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid comment ID');
  }

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = 'createdAt';
  }

  const repliesQuery = new QueryBuilder(
    CommunityComment.find({ parentComment: commentId }),
    queryParams,
  )
    .sort()
    .paginate()
    .fields()
    .populate(['author'], {
      author: 'name email image role',
    });

  const [rawReplies, meta] = await Promise.all([
    repliesQuery.modelQuery.lean(),
    repliesQuery.getPaginationInfo(),
  ]);

  const replies = await Promise.all(
    rawReplies.map(async (r: any) => {
      const isLiked = user?.id
        ? await CommunityCommentLike.isLikeByMe(user.id, r._id)
        : false;
      return {
        ...r,
        isLikedByMe: isLiked,
      };
    }),
  );

  return { replies, meta };
};

const updateComment = async (
  commentId: string,
  user: JwtPayload,
  payload: { text: string },
) => {
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid comment ID');
  }

  const comment = await CommunityComment.findById(commentId);
  if (!comment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Comment not found!');
  }

  if (user.id !== comment.author.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to update this comment!',
    );
  }

  const text = payload.text || (payload as any).comment;
  const result = await CommunityComment.findByIdAndUpdate(
    commentId,
    { ...(text ? { text } : {}) },
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

  const comment = await CommunityComment.findById(commentId);
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

  // Count how many replies this comment has to decrement totalComments accurately
  const replyCount = await CommunityComment.countDocuments({
    parentComment: commentId,
  });
  const totalDeletedCount = 1 + replyCount;

  // Delete comment, its replies, and related likes
  await Promise.all([
    CommunityComment.findByIdAndDelete(commentId),
    CommunityComment.deleteMany({ parentComment: commentId }),
    CommunityCommentLike.deleteMany({ comment: commentId }),
  ]);

  // If this was a reply, decrement parent's totalReplies
  if (comment.parentComment) {
    await CommunityComment.findByIdAndUpdate(comment.parentComment, {
      $inc: { totalReplies: -1 },
    });
  }

  // Decrement totalComments on Community post
  if (comment.post) {
    const updatedPost = await Community.findByIdAndUpdate(
      comment.post,
      { $inc: { totalComments: -totalDeletedCount } },
      { new: true, select: 'totalComments' },
    );
    if (updatedPost && updatedPost.totalComments < 0) {
      await Community.findByIdAndUpdate(comment.post, {
        $set: { totalComments: 0 },
      });
    }
  }

  return { success: true };
};

const getMyComments = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const commentsQuery = new QueryBuilder(
    CommunityComment.find({ author: user.id })
      .populate('author', 'name email image role')
      .populate({
        path: 'post',
        select: 'title content images author totalLikes totalComments isPinned createdAt',
        populate: {
          path: 'author',
          select: 'name image role',
        },
      }),
    query,
  )
    .sort()
    .paginate();

  const [comments, pagination] = await Promise.all([
    commentsQuery.modelQuery.lean(),
    commentsQuery.getPaginationInfo(),
  ]);

  return {
    comments,
    pagination,
  };
};

export const CommunityCommentServices = {
  createCommentToDB,
  replyToCommentToDB,
  toggleCommentLikeToDB,
  getPostCommentsFromDB,
  getCommentRepliesFromDB,
  updateComment,
  deleteComment,
  getMyComments,
};
