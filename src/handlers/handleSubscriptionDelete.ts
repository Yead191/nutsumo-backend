import { Subscription } from '../app/modules/subscription/subscription.model';
import { SubscriptionServices } from '../app/modules/subscription/subscription.service';
import mongoose from 'mongoose';

const handleSubscriptionDelete = async (id: string) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    await Subscription.findOneAndUpdate(
      { $or: [{ trxId: id }, { payment_intent_id: id }] },
      {
        status: 'cancel',
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    return {
      success: true,
      message: 'Subscription deleted successfully!',
    };
  } catch (error) {
    session.abortTransaction();
    session.endSession();
    return {
      success: false,
      message: 'Subscription deletion failed!',
    };
  }
};

export default handleSubscriptionDelete;
