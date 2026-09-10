// Razorpay-only payment types. Razorpay is the single active gateway:
// no multi-provider abstraction, no alternative providers.
export type PaymentProviderId = 'razorpay';

export type PaymentStatus =
  | 'CREATED' | 'PENDING' | 'PROCESSING' | 'PAID' | 'VERIFYING'
  | 'VERIFIED' | 'CONFIRMED' | 'REVIEW_REQUIRED' | 'FAILED'
  | 'CANCELLED' | 'EXPIRED' | 'REJECTED' | 'DUPLICATE' | 'FRAUD_BLOCKED';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';

// Safe-to-browser data for Razorpay Checkout. Never contains secrets.
export interface RazorpayCheckoutPayload {
  provider: 'razorpay';
  orderId: string; // Razorpay order id (order_...)
  amount: number; // rupees (integer), authoritative server-side value
  amountPaise: number;
  currency: string;
  keyId: string; // public Key ID only — secret never leaves the server
  registrationId: string;
  teamName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

// What Razorpay Checkout hands back to the browser after payment.
export interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResult {
  verified: boolean;
  gatewayStatus: string;
  providerPaymentId?: string;
  amount?: number; // rupees, as reported by Razorpay
}
