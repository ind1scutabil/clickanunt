import crypto from 'crypto';

/**
 * RFC 6238 TOTP Verification
 */
export function verifyTOTPRFC(secret: string, token: string, window = 1): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  
  for (let i = -window; i <= window; i++) {
    let timeCounter = Math.floor((now + i * timeStep) / timeStep);
    const hmac = crypto.createHmac('sha1', base32Decode(secret));
    
    const buf = Buffer.alloc(8);
    for (let j = 7; j >= 0; j--) {
      buf[j] = timeCounter & 0xff;
      timeCounter = timeCounter >> 8;
    }
    
    hmac.update(buf);
    const digest = hmac.digest();
    const offset = digest[digest.length - 1] & 0xf;
    const otp = (
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    ) % 1000000;
    
    const paddedOtp = otp.toString().padStart(6, '0');
    if (paddedOtp === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * Base32 encoding
 */
export function base32Encode(buffer: Buffer): string {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += base32chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    output += base32chars[(value << (5 - bits)) & 31];
  }
  
  while (output.length % 8) {
    output += '=';
  }
  
  return output;
}

/**
 * Base32 decoding
 */
export function base32Decode(str: string): Buffer {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '=') break;
    const idx = base32chars.indexOf(str[i].toUpperCase());
    if (idx === -1) throw new Error('Invalid character in base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  
  return Buffer.from(output);
}
