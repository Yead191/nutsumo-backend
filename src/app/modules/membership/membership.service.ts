import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IMembership } from './membership.interface';
import { Membership } from './membership.model';
import stripe from '../../../config/stripe';
import config from '../../../config';

const createMembershipToDB = async (payload: IMembership) => {
  const product = await stripe.products.create({
    name: payload.name,
    description: payload.tagline,
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: Math.round(payload.price * 100),
    recurring: {
      interval: payload.recurring,
      interval_count: payload.interval || 1,
    },
  });

  const result = await Membership.create({
    ...payload,
    productId: product.id,
    priceId: price.id,
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata: {
      paymentType: 'membership',
      membershipId: result._id.toString(),
    },
    subscription_data: {
      metadata: {
        paymentType: 'membership',
        membershipId: result._id.toString(),
      },
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${config.frontend_url}/payment/success?type=membership`,
      },
    },
  });

  result.paymentUrl = paymentLink.url;
  await result.save();
  return result;
};

const getAllMembershipFromDB = async (query: Record<string, any>) => {
  const membershipQuery = new QueryBuilder(Membership.find(), query)
    .search(['name', 'tagline'])
    .filter()
    .sort()
    .paginate()
    .fields();
  const [membership, pagination] = await Promise.all([
    membershipQuery.modelQuery.lean(),
    membershipQuery.getPaginationInfo(),
  ]);
  return { membership, pagination };
};

const getMembershipByIdFromDB = async (id: string) => {
  const result = await Membership.findById(id);
  return result;
};

const updateMembershipToDB = async (
  id: string,
  payload: Partial<IMembership>,
) => {
  const isMembershipExist = await Membership.findById(id);
  if (!isMembershipExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Membership not found');
  }

  if (payload.name || payload.tagline) {
    await stripe.products.update(isMembershipExist.productId, {
      name: payload.name || isMembershipExist.name,
      description: payload.tagline || isMembershipExist.tagline,
    });
  }

  if (payload.price && isMembershipExist.price != payload.price) {
    await stripe.prices.update(isMembershipExist.priceId, {
      active: false,
    });
    const newPrice = await stripe.prices.create({
      product: isMembershipExist.productId,
      currency: 'usd',
      unit_amount: Math.round(payload.price * 100),
      recurring: {
        interval: payload.recurring || isMembershipExist.recurring,
        interval_count: payload.interval || isMembershipExist.interval,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: newPrice.id,
          quantity: 1,
        },
      ],
      metadata: {
        paymentType: 'membership',
        membershipId: id,
      },
      subscription_data: {
        metadata: {
          paymentType: 'membership',
          membershipId: id,
        },
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `https://hubology-client-7827b.web.app/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        },
      },
    });

    payload.paymentUrl = paymentLink.url;
    payload.priceId = newPrice.id;
  }

  const result = await Membership.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteMembershipToDB = async (id: string) => {
  const isMembershipExist = await Membership.findById(id);
  if (!isMembershipExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Membership not found');
  }
  const result = await Membership.findByIdAndDelete(id);
  return result;
};

export const MembershipServices = {
  createMembershipToDB,
  getAllMembershipFromDB,
  getMembershipByIdFromDB,
  updateMembershipToDB,
  deleteMembershipToDB,
};
