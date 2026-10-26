import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../../errors/ApiError';
import { USER_ROLES } from '../../../../enums/user';
import QueryBuilder from '../../../builder/QueryBuilder';
import { User } from '../../user/user.model';
import { Community } from './community.model';
import { ICommunity } from './community.interface';
import { CommunityLike } from '../communityLike/communityLike.model';
import { CommunityComment } from '../communityComment/communityComment.model';
import { sendNotificationToAllUsers } from '../../notification/notification.util';
import { emailHelper } from '../../../../helpers/emailHelper';
import unlinkFile from '../../../../shared/unlinkFile';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Asynchronous broadcast of branded emails to all active members
// const dispatchCommunityEmailBroadcast = async (
//   post: any,
//   authorName: string,
// ) => {
//   try {
//     const users = await User.find({
//       status: 'active',
//       verified: true,
//       email: { $exists: true, $ne: '' },
//     })
//       .select('name email')
//       .lean();

//     if (!users || users.length === 0) return;

//     for (const u of users) {
//       if (!u.email) continue;
//       const emailPayload = communityPostTemplate({
//         userName: u.name || 'Valued Member',
//         userEmail: u.email,
//         postTitle: post.title,
//         postContent: post.content,
//         authorName,
//         postId: post._id.toString(),
//       });

//       let attempts = 0;
//       let sent = false;
//       while (attempts < 3 && !sent) {
//         attempts++;
//         try {
//           await emailHelper.sendEmail(emailPayload);
//           sent = true;
//         } catch (err: any) {
//           const isRateLimit =
//             err?.responseCode === 432 ||
//             err?.message?.includes('432') ||
//             err?.message?.includes('limit exceeded') ||
//             err?.message?.includes('Concurrent');

//           if (isRateLimit && attempts < 3) {
//             console.warn(
//               `SMTP rate limit hit for ${u.email}. Retrying in 2s (attempt ${attempts}/3)...`,
//             );
//             await sleep(2000);
//           } else {
//             console.error(
//               `Failed to send community email to ${u.email}:`,
//               err?.message || err,
//             );
//             break;
//           }
//         }
//       }

//       // Small pacing delay between emails to avoid bursting SMTP server
//       await sleep(350);
//     }
//   } catch (error) {
//     console.error('Community email broadcast error:', error);
//   }
// };

const createPostToDB = async (
  user: JwtPayload,
  payload: Partial<ICommunity>,
) => {
  if (
    ![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
      user.role as USER_ROLES,
    )
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only administrators can publish forum discussions and announcements.',
    );
  }

  const post = await Community.create({
    ...payload,
    author: user.id,
    status: payload.status || 'published',
    totalLikes: 0,
    totalComments: 0,
  });

  const populatedPost = await Community.findById(post._id).populate({
    path: 'author',
    select: 'name email image role',
  });

  // If published, trigger in-app notifications and email broadcast to all users
  if (post.status === 'published') {
    const authorUser = await User.findById(user.id).select('name');
    const authorName = authorUser?.name || 'iFundAyiti Administration';
    const displayTitle = post.title || 'New Forum Discussion';

    // 1. Broadcast in-app & socket notification
    sendNotificationToAllUsers({
      title: `💬 New Discussion: ${displayTitle}`,
      message: `${authorName} started a new topic: "${post.content.slice(0, 90)}${post.content.length > 90 ? '...' : ''}"`,
      path: `/community/${post._id}`,
      refId: post._id,
      type: 'community',
    }).catch(err => {
      console.error('In-app notification broadcast error:', err);
    });
  }

  return populatedPost || post;
};

const getAllPostsFromDB = async (
  user?: JwtPayload,
  query: Record<string, any> = {},
) => {
  const isAdmin =
    user && [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(user.role);

  const filter: Record<string, any> = isAdmin ? {} : { status: 'published' };

  const queryParams = { ...query };
  if (!queryParams.sort) {
    queryParams.sort = '-isPinned -createdAt';
  }

  const postsQuery = new QueryBuilder(Community.find(filter), queryParams)
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields()
    .populate(['author'], {
      author: 'name email image role',
    });

  const [rawPosts, pagination] = await Promise.all([
    postsQuery.modelQuery.lean(),
    postsQuery.getPaginationInfo(),
  ]);

  // Compute isLiked flag if caller is authenticated
  const posts = await Promise.all(
    rawPosts.map(async (p: any) => {
      const isLiked = user?.id
        ? await CommunityLike.isLikeByMe(user.id, p._id)
        : false;
      return {
        ...p,
        isLikedByMe: isLiked,
      };
    }),
  );

  return { posts, pagination };
};

const getSinglePostFromDB = async (id: string, user?: JwtPayload) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID');
  }

  const post = await Community.findById(id)
    .populate('author', 'name email image role')
    .lean();

  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found!');
  }

  const isLiked = user?.id
    ? await CommunityLike.isLikeByMe(user.id, id)
    : false;

  return {
    ...post,
    isLikedByMe: isLiked,
  };
};

const updatePostToDB = async (
  user: JwtPayload,
  payload: Partial<ICommunity>,
  postId: string,
) => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID');
  }

  if (
    ![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
      user.role as USER_ROLES,
    )
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only administrators can edit forum discussions.',
    );
  }

  const post = await Community.findById(postId);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found!');
  }

  // If new images provided and existing images exist, clean up old replaced images
  if (payload.images && post.images && Array.isArray(post.images)) {
    const imagesToKeep = new Set(payload.images);
    post.images.forEach(img => {
      if (!imagesToKeep.has(img) && !img.startsWith('http')) {
        unlinkFile(img);
      }
    });
  }

  const result = await Community.findByIdAndUpdate(postId, payload, {
    new: true,
    runValidators: true,
  }).populate('author', 'name email image role');

  return result;
};

const deletePostFromDB = async (user: JwtPayload, id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid post ID');
  }

  if (
    ![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(
      user.role as USER_ROLES,
    )
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only administrators can delete forum discussions.',
    );
  }

  const post = await Community.findById(id);
  if (!post) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Post not found!');
  }

  // Clean up physical images from disk
  if (post.images && Array.isArray(post.images)) {
    post.images.forEach(img => {
      if (!img.startsWith('http')) {
        unlinkFile(img);
      }
    });
  }

  // Delete post, associated likes, comments, and comment likes
  await Promise.all([
    Community.findByIdAndDelete(id),
    CommunityLike.deleteMany({ post: id }),
    CommunityComment.deleteMany({ post: id }),
  ]);

  return { success: true };
};

const getMyPosts = async (user: JwtPayload, query: Record<string, any>) => {
  const myPostsQuery = new QueryBuilder(
    Community.find({ author: user.id }),
    query,
  )
    .search(['title', 'content'])
    .filter()
    .sort()
    .paginate()
    .fields()
    .populate(['author'], {
      author: 'name email image role',
    });

  const [myPosts, pagination] = await Promise.all([
    myPostsQuery.modelQuery.lean(),
    myPostsQuery.getPaginationInfo(),
  ]);

  return { myPosts, pagination };
};

export const CommunityServices = {
  createPostToDB,
  getAllPostsFromDB,
  getSinglePostFromDB,
  updatePostToDB,
  deletePostFromDB,
  getMyPosts,
};
