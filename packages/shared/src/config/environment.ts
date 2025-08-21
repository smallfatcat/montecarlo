import { z } from 'zod'

/**
 * Environment validation schema for the Montecarlo application
 * Ensures all required environment variables are present and valid
 */
const EnvironmentSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Convex configuration
  VITE_CONVEX_URL: z.string().url('VITE_CONVEX_URL must be a valid URL'),
  CONVEX_INGEST_SECRET: z.string().min(32, 'CONVEX_INGEST_SECRET must be at least 32 characters'),
  INSTANCE_SECRET: z.string().min(32, 'INSTANCE_SECRET must be at least 32 characters'),
  
  // WebSocket configuration
  VITE_WS_URL: z.string().url('VITE_WS_URL must be a valid URL').optional(),
  
  // Server configuration
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  
  // CORS configuration
  FRONTEND_ORIGINS: z.string()
    .transform(str => str.split(',').map(s => s.trim()).filter(Boolean))
    .refine(origins => origins.length > 0, 'FRONTEND_ORIGINS must contain at least one origin'),
  
  // Optional development flags
  ALLOW_ALL_ORIGINS: z.string().optional().transform(val => val === '1' || val === 'true'),
})

export type Environment = z.infer<typeof EnvironmentSchema>

/**
 * Validates environment variables and returns typed configuration
 * Exits process on validation failure in non-test environments
 */
export function validateEnvironment(env: Record<string, string | undefined> = process.env): Environment {
  const result = EnvironmentSchema.safeParse(env)
  
  if (!result.success) {
    console.error('❌ Environment validation failed:')
    console.error('Missing or invalid environment variables:')
    
    result.error.errors.forEach(error => {
      const field = error.path.join('.')
      console.error(`  - ${field}: ${error.message}`)
    })
    
    console.error('\nRequired environment variables:')
    console.error('  - VITE_CONVEX_URL: Convex backend URL')
    console.error('  - CONVEX_INGEST_SECRET: Secret for Convex API authentication (min 32 chars)')
    console.error('  - INSTANCE_SECRET: Instance-specific secret (min 32 chars)')
    console.error('  - FRONTEND_ORIGINS: Comma-separated list of allowed origins')
    
    // Only exit in non-test environments
    if (env.NODE_ENV !== 'test') {
      process.exit(1)
    } else {
      throw new Error('Environment validation failed in test environment')
    }
  }
  
  const config = result.data
  
  // Additional validation for production
  if (config.NODE_ENV === 'production') {
    validateProductionConfig(config)
  }
  
  return config
}

/**
 * Additional validation for production environment
 */
function validateProductionConfig(config: Environment): void {
  const warnings: string[] = []
  const errors: string[] = []
  
  // Ensure secrets are sufficiently long in production
  if (config.CONVEX_INGEST_SECRET.length < 64) {
    errors.push('CONVEX_INGEST_SECRET should be at least 64 characters in production')
  }
  
  if (config.INSTANCE_SECRET.length < 64) {
    errors.push('INSTANCE_SECRET should be at least 64 characters in production')
  }
  
  // Warn about potentially insecure configurations
  if (config.HOST === '0.0.0.0') {
    warnings.push('Binding to 0.0.0.0 in production. Ensure proper firewall configuration.')
  }
  
  if (config.ALLOW_ALL_ORIGINS) {
    errors.push('ALLOW_ALL_ORIGINS should not be enabled in production')
  }
  
  // Check for development URLs in production
  if (config.VITE_CONVEX_URL.includes('localhost') || config.VITE_CONVEX_URL.includes('127.0.0.1')) {
    errors.push('VITE_CONVEX_URL should not use localhost/127.0.0.1 in production')
  }
  
  // Output warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Production configuration warnings:')
    warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
  
  // Exit on errors
  if (errors.length > 0) {
    console.error('❌ Production configuration errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    process.exit(1)
  }
}

/**
 * Generate a secure random secret for development
 */
export function generateSecureSecret(length: number = 64): string {
  const crypto = require('crypto')
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

/**
 * Create a sample .env file with secure defaults
 */
export function generateSampleEnv(): string {
  return `# Montecarlo Environment Configuration

# Node.js Environment
NODE_ENV=development

# Convex Configuration
VITE_CONVEX_URL=http://127.0.0.1:3210
CONVEX_INGEST_SECRET=${generateSecureSecret(64)}
INSTANCE_SECRET=${generateSecureSecret(64)}

# WebSocket Configuration
VITE_WS_URL=ws://127.0.0.1:8080

# Server Configuration
HOST=127.0.0.1
PORT=8080

# CORS Configuration
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Development Only - DO NOT USE IN PRODUCTION
# ALLOW_ALL_ORIGINS=1
`
}
