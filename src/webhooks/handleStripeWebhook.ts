import { Request, Response } from 'express';
import stripe from '../config/stripe';
import config from '../config';
import Stripe from 'stripe';
import { handleMembershipCheckout } from '../handlers/handleMembershipCheckout';
import { handleInvoicePaymentSucceeded } from '../handlers/handleInvoicePaymentSucceeded';
import { handleInvoicePaymentFailed } from '../handlers/handleInvoicePaymentFailed';
import handleSubscriptionDelete from '../handlers/handleSubscriptionDelete';
import { handleSubscriptionUpdated } from '../handlers/handleSubscriptionUpdated';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhook_secret!,
      );
    } catch (err: any) {
      console.error(`Webhook Signature Verification Failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.membershipId) {
          await handleMembershipCheckout(session);
        }
        break;

      case 'customer.subscription.created':
        // Membership checkout is handled on 'checkout.session.completed' to prevent duplicate execution & Mongo WriteConflicts
        break;

      case 'invoice.payment_succeeded':
        const invoicePaid = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoicePaid);
        break;

      case 'invoice.payment_failed':
        const invoiceFailed = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoiceFailed);
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDelete(deletedSub.id);
        break;

      case 'customer.subscription.updated':
        const updatedSub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(updatedSub);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe Webhook Processing Error:', error);
    return res.status(500).send('Internal Server Error');
  }
};
