import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';

import stripe from '../config/stripe';
import ApiError from '../errors/ApiError';
import mongoose from 'mongoose';
const User:any = "";

export const handleAccountUpdatedEvent = async (data: Stripe.Account) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
            // Find the user by Stripe account ID
    const existingUser = await User.findOne({ 'stripeAccountInfo.accountId': data.id });

    if (!existingUser) {
        return console.log('User not found');
    }

    // Check if the onboarding is complete
    if (data.charges_enabled) {
        const loginLink = await stripe.accounts.createLoginLink(data.id);

        // Save Stripe account information to the user record
        await User.findByIdAndUpdate(existingUser?._id, {
            stripeAccountInfo: {
                accountId: data.id,
                loginUrl: loginLink.url,
            }
        },{session});
    }

        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}