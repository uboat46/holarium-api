import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly secret: string;

  // Version prefix for encrypted data format
  private static readonly VERSION_V2 = 'v2';

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('app.encryptionKey');
    if (!secret) {
      throw new Error(
        'APP_ENCRYPTION_KEY is required for device/IP encryption',
      );
    }
    this.secret = secret;
  }

  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.secret, salt, 32);
  }

  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) {
      return null;
    }

    // Generate random salt and IV for each encryption
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    const key = this.deriveKey(salt);

    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: v2:salt:iv:authTag:encryptedData (all hex encoded)
    return `${CryptoService.VERSION_V2}:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) {
      return null;
    }

    try {
      const parts = ciphertext.split(':');

      // Handle v2 format: v2:salt:iv:authTag:encryptedData
      if (parts[0] === CryptoService.VERSION_V2 && parts.length === 5) {
        const [, saltHex, ivHex, authTagHex, encryptedData] = parts;
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = this.deriveKey(salt);

        const decipher = createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      }

      // Handle legacy v1 format: iv:authTag:encryptedData (hardcoded salt)
      if (parts.length === 3) {
        const [ivHex, authTagHex, encryptedData] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        // Legacy key with hardcoded salt
        const legacyKey = scryptSync(this.secret, 'salt', 32);

        const decipher = createDecipheriv(this.algorithm, legacyKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      }

      // Not encrypted data, return as-is (for migration compatibility)
      return ciphertext;
    } catch (error) {
      // Log decryption errors for debugging
      this.logger.warn('Decryption failed, returning original value');
      return ciphertext;
    }
  }
}
