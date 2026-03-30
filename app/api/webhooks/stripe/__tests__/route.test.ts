/** @jest-environment node */

var mockConstructEvent = jest.fn();
var mockRetrieveSubscription = jest.fn();
var mockSyncStripeSubscription = jest.fn();
var mockUpdateUserStripeCustomerId = jest.fn();
var mockGetStripeWebhookSecrets = jest.fn();

jest.mock('../../../../../lib/billing', () => ({
  syncStripeSubscription: (...args: unknown[]) => mockSyncStripeSubscription(...args),
  updateUserStripeCustomerId: (...args: unknown[]) => mockUpdateUserStripeCustomerId(...args),
}));

jest.mock('../../../../../lib/stripe', () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) => mockRetrieveSubscription(...args),
    },
  }),
  getStripeWebhookSecrets: (...args: unknown[]) => mockGetStripeWebhookSecrets(...args),
}));

import { POST } from '../route';

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    mockGetStripeWebhookSecrets.mockReturnValue(['whsec_test']);
    mockRetrieveSubscription.mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_123', recurring: { interval: 'month' } } }] },
      status: 'active',
      current_period_start: 1,
      current_period_end: 2,
      cancel_at_period_end: false,
    });
    mockSyncStripeSubscription.mockResolvedValue(undefined);
    mockUpdateUserStripeCustomerId.mockResolvedValue(undefined);
  });

  it('returns 400 when the Stripe signature is missing', async () => {
    const response = await POST({ headers: new Headers(), text: async () => '' } as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ message: 'Missing Stripe signature' });
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it('handles checkout.session.completed by updating the user and syncing the subscription', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-1',
          customer: 'cus_123',
          mode: 'subscription',
          subscription: 'sub_123',
        },
      },
    });

    const response = await POST({
      headers: new Headers({ 'stripe-signature': 'sig_test' }),
      text: async () => 'payload',
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenCalledWith('payload', 'sig_test', 'whsec_test');
    expect(mockUpdateUserStripeCustomerId).toHaveBeenCalledWith({
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
    });
    expect(mockRetrieveSubscription).toHaveBeenCalledWith('sub_123');
    expect(mockSyncStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub_123' }),
    );
    expect(body).toEqual({ received: true });
  });

  it('retries signature verification with additional webhook secrets', async () => {
    mockGetStripeWebhookSecrets.mockReturnValue(['whsec_old', 'whsec_new']);
    mockConstructEvent
      .mockImplementationOnce(() => {
        throw new Error('No signatures found matching the expected signature for payload.');
      })
      .mockReturnValueOnce({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_retry',
            customer: 'cus_789',
            items: { data: [{ price: { id: 'price_123', recurring: { interval: 'month' } } }] },
            status: 'active',
            current_period_start: 1,
            current_period_end: 2,
            cancel_at_period_end: false,
          },
        },
      });

    const response = await POST({
      headers: new Headers({ 'stripe-signature': 'sig_test' }),
      text: async () => 'payload',
    } as never);

    expect(response.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenNthCalledWith(1, 'payload', 'sig_test', 'whsec_old');
    expect(mockConstructEvent).toHaveBeenNthCalledWith(2, 'payload', 'sig_test', 'whsec_new');
    expect(mockSyncStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub_retry' }),
    );
  });

  it('handles subscription lifecycle events without retrieving a second subscription', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_direct',
          customer: 'cus_456',
          items: { data: [{ price: { id: 'price_123', recurring: { interval: 'month' } } }] },
          status: 'active',
          current_period_start: 1,
          current_period_end: 2,
          cancel_at_period_end: false,
        },
      },
    });

    const response = await POST({
      headers: new Headers({ 'stripe-signature': 'sig_test' }),
      text: async () => 'payload',
    } as never);

    expect(response.status).toBe(200);
    expect(mockRetrieveSubscription).not.toHaveBeenCalled();
    expect(mockSyncStripeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sub_direct' }),
    );
  });
});
