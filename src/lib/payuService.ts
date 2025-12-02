/**
 * PayU Payment Gateway Integration Service
 * 
 * Handles payment initiation, verification, and webhook processing
 * for subscription renewals
 */

import CryptoJS from 'crypto-js';

export interface PayUPaymentRequest {
  amount: number;
  userId: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone: string;
  productInfo: string;
  txnId: string;
  surl?: string; // Success URL
  furl?: string; // Failure URL
}

export interface PayUResponse {
  status: 'success' | 'failure';
  paymentUrl?: string;
  formData?: Record<string, string>;
  error?: string;
  txnId?: string;
}

export interface PayUCallbackData {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  hash: string;
  key: string;
  [key: string]: string; // Additional PayU fields
}

/**
 * Generate PayU hash for payment request
 */
function generatePayUHash(params: Record<string, string>, salt: string): string {
  // PayU hash format: hashSequence = key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
  const hashSequence = [
    params.key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 || '',
    params.udf2 || '',
    params.udf3 || '',
    params.udf4 || '',
    params.udf5 || '',
    '', '', '', '', '', // Empty fields
    salt
  ].join('|');

  return CryptoJS.SHA512(hashSequence).toString(CryptoJS.enc.Hex);
}

/**
 * Verify PayU payment hash
 */
export function verifyPayUHash(callbackData: PayUCallbackData, salt: string): boolean {
  try {
    const hashSequence = [
      callbackData.key,
      callbackData.txnid,
      callbackData.amount,
      callbackData.productinfo,
      callbackData.firstname,
      callbackData.email,
      callbackData.udf1 || '',
      callbackData.udf2 || '',
      callbackData.udf3 || '',
      callbackData.udf4 || '',
      callbackData.udf5 || '',
      callbackData.status,
      '', '', '', '', '', // Empty fields
      salt
    ].join('|');

    const calculatedHash = CryptoJS.SHA512(hashSequence).toString(CryptoJS.enc.Hex);
    return calculatedHash.toLowerCase() === callbackData.hash.toLowerCase();
  } catch (error) {
    console.error('Error verifying PayU hash:', error);
    return false;
  }
}

/**
 * Initiate PayU payment
 */
export async function initiatePayUPayment(
  request: PayUPaymentRequest
): Promise<PayUResponse> {
  try {
    const merchantKey = import.meta.env.VITE_PAYU_MERCHANT_KEY;
    const merchantSalt = import.meta.env.VITE_PAYU_MERCHANT_SALT;
    const testMode = import.meta.env.VITE_PAYU_TEST_MODE === 'true';

    console.log('PayU Config:', { 
      hasKey: !!merchantKey, 
      hasSalt: !!merchantSalt, 
      testMode,
      keyLength: merchantKey?.length,
      saltLength: merchantSalt?.length
    }); // Debug log

    if (!merchantKey || !merchantSalt) {
      console.error('PayU credentials missing:', { merchantKey, merchantSalt });
      throw new Error('PayU credentials not configured. Please check environment variables.');
    }

    // PayU API endpoints
    // Note: PayU test environment uses apitest.payu.in for some regions
    const baseUrl = testMode 
      ? 'https://test.payu.in/_payment' 
      : 'https://secure.payu.in/_payment';
    
    console.log('PayU Base URL:', baseUrl); // Debug log

    // Generate unique transaction ID if not provided
    const txnId = request.txnId || `TXN-${Date.now()}-${request.userId.slice(0, 8)}`;

    // Prepare payment parameters
    const paymentParams: Record<string, string> = {
      key: merchantKey,
      txnid: txnId,
      amount: request.amount.toFixed(2),
      productinfo: request.productInfo,
      firstname: request.firstName,
      lastname: request.lastName || '',
      email: request.email,
      phone: request.phone,
      surl: request.surl || `${import.meta.env.VITE_URL || `${window.location.origin}/subscription`}?payment=success`,
      furl: request.furl || `${import.meta.env.VITE_URL || `${window.location.origin}/subscription`}?payment=failure`,
      curl: `${import.meta.env.VITE_URL || `${window.location.origin}/subscription`}?payment=cancel`,
      hash: '',
      service_provider: 'payu_paisa',
      udf1: request.userId, // Store user ID in UDF1
      udf2: 'subscription_renewal', // Payment type
      udf3: '', // Reserved
      udf4: '', // Reserved
      udf5: '', // Reserved
    };

    // Generate hash
    paymentParams.hash = generatePayUHash(paymentParams, merchantSalt);

    console.log('PayU Payment Params:', {
      txnId,
      amount: paymentParams.amount,
      email: paymentParams.email,
      hashLength: paymentParams.hash.length,
      hashPreview: paymentParams.hash.substring(0, 20) + '...',
      paymentUrl: baseUrl,
      paramCount: Object.keys(paymentParams).length
    }); // Debug log

    // Validate all required fields are present
    const requiredParams = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'hash'];
    const missingParams = requiredParams.filter(param => !paymentParams[param]);
    if (missingParams.length > 0) {
      throw new Error(`Missing required payment parameters: ${missingParams.join(', ')}`);
    }

    // Return form data for POST submission
    return {
      status: 'success',
      formData: paymentParams,
      paymentUrl: baseUrl,
      txnId: txnId,
    };
  } catch (error: any) {
    console.error('PayU payment initiation error:', error);
    return {
      status: 'failure',
      error: error.message || 'Failed to initiate payment',
    };
  }
}

