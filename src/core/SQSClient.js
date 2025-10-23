/**
 * @fileoverview Enhanced SQS Client for Enterprise SQS
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { SQSClient: AWSSQSClient } = require('@aws-sdk/client-sqs');
const CircuitBreaker = require('./CircuitBreaker');
const RetryManager = require('./RetryManager');

/**
 * Enhanced SQS Client with circuit breaker and retry logic
 * Provides a production-ready wrapper around AWS SQS client
 */
class SQSClient {
  /**
   * Creates a new SQSClient instance
   * @param {Object} config - SQS configuration
   * @param {string} config.region - AWS region
   * @param {Object} [config.credentials] - AWS credentials
   * @param {Object} [config.circuitBreaker] - Circuit breaker configuration
   * @param {Object} [config.retry] - Retry configuration
   */
  constructor(config) {
    this.region = config.region;
    this.credentials = config.credentials;
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker || {});
    
    // Initialize retry manager
    this.retryManager = new RetryManager(config.retry || {});
    
    // Initialize AWS SQS client
    this.awsClient = new AWSSQSClient({
      region: this.region,
      credentials: this.credentials,
      maxAttempts: 3,
      retryMode: 'adaptive'
    });
  }

  /**
   * Executes an SQS command with circuit breaker and retry logic
   * @param {Object} command - AWS SQS command
   * @param {Object} [options] - Execution options
   * @returns {Promise<any>} Command result
   */
  executeCommand = async (command, options = {}) => {
    if (!this.circuitBreaker.canExecute()) {
      throw new Error('Circuit breaker is open - operation not allowed');
    }

    const executeFn = async () => {
      try {
        const result = await this.awsClient.send(command);
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        this.circuitBreaker.recordFailure();
        throw error;
      }
    };

    return await this.retryManager.executeWithRetry(executeFn, {
      shouldRetry: (error) => {
        // Retry on network errors, throttling, and temporary failures
        return error.name === 'ThrottlingException' ||
               error.name === 'ServiceUnavailableException' ||
               error.name === 'InternalServerError' ||
               error.name === 'NetworkingError' ||
               error.name === 'TimeoutError';
      },
      onRetry: (error, attempt, delay) => {
        console.warn(`SQS command retry ${attempt}: ${error.message}, retrying in ${delay}ms`);
      },
      onFailure: (error, totalAttempts) => {
        console.error(`SQS command failed after ${totalAttempts} attempts: ${error.message}`);
      }
    });
  };

  /**
   * Gets the circuit breaker status
   * @returns {Object} Circuit breaker status
   */
  getCircuitBreakerStatus = () => this.circuitBreaker.getStatus();

  /**
   * Resets the circuit breaker
   */
  resetCircuitBreaker = () => this.circuitBreaker.reset();

  /**
   * Gets the retry configuration
   * @returns {Object} Retry configuration
   */
  getRetryConfig = () => this.retryManager.getConfig();

  /**
   * Updates the retry configuration
   * @param {Object} config - New retry configuration
   */
  updateRetryConfig = (config) => this.retryManager.updateConfig(config);

  /**
   * Gets the AWS SQS client (for direct access if needed)
   * @returns {AWSSQSClient} AWS SQS client
   */
  getAWSClient = () => this.awsClient;

  /**
   * Gets the current configuration
   * @returns {Object} Current configuration
   */
  getConfig = () => ({
    region: this.region,
    credentials: this.credentials,
    circuitBreaker: this.circuitBreaker.getStatus(),
    retry: this.retryManager.getConfig()
  });
}

module.exports = SQSClient;
