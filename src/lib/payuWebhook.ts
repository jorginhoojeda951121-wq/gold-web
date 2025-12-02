/**
 * PayU Webhook Handler
 * 
 * This utility handles PayU payment callbacks and webhooks
 * Can be used in serverless functions or API routes
 */

import { getSupabase } from './supabase';
import { verifyPayUHash, PayUCallbackData } from './payuService';
import { recordSubscriptionPayment, updatePaymentTransaction } from './subscription';

/**
 * Process PayU webhook/callback
 * This should be called from a server-side endpoint or webhook handler
 */
export async function processPayUWebhook(
  callbackData: PayUCallbackData,
  merchantSalt: string
): Promise<{
  success: boolean;
  message: string;
  txnId?: string;
}> {
  try {
    // Verify hash
    if (!verifyPayUHash(callbackData, merchantSalt)) {
      return {
        success: false,
        message: 'Invalid hash - payment verification failed',
        txnId: callbackData.txnid,
      };
    }

    // Extract user ID from UDF1 (we stored it there during payment initiation)
    const userId = callbackData.udf1 || '';
    if (!userId) {
      return {
        success: false,
        message: 'User ID not found in payment data',
        txnId: callbackData.txnid,
      };
    }

    // Get amount from callback
    const amount = parseFloat(callbackData.amount);

    // Update payment transaction
    const updateData: any = {
      status: callbackData.status === 'success' ? 'success' : 'failed',
      payuPaymentId: callbackData.payu_payment_id || '',
      payuHash: callbackData.hash || '',
      payuBankRefNum: callbackData.bank_ref_num || '',
      payuBankCode: callbackData.bankcode || '',
    };

    if (callbackData.status !== 'success') {
      updateData.payuErrorCode = callbackData.error || '';
      updateData.errorMessage = callbackData.error_Message || 'Payment failed';
    } else {
      updateData.paymentDate = new Date();
    }

    await updatePaymentTransaction(callbackData.txnid, updateData);

    // If payment successful, record subscription payment
    if (callbackData.status === 'success') {
      await recordSubscriptionPayment(
        userId,
        amount,
        new Date(),
        callbackData.txnid,
        'payu'
      );

      return {
        success: true,
        message: 'Payment processed and subscription renewed successfully',
        txnId: callbackData.txnid,
      };
    } else {
      return {
        success: false,
        message: `Payment failed: ${callbackData.error_Message || 'Unknown error'}`,
        txnId: callbackData.txnid,
      };
    }
  } catch (error: any) {
    console.error('Error processing PayU webhook:', error);
    return {
      success: false,
      message: error.message || 'Error processing webhook',
      txnId: callbackData.txnid,
    };
  }
}

/**
 * Parse PayU callback data from request body
 * Use this in your webhook endpoint
 */
export function parsePayUCallbackFromRequest(body: any): PayUCallbackData | null {
  try {
    // PayU sends data as form-encoded or JSON
    const data = typeof body === 'string' ? JSON.parse(body) : body;

    return {
      txnid: data.txnid || data.txnid || '',
      amount: data.amount || data.amount || '',
      productinfo: data.productinfo || data.productinfo || '',
      firstname: data.firstname || data.firstname || '',
      email: data.email || data.email || '',
      status: data.status || data.status || '',
      hash: data.hash || data.hash || '',
      key: data.key || data.key || '',
      udf1: data.udf1 || data.udf1 || '',
      udf2: data.udf2 || data.udf2 || '',
      payu_payment_id: data.payu_payment_id || data.payuPaymentId || '',
      bank_ref_num: data.bank_ref_num || data.bankRefNum || '',
      bankcode: data.bankcode || data.bankCode || '',
      error: data.error || data.errorCode || '',
      error_Message: data.error_Message || data.errorMessage || '',
    };
  } catch (error) {
    console.error('Error parsing PayU callback:', error);
    return null;
  }
}