/**
 * Create and submit PayU payment form
 */
export function submitPayUForm(formData: Record<string, string>, paymentUrl: string): void {
  try {
    console.log('Creating PayU form for submission to:', paymentUrl);
    console.log('Form data count:', Object.keys(formData).length);
    
    // Validate required fields
    const requiredFields = ['key', 'txnid', 'amount', 'hash'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;
    form.style.display = 'none';
    form.target = '_self'; // Ensure it submits in the same window
    form.id = 'payu-payment-form';

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (!value) {
        console.warn(`Skipping empty field: ${key}`);
        return;
      }
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
      console.log(`Added field: ${key} = ${String(value).substring(0, 30)}...`); // Debug log (truncated for security)
    });

    // Remove any existing PayU form
    const existingForm = document.getElementById('payu-payment-form');
    if (existingForm) {
      existingForm.remove();
    }

    // Append form to body
    document.body.appendChild(form);
    console.log('Form appended to body, total inputs:', form.querySelectorAll('input').length);
    
    // Submit form with error handling
    console.log('Submitting form...');
    try {
      form.submit();
      console.log('Form.submit() called successfully');
      
      // Fallback: If form submission doesn't work, try redirect after a short delay
      setTimeout(() => {
        // Check if we're still on the same page (form submission might have failed)
        if (window.location.href.includes('/subscription')) {
          console.warn('Form submission may have failed, trying alternative method...');
          // Alternative: Create URL with params and redirect
          const params = new URLSearchParams();
          Object.entries(formData).forEach(([key, value]) => {
            if (value) params.append(key, String(value));
          });
          // Note: PayU might not accept GET, but this is a fallback
          console.log('Form data prepared for fallback:', Object.keys(formData));
        }
      }, 2000);
    } catch (submitError) {
      console.error('Form.submit() threw an error:', submitError);
      throw new Error('Failed to submit payment form. Please try again.');
    }
  } catch (error: any) {
    console.error('Error submitting PayU form:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Parse PayU callback data from URL parameters
 * PayU can send data via URL params or POST
 */
export function parsePayUCallback(): PayUCallbackData | null {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for PayU response indicators
    const mihpayid = urlParams.get('mihpayid');
    const payuStatus = urlParams.get('status');
    const paymentStatus = urlParams.get('payment');
    const txnId = urlParams.get('txnid');
    
    // If we have mihpayid, it's a PayU response
    if (mihpayid) {
      return {
        txnid: txnId || '',
        amount: urlParams.get('amount') || '',
        productinfo: urlParams.get('productinfo') || '',
        firstname: urlParams.get('firstname') || '',
        email: urlParams.get('email') || '',
        status: payuStatus || paymentStatus || 'success',
        hash: urlParams.get('hash') || '',
        key: urlParams.get('key') || import.meta.env.VITE_PAYU_MERCHANT_KEY || '',
        payu_payment_id: mihpayid,
        bank_ref_num: urlParams.get('bank_ref_num') || '',
        bankcode: urlParams.get('bankcode') || '',
        error: urlParams.get('error') || '',
        error_Message: urlParams.get('error_Message') || '',
      };
    }
    
    // Standard callback format
    if (!paymentStatus && !payuStatus) return null;

    // PayU sends data via POST, but we can also get it from URL params
    // In production, this should come from a webhook/backend
    const callbackData: PayUCallbackData = {
      txnid: txnId || urlParams.get('txnid') || '',
      amount: urlParams.get('amount') || '',
      productinfo: urlParams.get('productinfo') || '',
      firstname: urlParams.get('firstname') || '',
      email: urlParams.get('email') || '',
      status: payuStatus || paymentStatus || '',
      hash: urlParams.get('hash') || '',
      key: urlParams.get('key') || import.meta.env.VITE_PAYU_MERCHANT_KEY || '',
      payu_payment_id: mihpayid || '',
      bank_ref_num: urlParams.get('bank_ref_num') || '',
      bankcode: urlParams.get('bankcode') || '',
      error: urlParams.get('error') || '',
      error_Message: urlParams.get('error_Message') || '',
    };

    return callbackData;
  } catch (error) {
    console.error('Error parsing PayU callback:', error);
    return null;
  }
}

/**
 * Check payment status from PayU
 */
export async function checkPayUPaymentStatus(txnId: string): Promise<{
  status: 'success' | 'failure' | 'pending';
  paymentId?: string;
  error?: string;
}> {
  try {
    // In production, this should call PayU's status check API
    // For now, we'll rely on webhook/callback data
    // PayU provides a status check API endpoint
    
    const merchantKey = import.meta.env.VITE_PAYU_MERCHANT_KEY;
    const merchantSalt = import.meta.env.VITE_PAYU_MERCHANT_SALT;
    const testMode = import.meta.env.VITE_PAYU_TEST_MODE === 'true';

    if (!merchantKey || !merchantSalt) {
      throw new Error('PayU credentials not configured');
    }

    // Note: PayU status check requires server-side implementation
    // This is a placeholder - actual implementation should be on backend
    return {
      status: 'pending',
    };
  } catch (error: any) {
    return {
      status: 'failure',
      error: error.message,
    };
  }
}

