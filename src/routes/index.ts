import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';

import { NotificationRoutes } from '../app/modules/notification/notification.route';
import { MembershipRoutes } from '../app/modules/membership/membership.route';

import { TransactionRoutes } from '../app/modules/transaction/transaction.route';
import { SubscriptionRoutes } from '../app/modules/subscription/subscription.route';
import { TestimonialRoutes } from '../app/modules/testimonial/testimonial.route';
import { InquiryRoutes } from '../app/modules/inquiry/inquiry.route';
import { DisclaimerRoutes } from '../app/modules/disclaimer/disclaimer.route';
import { FaqRoutes } from '../app/modules/faq/faq.route';
import { BlogRoutes } from '../app/modules/blogs/blog/blog.route';
import { BlogCategoryRoutes } from '../app/modules/blogs/blogcategory/blogcategory.route';
import { LikeRoutes } from '../app/modules/blogs/like/like.route';
import { CommunityRoutes } from '../app/modules/community/community/community.route';
import { CommunityLikeRoutes } from '../app/modules/community/communityLike/communityLike.route';
import { CommunityCommentRoutes } from '../app/modules/community/communityComment/communityComment.route';
import { CommentRoutes } from '../app/modules/blogs/comment/comment.route';
import { CategoryRoutes } from '../app/modules/category/category.route';
import { ServiceRoutes } from '../app/modules/service/service.route';
import { ArtisanServiceRoutes } from '../app/modules/artisanService/artisanService.route';
import { PortfolioRoutes } from '../app/modules/portfolio/portfolio.route';
const router = express.Router();

const apiRoutes = [
  {
    path: '/category',
    route: CategoryRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/service-category',
    route: CategoryRoutes,
  },
  {
    path: '/service',
    route: ServiceRoutes,
  },
  {
    path: '/services',
    route: ServiceRoutes,
  },
  {
    path: '/artisan-service',
    route: ArtisanServiceRoutes,
  },
  {
    path: '/artisan-services',
    route: ArtisanServiceRoutes,
  },
  {
    path: '/portfolio',
    route: PortfolioRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },

  {
    path: '/notification',
    route: NotificationRoutes,
  },
  {
    path: '/membership',
    route: MembershipRoutes,
  },

  {
    path: '/transaction',
    route: TransactionRoutes,
  },
  {
    path: '/subscription',
    route: SubscriptionRoutes,
  },

  {
    path: '/testimonial',
    route: TestimonialRoutes,
  },
  {
    path: '/inquiry',
    route: InquiryRoutes,
  },
  {
    path: '/disclaimer',
    route: DisclaimerRoutes,
  },
  {
    path: '/faq',
    route: FaqRoutes,
  },
  {
    path: '/faqs',
    route: FaqRoutes,
  },

  {
    path: '/blog',
    route: BlogRoutes,
  },
  {
    path: '/blogs',
    route: BlogRoutes,
  },
  {
    path: '/blog-category',
    route: BlogCategoryRoutes,
  },
  {
    path: '/blogcategory',
    route: BlogCategoryRoutes,
  },
  {
    path: '/like',
    route: LikeRoutes,
  },
  {
    path: '/likes',
    route: LikeRoutes,
  },
  {
    path: '/blog-like',
    route: LikeRoutes,
  },
  {
    path: '/comment',
    route: CommentRoutes,
  },
  {
    path: '/comments',
    route: CommentRoutes,
  },
  {
    path: '/blog-comment',
    route: CommentRoutes,
  },

  {
    path: '/community',
    route: CommunityRoutes,
  },
  {
    path: '/community-like',
    route: CommunityLikeRoutes,
  },
  {
    path: '/community/like',
    route: CommunityLikeRoutes,
  },
  {
    path: '/community-comment',
    route: CommunityCommentRoutes,
  },
  {
    path: '/community/comment',
    route: CommunityCommentRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
