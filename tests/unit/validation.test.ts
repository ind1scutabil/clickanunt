import { z } from 'zod';

// Validation Schemas
const EmailSchema = z.string().email('Invalid email address');

const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[!@#$%^&*]/, 'Password must contain a special character');

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

const ListingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  location: z.string().optional(),
  images: z.array(z.string().url()).max(10, 'Maximum 10 images allowed').optional(),
});

const MessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  message: z.string().min(1, 'Message cannot be empty').max(5000),
  listingId: z.string().optional(),
});

describe('Validation - Registration', () => {
  it('should accept valid registration data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    };

    expect(() => RegisterSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    };

    expect(() => RegisterSchema.parse(invalidData)).toThrow();
  });

  it('should reject weak password', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'weak',
      confirmPassword: 'weak',
    };

    expect(() => RegisterSchema.parse(invalidData)).toThrow();
  });

  it('should reject mismatched passwords', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'Different456!',
    };

    expect(() => RegisterSchema.parse(invalidData)).toThrow();
  });

  it('should reject short name', () => {
    const invalidData = {
      name: 'J',
      email: 'john@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    };

    expect(() => RegisterSchema.parse(invalidData)).toThrow();
  });
});

describe('Validation - Login', () => {
  it('should accept valid login data', () => {
    const validData = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    expect(() => LoginSchema.parse(validData)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'Password123!',
    };

    expect(() => LoginSchema.parse(invalidData)).toThrow();
  });

  it('should reject empty password', () => {
    const invalidData = {
      email: 'user@example.com',
      password: '',
    };

    expect(() => LoginSchema.parse(invalidData)).toThrow();
  });
});

describe('Validation - Listing Creation', () => {
  it('should accept valid listing data', () => {
    const validData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Well maintained car with full service history',
      price: 15000,
      category: 'Auto',
      location: 'Bucharest',
    };

    expect(() => ListingSchema.parse(validData)).not.toThrow();
  });

  it('should reject short title', () => {
    const invalidData = {
      title: 'BMW',
      description: 'Well maintained car with full service history',
      price: 15000,
      category: 'Auto',
    };

    expect(() => ListingSchema.parse(invalidData)).toThrow();
  });

  it('should reject short description', () => {
    const invalidData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Short',
      price: 15000,
      category: 'Auto',
    };

    expect(() => ListingSchema.parse(invalidData)).toThrow();
  });

  it('should reject negative price', () => {
    const invalidData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Well maintained car with full service history',
      price: -100,
      category: 'Auto',
    };

    expect(() => ListingSchema.parse(invalidData)).toThrow();
  });

  it('should reject zero price', () => {
    const invalidData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Well maintained car with full service history',
      price: 0,
      category: 'Auto',
    };

    expect(() => ListingSchema.parse(invalidData)).toThrow();
  });

  it('should reject too many images', () => {
    const invalidData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Well maintained car with full service history',
      price: 15000,
      category: 'Auto',
      images: Array(15).fill('https://example.com/image.jpg'),
    };

    expect(() => ListingSchema.parse(invalidData)).toThrow();
  });

  it('should accept valid images array', () => {
    const validData = {
      title: 'Beautiful BMW 3 Series',
      description: 'Well maintained car with full service history',
      price: 15000,
      category: 'Auto',
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
    };

    expect(() => ListingSchema.parse(validData)).not.toThrow();
  });
});

describe('Validation - Messages', () => {
  it('should accept valid message data', () => {
    const validData = {
      recipientId: 'user-123',
      message: 'Is this item still available?',
    };

    expect(() => MessageSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty message', () => {
    const invalidData = {
      recipientId: 'user-123',
      message: '',
    };

    expect(() => MessageSchema.parse(invalidData)).toThrow();
  });

  it('should reject missing recipient', () => {
    const invalidData = {
      message: 'Is this item still available?',
    };

    expect(() => MessageSchema.parse(invalidData)).toThrow();
  });

  it('should accept optional listing ID', () => {
    const validData = {
      recipientId: 'user-123',
      message: 'Is this item still available?',
      listingId: 'listing-456',
    };

    expect(() => MessageSchema.parse(validData)).not.toThrow();
  });

  it('should reject too long message', () => {
    const invalidData = {
      recipientId: 'user-123',
      message: 'a'.repeat(6000),
    };

    expect(() => MessageSchema.parse(invalidData)).toThrow();
  });
});

describe('Validation - Email', () => {
  it('should accept valid emails', () => {
    const validEmails = [
      'user@example.com',
      'user+tag@example.co.uk',
      'user.name@example.com',
    ];

    validEmails.forEach((email) => {
      expect(() => EmailSchema.parse(email)).not.toThrow();
    });
  });

  it('should reject invalid emails', () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'user@',
      'user @example.com',
    ];

    invalidEmails.forEach((email) => {
      expect(() => EmailSchema.parse(email)).toThrow();
    });
  });
});

describe('Validation - Password', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = [
      'SecurePass123!',
      'MyPassword456@',
      'Test1234!',
    ];

    strongPasswords.forEach((password) => {
      expect(() => PasswordSchema.parse(password)).not.toThrow();
    });
  });

  it('should reject passwords without uppercase', () => {
    expect(() => PasswordSchema.parse('securepass123!')).toThrow();
  });

  it('should reject passwords without lowercase', () => {
    expect(() => PasswordSchema.parse('SECUREPASS123!')).toThrow();
  });

  it('should reject passwords without numbers', () => {
    expect(() => PasswordSchema.parse('SecurePass!')).toThrow();
  });

  it('should reject passwords without special characters', () => {
    expect(() => PasswordSchema.parse('SecurePass123')).toThrow();
  });

  it('should reject short passwords', () => {
    expect(() => PasswordSchema.parse('Pass1!')).toThrow();
  });
});
