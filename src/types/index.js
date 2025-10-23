/**
 * @fileoverview Type definitions and interfaces for Enterprise SQS
 * @author Ankur Mahajan
 * @version 1.0.0
 */

/**
 * @typedef {Object} SQSConfig
 * @property {string} region - AWS region
 * @property {Object} credentials - AWS credentials
 * @property {string} [credentials.accessKeyId] - AWS access key ID
 * @property {string} [credentials.secretAccessKey] - AWS secret access key
 * @property {string} [credentials.sessionToken] - AWS session token
 * @property {CircuitBreakerConfig} [circuitBreaker] - Circuit breaker configuration
 * @property {RetryConfig} [retry] - Retry configuration
 * @property {LoggingConfig} [logging] - Logging configuration
 */

/**
 * @typedef {Object} CircuitBreakerConfig
 * @property {number} [failureThreshold=5] - Number of failures before opening circuit
 * @property {number} [timeout=60000] - Timeout in milliseconds before attempting to close circuit
 * @property {number} [monitoringPeriod=10000] - Period for monitoring failures
 */

/**
 * @typedef {Object} RetryConfig
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [backoffMultiplier=2] - Multiplier for exponential backoff
 * @property {number} [maxBackoffMs=30000] - Maximum backoff time in milliseconds
 * @property {number} [initialDelayMs=1000] - Initial delay in milliseconds
 */

/**
 * @typedef {Object} LoggingConfig
 * @property {string} [level='info'] - Log level (debug, info, warn, error)
 * @property {boolean} [structured=true] - Whether to use structured logging
 * @property {Function} [logger] - Custom logger function
 */

/**
 * @typedef {Object} MessageOptions
 * @property {string} [messageGroupId] - Message group ID for FIFO queues
 * @property {string} [messageDeduplicationId] - Deduplication ID for FIFO queues
 * @property {number} [delaySeconds] - Delay in seconds before message becomes available
 * @property {Object} [messageAttributes] - Additional message attributes
 * @property {string} [queueUrl] - Queue URL override
 */

/**
 * @typedef {Object} ConsumerOptions
 * @property {string} [processingMode='sequential'] - Processing mode (sequential, parallel)
 * @property {number} [batchSize=5] - Batch size for parallel processing
 * @property {number} [throttleDelayMs=0] - Throttle delay between batches
 * @property {number} [maxMessages=10] - Maximum messages to receive
 * @property {number} [waitTimeSeconds=20] - Long polling wait time
 * @property {number} [visibilityTimeoutSeconds=30] - Message visibility timeout
 * @property {boolean} [autoStart=true] - Whether to start consuming immediately
 * @property {number} [pollingInterval=1000] - Polling interval in milliseconds
 */

/**
 * @typedef {Object} PublisherOptions
 * @property {string} [messageGroupId] - Default message group ID
 * @property {boolean} [enableDeduplication=true] - Enable content-based deduplication
 * @property {string} [deduplicationStrategy='content'] - Deduplication strategy
 * @property {number} [batchSize=10] - Batch size for batch operations
 */

/**
 * @typedef {Object} HealthStatus
 * @property {string} status - Health status (healthy, unhealthy, degraded)
 * @property {string} timestamp - ISO timestamp
 * @property {Object} details - Additional health details
 * @property {string} [error] - Error message if unhealthy
 */

/**
 * @typedef {Object} Metrics
 * @property {number} messagesProcessed - Total messages processed
 * @property {number} messagesFailed - Total messages failed
 * @property {number} averageProcessingTime - Average processing time in milliseconds
 * @property {number} circuitBreakerState - Current circuit breaker state
 * @property {Object} queueMetrics - Queue-specific metrics
 */

/**
 * @typedef {Object} MessageContext
 * @property {string} messageId - SQS message ID
 * @property {string} receiptHandle - Message receipt handle
 * @property {Object} messageAttributes - Message attributes
 * @property {string} [messageGroupId] - Message group ID
 * @property {string} [messageDeduplicationId] - Message deduplication ID
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {boolean} success - Whether processing was successful
 * @property {string} [messageId] - Message ID if successful
 * @property {string} [error] - Error message if failed
 * @property {number} [processingTime] - Processing time in milliseconds
 */

/**
 * Circuit breaker states
 * @readonly
 * @enum {string}
 */
const CircuitBreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

/**
 * Processing modes
 * @readonly
 * @enum {string}
 */
const ProcessingMode = {
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel'
};

/**
 * Health status values
 * @readonly
 * @enum {string}
 */
const HealthStatus = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded'
};

/**
 * Log levels
 * @readonly
 * @enum {string}
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

module.exports = {
  CircuitBreakerState,
  ProcessingMode,
  HealthStatus,
  LogLevel
};
