import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Development: pretty print
  // Production: JSON structured logs
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: structured JSON logs
        base: {
          env: process.env.NODE_ENV,
          revision: process.env.BUILD_ID || 'unknown',
        },
      }),
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.authorization',
      '*.cookie',
      '*.apiKey',
      '*.secret',
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'INDEXNOW_KEY',
      'STRIPE_SECRET_KEY',
      'AWS_SECRET_ACCESS_KEY',
      'SMTP_PASSWORD',
    ],
    remove: true,
  },
});

// Request logger helper
export function logRequest(
  method: string,
  url: string,
  status: number,
  duration: number,
  extra?: Record<string, unknown>
) {
  const logData = {
    method,
    url,
    status,
    duration,
    ...extra,
  };

  if (status >= 500) {
    logger.error(logData, 'HTTP Request - Server Error');
  } else if (status >= 400) {
    logger.warn(logData, 'HTTP Request - Client Error');
  } else {
    logger.info(logData, 'HTTP Request');
  }
}

// Export child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};
