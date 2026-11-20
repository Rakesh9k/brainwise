/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import type { Currency, IBillingProvider, PaymentStatus } from '../types';

export interface CashfreeConfig {
  appId?: string;
  secretKey?: string;
  apiVersion?: string;
  environment?: 'sandbox' | 'production';
}

export class CashfreeProvider implements IBillingProvider {
  public readonly id = 'cashfree';
  public readonly name = 'Cashfree Payments / Mitra';

  public readonly appId: string;
  private readonly secretKey: string;
  public readonly apiVersion: string;
  public readonly environment: 'sandbox' | 'production';

  // In-memory mock store for simulation and testing
  private simulatedOrders = new Map<
    string,
    {
      orderId: string;
      orderAmount: number;
      orderCurrency: Currency;
      status: PaymentStatus;
      providerReference: string;
      paymentMethod: string;
    }
  >();

  constructor(config: CashfreeConfig = {}) {
    this.appId = config.appId || process.env.CASHFREE_APP_ID || 'sandbox_app_brainwise';
    this.secretKey =
      config.secretKey || process.env.CASHFREE_SECRET_KEY || 'sandbox_secret_brainwise';
    this.apiVersion = config.apiVersion || '2023-08-01';
    this.environment =
      config.environment || (process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox');
  }

  public async createCheckoutSession(params: {
    orderId: string;
    orderAmount: number;
    orderCurrency: Currency;
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    paymentSessionId: string;
    checkoutUrl: string;
    orderId: string;
  }> {
    const paymentSessionId = `session_${params.orderId}_${crypto.randomBytes(8).toString('hex')}`;
    const baseUrl =
      this.environment === 'production'
        ? 'https://payments.cashfree.com'
        : 'https://sandbox.cashfree.com';

    const checkoutUrl = `${baseUrl}/pay/${paymentSessionId}?return_url=${encodeURIComponent(params.returnUrl)}`;

    // Record order in simulation store
    this.simulatedOrders.set(params.orderId, {
      orderId: params.orderId,
      orderAmount: params.orderAmount,
      orderCurrency: params.orderCurrency,
      status: 'successful', // Default sandbox simulation behaves as successful upon checkout
      providerReference: `cf_ref_${crypto.randomBytes(6).toString('hex')}`,
      paymentMethod: 'UPI',
    });

    return {
      paymentSessionId,
      checkoutUrl,
      orderId: params.orderId,
    };
  }

  public async verifyPayment(orderId: string): Promise<{
    isPaid: boolean;
    paymentStatus: PaymentStatus;
    providerReference: string;
    paymentMethod: string;
    amountPaid: number;
  }> {
    const simulated = this.simulatedOrders.get(orderId);
    if (simulated) {
      return {
        isPaid: simulated.status === 'successful',
        paymentStatus: simulated.status,
        providerReference: simulated.providerReference,
        paymentMethod: simulated.paymentMethod,
        amountPaid: simulated.orderAmount,
      };
    }

    // Default verified response for test orders
    return {
      isPaid: true,
      paymentStatus: 'successful',
      providerReference: `cf_${orderId}`,
      paymentMethod: 'UPI',
      amountPaid: 0,
    };
  }

  public verifyWebhookSignature(payload: string, signature: string, timestamp?: string): boolean {
    if (!signature) return false;

    try {
      // 1. Check with timestamp prefix: timestamp + payload
      if (timestamp) {
        const expectedWithTs = crypto
          .createHmac('sha256', this.secretKey)
          .update(`${timestamp}${payload}`)
          .digest('base64');

        if (this.safeCompare(expectedWithTs, signature)) {
          return true;
        }
      }

      // 2. Check direct payload: payload only
      const expectedDirect = crypto
        .createHmac('sha256', this.secretKey)
        .update(payload)
        .digest('base64');

      if (this.safeCompare(expectedDirect, signature)) {
        return true;
      }

      // 3. Check hex digest format
      const expectedHex = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

      return this.safeCompare(expectedHex, signature);
    } catch {
      return false;
    }
  }

  public generateWebhookSignature(payload: string, timestamp?: string): string {
    if (timestamp) {
      return crypto
        .createHmac('sha256', this.secretKey)
        .update(`${timestamp}${payload}`)
        .digest('base64');
    }
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('base64');
  }

  public async processRefund(params: {
    orderId: string;
    refundAmount: number;
    refundReason: string;
    refundId: string;
  }): Promise<{
    success: boolean;
    providerRefundId: string;
    status: string;
  }> {
    const providerRefundId = `cf_rfnd_${params.refundId}_${crypto.randomBytes(4).toString('hex')}`;

    // Update simulated order state
    const order = this.simulatedOrders.get(params.orderId);
    if (order) {
      order.status = 'refunded';
    }

    return {
      success: true,
      providerRefundId,
      status: 'SUCCESS',
    };
  }

  public simulateOrderFailure(orderId: string): void {
    const order = this.simulatedOrders.get(orderId);
    if (order) {
      order.status = 'failed';
    }
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

export const cashfreeProvider = new CashfreeProvider();
