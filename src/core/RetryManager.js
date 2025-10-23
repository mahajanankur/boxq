/**
 * @fileoverview Retry Manager implementation for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

/**
 * Retry Manager class for handling retry logic with exponential backoff
 * Implements sophisticated retry strategies for resilient operations
 */
class RetryManager {
  /**
   * Creates a new RetryManager instance
   * @param {Object} config - Retry configuration
   * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
   * @param {number} [config.backoffMultiplier=2] - Multiplier for exponential backoff
   * @param {number} [config.maxBackoffMs=30000] - Maximum backoff time in milliseconds
   * @param {number} [config.initialDelayMs=1000] - Initial delay in milliseconds
   */
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.maxBackoffMs = config.maxBackoffMs || 30000;
    this.initialDelayMs = config.initialDelayMs || 1000;
  }

  /**
   * Calculates the delay for a given attempt number
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay = (attempt) => {
    const delay = Math.min(
      this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt),
      this.maxBackoffMs
    );
    return Math.floor(delay);
  };

  /**
   * Sleeps for the specified number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>} Promise that resolves after the delay
   */
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Executes a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} [options] - Retry options
   * @param {Function} [options.shouldRetry] - Function to determine if error should be retried
   * @param {Function} [options.onRetry] - Callback called before each retry
   * @param {Function} [options.onFailure] - Callback called when all retries are exhausted
   * @returns {Promise<any>} Result of the function execution
   */
  executeWithRetry = async (fn, options = {}) => {
    const { shouldRetry, onRetry, onFailure } = options;
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (attempt < this.maxRetries && (!shouldRetry || shouldRetry(error))) {
          const delay = this.calculateDelay(attempt);
          
          if (onRetry) {
            onRetry(error, attempt + 1, delay);
          }
          
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    if (onFailure) {
      onFailure(lastError, this.maxRetries + 1);
    }

    throw lastError;
  };

  /**
   * Executes a function with retry logic and returns detailed results
   * @param {Function} fn - Function to execute
   * @param {Object} [options] - Retry options
   * @returns {Promise<Object>} Detailed execution results
   */
  executeWithRetryDetailed = async (fn, options = {}) => {
    const startTime = Date.now();
    const attempts = [];
    let lastError;
    let result;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        result = await fn();
        const attemptTime = Date.now() - attemptStartTime;
        
        attempts.push({
          attempt: attempt + 1,
          success: true,
          duration: attemptTime,
          error: null
        });
        
        return {
          success: true,
          result,
          attempts,
          totalDuration: Date.now() - startTime,
          retryCount: attempt
        };
      } catch (error) {
        const attemptTime = Date.now() - attemptStartTime;
        lastError = error;
        
        attempts.push({
          attempt: attempt + 1,
          success: false,
          duration: attemptTime,
          error: error.message
        });
        
        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      result: null,
      attempts,
      totalDuration: Date.now() - startTime,
      retryCount: this.maxRetries + 1,
      error: lastError
    };
  };

  /**
   * Gets the retry configuration
   * @returns {Object} Current retry configuration
   */
  getConfig = () => ({
    maxRetries: this.maxRetries,
    backoffMultiplier: this.backoffMultiplier,
    maxBackoffMs: this.maxBackoffMs,
    initialDelayMs: this.initialDelayMs
  });

  /**
   * Updates the retry configuration
   * @param {Object} config - New retry configuration
   */
  updateConfig = (config) => {
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
    if (config.backoffMultiplier !== undefined) this.backoffMultiplier = config.backoffMultiplier;
    if (config.maxBackoffMs !== undefined) this.maxBackoffMs = config.maxBackoffMs;
    if (config.initialDelayMs !== undefined) this.initialDelayMs = config.initialDelayMs;
  };
}

module.exports = RetryManager;
