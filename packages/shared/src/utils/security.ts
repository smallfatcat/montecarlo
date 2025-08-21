import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

/**
 * HTML sanitization using DOMPurify
 */
export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [] // Remove all attributes
  })
}

/**
 * General input sanitization for user-generated content
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 1000) // Limit length to prevent DoS
}

/**
 * Sanitize and validate player names
 */
export const PlayerNameSchema = z.string()
  .min(1, 'Name cannot be empty')
  .max(50, 'Name too long (max 50 characters)')
  .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Name contains invalid characters (only letters, numbers, spaces, hyphens, and underscores allowed)')
  .transform(sanitizeInput)
  .refine(name => name.length > 0, 'Name cannot be empty after sanitization')

/**
 * Validate and sanitize betting amounts
 */
export const BetAmountSchema = z.number()
  .int('Bet amount must be an integer')
  .min(0, 'Bet amount cannot be negative')
  .max(1000000, 'Bet amount too large (max 1,000,000)')
  .finite('Bet amount must be finite')
  .refine(amount => !isNaN(amount), 'Bet amount must be a valid number')
  .refine(amount => amount !== Infinity && amount !== -Infinity, 'Bet amount cannot be infinite')

/**
 * Validate table IDs
 */
export const TableIdSchema = z.string()
  .min(1, 'Table ID cannot be empty')
  .max(100, 'Table ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Table ID contains invalid characters')
  .transform(input => input.toLowerCase()) // Normalize to lowercase

/**
 * Validate seat indices
 */
export const SeatIndexSchema = z.number()
  .int('Seat index must be an integer')
  .min(0, 'Seat index cannot be negative')
  .max(9, 'Seat index too large (max 9 for 10-seat tables)')

/**
 * Validate hand IDs
 */
export const HandIdSchema = z.number()
  .int('Hand ID must be an integer')
  .min(1, 'Hand ID must be positive')
  .max(Number.MAX_SAFE_INTEGER, 'Hand ID too large')

/**
 * Validate message content (chat messages, etc.)
 */
export const MessageContentSchema = z.string()
  .max(500, 'Message too long (max 500 characters)')
  .transform(sanitizeHtml)
  .refine(content => content.trim().length > 0, 'Message cannot be empty')

/**
 * Validate poker action types
 */
export const ActionTypeSchema = z.enum(['fold', 'check', 'call', 'bet', 'raise'], {
  errorMap: () => ({ message: 'Invalid action type' })
})

/**
 * Comprehensive poker action validation
 */
export const PokerActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('fold')
  }),
  z.object({
    type: z.literal('check')
  }),
  z.object({
    type: z.literal('call')
  }),
  z.object({
    type: z.literal('bet'),
    amount: BetAmountSchema
  }),
  z.object({
    type: z.literal('raise'),
    amount: BetAmountSchema
  })
])

/**
 * Validate email addresses (for user registration)
 */
export const EmailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email too long') // RFC 5321 limit
  .transform(email => email.toLowerCase().trim())

/**
 * Validate URLs (for avatars, etc.)
 */
export const UrlSchema = z.string()
  .url('Invalid URL')
  .max(2048, 'URL too long')
  .refine(url => {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }, 'Only HTTP and HTTPS URLs are allowed')

/**
 * Rate limiting key validation
 */
export const RateLimitKeySchema = z.string()
  .min(1, 'Rate limit key cannot be empty')
  .max(200, 'Rate limit key too long')
  .regex(/^[a-zA-Z0-9_\-:\/]+$/, 'Rate limit key contains invalid characters')

/**
 * Validate IP addresses
 */
export const IpAddressSchema = z.string()
  .refine(ip => {
    // Simple IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    // Simple IPv6 validation (basic)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown'
  }, 'Invalid IP address format')

/**
 * Security event validation
 */
export const SecurityEventSchema = z.object({
  type: z.enum(['authentication_failure', 'rate_limit_exceeded', 'invalid_input', 'suspicious_activity']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string().min(1).max(100),
  details: z.record(z.string(), z.unknown()),
  timestamp: z.number().int().positive()
})

/**
 * Validate configuration values
 */
export const ConfigValueSchema = z.string()
  .max(10000, 'Configuration value too long')
  .transform(sanitizeInput)

/**
 * Advanced input validation utilities
 */
export class InputValidator {
  /**
   * Check if string contains potential XSS vectors
   */
  static containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b/gi,
      /<object\b/gi,
      /<embed\b/gi,
      /<form\b/gi,
      /data:text\/html/gi
    ]
    
    return xssPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Check if string contains potential SQL injection vectors
   */
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(;|\|\||&&)/g,
      /(\-\-|\#|\/\*|\*\/)/g
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Check if string contains potential command injection vectors
   */
  static containsCommandInjection(input: string): boolean {
    const commandPatterns = [
      /(\||;|&|`|\$\(|\$\{)/g,
      /(\.\.|\/etc\/|\/bin\/|\/usr\/)/g,
      /(curl|wget|nc|netcat|bash|sh|cmd|powershell)/gi
    ]
    
    return commandPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Comprehensive security validation
   */
  static validateSecurity(input: string): { safe: boolean; threats: string[] } {
    const threats: string[] = []
    
    if (this.containsXSS(input)) {
      threats.push('XSS')
    }
    
    if (this.containsSQLInjection(input)) {
      threats.push('SQL Injection')
    }
    
    if (this.containsCommandInjection(input)) {
      threats.push('Command Injection')
    }
    
    return {
      safe: threats.length === 0,
      threats
    }
  }
}

/**
 * Validate and sanitize user input with comprehensive security checks
 */
export function validateAndSanitizeInput(
  input: unknown,
  schema: z.ZodSchema,
  options: { allowUnsafe?: boolean } = {}
): { success: true; data: any } | { success: false; error: string } {
  try {
    // First, basic type validation
    const parseResult = schema.safeParse(input)
    if (!parseResult.success) {
      return {
        success: false,
        error: `Validation failed: ${parseResult.error.errors.map(e => e.message).join(', ')}`
      }
    }

    // If it's a string, perform security validation
    if (typeof parseResult.data === 'string' && !options.allowUnsafe) {
      const securityCheck = InputValidator.validateSecurity(parseResult.data)
      if (!securityCheck.safe) {
        return {
          success: false,
          error: `Security validation failed: potential ${securityCheck.threats.join(', ')} detected`
        }
      }
    }

    return { success: true, data: parseResult.data }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Create a validation middleware for common use cases
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (input: unknown) => validateAndSanitizeInput(input, schema)
}
