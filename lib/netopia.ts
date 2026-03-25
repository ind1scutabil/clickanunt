/**
 * Netopia Payments Integration for Romania
 * Documentation: https://netopia-payments.com/documentatie-tehnica
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface NetopiaConfig {
  apiKey: string;
  posSignature: string;
  isLive: boolean;
}

interface NetopiaPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  details: string;
  billing: {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    city?: string;
    country: string;
  };
  shipping?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    address: string;
    postalCode: string;
  };
  products?: Array<{
    name: string;
    code: string;
    category: string;
    price: number;
    vat: number;
  }>;
  installments?: {
    selected: number;
    available: number[];
  };
  successUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export class NetopiaPayments {
  private config: NetopiaConfig;
  private baseUrl: string;

  constructor(config: NetopiaConfig) {
    this.config = config;
    this.baseUrl = config.isLive
      ? 'https://secure.mobilpay.ro'
      : 'https://sandboxsecure.mobilpay.ro';
  }

  /**
   * Create payment request
   */
  async createPayment(params: NetopiaPaymentRequest): Promise<{
    url: string;
    data: string;
    env_key: string;
  }> {
    // Build XML request
    const xml = this.buildPaymentXML(params);

    // Encrypt data
    const { encryptedData, encryptedKey } = this.encryptData(xml);

    // Payment URL
    const paymentUrl = `${this.baseUrl}/pay`;

    return {
      url: paymentUrl,
      data: encryptedData,
      env_key: encryptedKey,
    };
  }

  /**
   * Build payment XML
   */
  private buildPaymentXML(params: NetopiaPaymentRequest): string {
    const installmentsXML = params.installments
      ? `<installments>
          <selected>${params.installments.selected}</selected>
          <available>${params.installments.available.join(',')}</available>
        </installments>`
      : '';

    const productsXML = params.products
      ? params.products
          .map(
            (product) => `
        <product>
          <name>${this.escapeXML(product.name)}</name>
          <code>${this.escapeXML(product.code)}</code>
          <category>${this.escapeXML(product.category)}</category>
          <price>${product.price}</price>
          <vat>${product.vat}</vat>
        </product>
      `
          )
          .join('')
      : '';

    const shippingXML = params.shipping
      ? `<shipping>
          <first_name>${this.escapeXML(params.shipping.firstName)}</first_name>
          <last_name>${this.escapeXML(params.shipping.lastName)}</last_name>
          <email>${this.escapeXML(params.shipping.email)}</email>
          <phone>${this.escapeXML(params.shipping.phone)}</phone>
          <city>${this.escapeXML(params.shipping.city)}</city>
          <country>${this.escapeXML(params.shipping.country)}</country>
          <address>${this.escapeXML(params.shipping.address)}</address>
          <postal_code>${this.escapeXML(params.shipping.postalCode)}</postal_code>
        </shipping>`
      : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<order type="card" id="${this.escapeXML(params.orderId)}" timestamp="${Math.floor(Date.now() / 1000)}">
  <signature>${this.config.posSignature}</signature>
  <amount>${params.amount}</amount>
  <currency>${params.currency}</currency>
  <details>${this.escapeXML(params.details)}</details>
  <billing>
    <first_name>${this.escapeXML(params.billing.firstName)}</first_name>
    <last_name>${this.escapeXML(params.billing.lastName)}</last_name>
    <email>${this.escapeXML(params.billing.email)}</email>
    <phone>${this.escapeXML(params.billing.phone)}</phone>
    <city>${this.escapeXML(params.billing.city || '')}</city>
    <country>${this.escapeXML(params.billing.country)}</country>
  </billing>
  ${shippingXML}
  ${productsXML}
  ${installmentsXML}
  <url>
    <confirm>${this.escapeXML(params.notifyUrl)}</confirm>
    <return>${this.escapeXML(params.successUrl)}</return>
    <cancel>${this.escapeXML(params.cancelUrl)}</cancel>
  </url>
</order>`;
  }

  /**
   * Encrypt payment data
   */
  private encryptData(xml: string): {
    encryptedData: string;
    encryptedKey: string;
  } {
    // Generate random AES key
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    // Encrypt XML with AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encrypted = cipher.update(xml, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const encryptedData = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]).toString('base64');

    // Encrypt AES key with RSA public key (from Netopia)
    const publicKey = this.getPublicKey();
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      aesKey
    );

    return {
      encryptedData,
      encryptedKey: encryptedKey.toString('base64'),
    };
  }

  /**
   * Decrypt IPN notification
   */
  decryptNotification(envKey: string, data: string): any {
    try {
      // Decrypt AES key with private key
      const privateKey = this.getPrivateKey();
      const aesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(envKey, 'base64')
      );

      // Decrypt data with AES
      const encryptedBuffer = Buffer.from(data, 'base64');
      const iv = encryptedBuffer.slice(0, 16);
      const encryptedData = encryptedBuffer.slice(16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
      let decrypted = decipher.update(encryptedData, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      // Parse XML to JSON
      const parsed = this.parseXMLResponse(decrypted);
      return {
        ...parsed,
        rawData: decrypted, // Needed for signature verification (hash of raw payload)
      };
    } catch (error) {
      console.error('Netopia decryption error:', error);
      throw new Error('Failed to decrypt Netopia notification');
    }
  }

  /**
   * Verify notification signature
   */
  verifyNotification(verificationToken: string, rawData: string): boolean {
    // "Real" verification: treat `verificationToken` as a signed JWT that
    // embeds the `posSignature` in `aud[0]` and a SHA-512 (base64) hash of `rawData` in `sub`.
    // If verificationToken/rawData are missing or verification fails, we reject (fail-closed).
    if (!verificationToken || typeof verificationToken !== 'string') return false;
    if (!rawData || typeof rawData !== 'string') return false;

    const publicKeyStr = this.getPublicKey();
    if (!publicKeyStr || !publicKeyStr.trim()) return false;

    const [headb64] = verificationToken.split('.');
    if (!headb64) return false;

    let jwtAlgorithm: string = 'RS512';
    try {
      const jwtHeader = JSON.parse(Buffer.from(headb64, 'base64').toString('utf-8'));
      if (jwtHeader?.typ !== 'JWT') return false;
      if (jwtHeader?.alg) jwtAlgorithm = jwtHeader.alg;
    } catch {
      return false;
    }

    try {
      const decoded = jwt.verify(verificationToken, publicKeyStr, {
        // jsonwebtoken types are strict about `Algorithm`; cast to keep runtime flexible.
        algorithms: [jwtAlgorithm as any],
      }) as any;

      if (decoded?.iss !== 'NETOPIA Payments') return false;

      const aud0 = Array.isArray(decoded?.aud) ? decoded.aud[0] : decoded?.aud;
      if (!aud0 || aud0 !== this.config.posSignature) return false;

      const payloadHash = crypto.createHash('sha512').update(rawData).digest('base64');
      if (!decoded?.sub || decoded.sub !== payloadHash) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public key for encryption
   */
  private getPublicKey(): string {
    // Load from environment or file
    const publicKeyPath = this.config.isLive
      ? process.env.NETOPIA_PUBLIC_KEY_LIVE
      : process.env.NETOPIA_PUBLIC_KEY_SANDBOX;

    if (!publicKeyPath) {
      throw new Error('Netopia public key not configured');
    }

    // In production, read from file system
    // For now, return from env
    return process.env.NETOPIA_PUBLIC_KEY || '';
  }

  /**
   * Get private key for decryption
   */
  private getPrivateKey(): string {
    const privateKeyPath = this.config.isLive
      ? process.env.NETOPIA_PRIVATE_KEY_LIVE
      : process.env.NETOPIA_PRIVATE_KEY_SANDBOX;

    if (!privateKeyPath) {
      throw new Error('Netopia private key not configured');
    }

    return process.env.NETOPIA_PRIVATE_KEY || '';
  }

  /**
   * Parse XML response to JSON
   */
  private parseXMLResponse(xml: string): any {
    // Simple XML parsing - in production use a proper XML parser
    const orderId = xml.match(/<order[^>]*id="([^"]*)"/)?.[1];
    const amount = xml.match(/<amount>([^<]*)<\/amount>/)?.[1];
    const currency = xml.match(/<currency>([^<]*)<\/currency>/)?.[1];
    const status = xml.match(/<action>([^<]*)<\/action>/)?.[1];
    const errorCode = xml.match(/<error_code>([^<]*)<\/error_code>/)?.[1];
    const errorMessage = xml.match(/<error_message>([^<]*)<\/error_message>/)?.[1];
    const tokenIdentifier =
      xml.match(/<token_identifier>([^<]*)<\/token_identifier>/)?.[1] ||
      xml.match(/<token_identifier[^>]*>([^<]*)<\/token_identifier>/)?.[1];

    return {
      orderId,
      amount: amount ? parseFloat(amount) : 0,
      currency,
      status,
      errorCode: errorCode || '0',
      errorMessage: errorMessage || '',
      tokenIdentifier: tokenIdentifier || null,
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Helper function to create Netopia instance
export function createNetopiaClient(): NetopiaPayments {
  return new NetopiaPayments({
    apiKey: process.env.NETOPIA_API_KEY || '',
    posSignature: process.env.NETOPIA_POS_SIGNATURE || '',
    isLive: process.env.NODE_ENV === 'production',
  });
}

// Payment status constants
export const NETOPIA_STATUS = {
  NEW: 'new',
  PAID: 'paid',
  CONFIRMED: 'confirmed',
  PAID_PENDING: 'paid_pending',
  CONFIRMED_PENDING: 'confirmed_pending',
  CANCELED: 'canceled',
  CREDIT: 'credit',
} as const;
