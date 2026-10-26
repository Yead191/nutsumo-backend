import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../../errors/ApiError';
import QueryBuilder from '../../../builder/QueryBuilder';
import { Notification } from '../../notification/notification.model';
import { User } from '../../user/user.model';
import { Community } from '../community/community.model';
import { CommunityLike } from './communityLike.model';

const toggleLikeToDB = async (user: JwtPayload, postId: string) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID!');
  }

  const post = await Community.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found!');
  }

  if (post.status === 'archived') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This post is archived and cannot be liked!',
    );
  }

  const existingLike = await CommunityLike.findOne({
    post: postId,
    user: user.id,
  });

  const io = (global as any).socketServer;

  if (existingLike) {
    await CommunityLike.findByIdAndDelete(existingLike._id);
  } else {
    await CommunityLike.create({
      post: postId,
      user: user.id,
    });

    // Notify post author if liked by another user
    if (post.author && post.author.toString() !== user.id) {
      const likedBy = await User.findById(user.id).select('name');
      const notification = await Notification.create({
        receiver: post.author,
        sender: new Types.ObjectId(user.id),
        title: `${likedBy?.name || 'A community member'} liked your forum post`,
        message: `${likedBy?.name || 'A community member'} liked your post "${post.title || post.content.slice(0, 50)}"`,
        seen: false,
        path: `/community/${postId}`,
        refId: post._id,
        type: 'community',
      });

      io?.emit(`getNotification::${post.author}`, notification);
    }
  }

  const updatedPost = await Community.findByIdAndUpdate(
    postId,
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
  if (updatedPost && updatedPost.totalLikes < 0) {
    await Community.findByIdAndUpdate(postId, { $set: { totalLikes: 0 } });
    updatedPost.totalLikes = 0;
  }

  return {
    liked: !existingLike,
    totalLikes: updatedPost?.totalLikes ?? 0,
  };
};

const getAllLikesFromDB = async (
  query: Record<string, any>,
  postId: string,
) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID!');
  }

  const qb = new QueryBuilder(CommunityLike.find({ post: postId }), query)
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

const getMyLikesFromDB = async (
  user: JwtPayload,
  query: Record<string, any>,
) => {
  const qb = new QueryBuilder(
    CommunityLike.find({ user: user.id })
      .populate('user', 'name email image')
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

  const [result, meta] = await Promise.all([
    qb.modelQuery.lean(),
    qb.getPaginationInfo(),
  ]);

  return { result, meta };
};

export const CommunityLikeServices = {
  toggleLikeToDB,
  getAllLikesFromDB,
  getMyLikesFromDB,
};
