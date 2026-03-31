import { SubscriptionStatus } from '@prisma/client';

var mockPromoCodeFindUnique = jest.fn();
var mockPromoCodeRedemptionFindUnique = jest.fn();
var mockUserFindUnique = jest.fn();
var mockTransaction = jest.fn();

jest.mock('../prisma', () => ({
  prisma: {
    promoCode: {
      findUnique: (...args: unknown[]) => mockPromoCodeFindUnique(...args),
    },
    promoCodeRedemption: {
      findUnique: (...args: unknown[]) => mockPromoCodeRedemptionFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock('../usage', () => ({
  getCurrentMonthUsageCount: jest.fn(),
}));

jest.mock('../stripe', () => ({
  getStripeClient: jest.fn(),
}));

import { redeemInviteCodeForUser, validatePromoCodeForCheckout } from '../billing';

describe('billing promo/invite logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePromoCodeForCheckout', () => {
    it('rejects promo codes that are not discount type', async () => {
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-1',
        type: 'INVITE',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: false,
        allowedPlans: [],
        allowedBillingIntervals: [],
        stripePromotionCodeId: null,
      });

      const result = await validatePromoCodeForCheckout({
        rawCode: 'producer10',
        plan: 'COMPOSER',
        interval: 'monthly',
        userId: 'user-1',
      });

      expect(result).toEqual({ isValid: false, reason: 'invalid_type' });
    });

    it('rejects single-use codes already redeemed by the user', async () => {
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-2',
        type: 'DISCOUNT',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: true,
        allowedPlans: [],
        allowedBillingIntervals: [],
        stripePromotionCodeId: 'spc_123',
      });
      mockPromoCodeRedemptionFindUnique.mockResolvedValue({ id: 'redemption-1' });

      const result = await validatePromoCodeForCheckout({
        rawCode: 'producer10',
        plan: 'COMPOSER',
        interval: 'monthly',
        userId: 'user-1',
      });

      expect(result).toEqual({ isValid: false, reason: 'single_use_already_redeemed' });
    });

    it('returns valid normalized promo code with stripe promotion id', async () => {
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-3',
        type: 'DISCOUNT',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: false,
        allowedPlans: [],
        allowedBillingIntervals: [],
        stripePromotionCodeId: 'spc_123',
      });

      const result = await validatePromoCodeForCheckout({
        rawCode: ' producer10 ',
        plan: 'COMPOSER',
        interval: 'monthly',
        userId: 'user-1',
      });

      expect(result).toEqual({
        isValid: true,
        code: 'PRODUCER10',
        stripePromotionCodeId: 'spc_123',
        promoCodeId: 'promo-3',
      });
    });
  });

  describe('redeemInviteCodeForUser', () => {
    it('returns already_paid_plan when user has an entitled paid subscription', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: SubscriptionStatus.ACTIVE },
      });
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-invite-1',
        type: 'INVITE',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: false,
        grantedPlan: 'INVITE',
        inviteDurationDays: 14,
      });

      const result = await redeemInviteCodeForUser({ rawCode: 'invite1', userId: 'user-1' });

      expect(result).toEqual({ applied: false, reason: 'already_paid_plan' });
    });

    it('returns already_redeemed when user has previously redeemed the same invite', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: null },
      });
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-invite-2',
        type: 'INVITE',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: true,
        grantedPlan: 'INVITE',
        inviteDurationDays: 14,
      });
      mockPromoCodeRedemptionFindUnique.mockResolvedValue({ id: 'redemption-2' });

      const result = await redeemInviteCodeForUser({ rawCode: 'invite2', userId: 'user-1' });

      expect(result).toEqual({ applied: false, reason: 'already_redeemed' });
    });

    it('applies invite plan override and records redemption on success', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-30T12:00:00.000Z'));

      const tx = {
        user: { update: jest.fn().mockResolvedValue(undefined) },
        promoCodeRedemption: { create: jest.fn().mockResolvedValue(undefined) },
        promoCode: { update: jest.fn().mockResolvedValue(undefined) },
      };

      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: null },
      });
      mockPromoCodeFindUnique.mockResolvedValue({
        id: 'promo-invite-3',
        type: 'INVITE',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        maxRedemptions: null,
        currentRedemptions: 0,
        isSingleUse: false,
        grantedPlan: 'INVITE',
        inviteDurationDays: 14,
      });
      mockPromoCodeRedemptionFindUnique.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (callback: (arg: typeof tx) => Promise<void>) => {
        await callback(tx);
      });

      const result = await redeemInviteCodeForUser({ rawCode: ' invite3 ', userId: 'user-1' });

      expect(result).toEqual({
        applied: true,
        code: 'INVITE3',
        grantedPlan: 'INVITE',
        expiresAt: new Date('2026-04-13T12:00:00.000Z'),
      });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ planOverride: 'INVITE' }),
        }),
      );
      expect(tx.promoCodeRedemption.create).toHaveBeenCalled();
      expect(tx.promoCode.update).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
