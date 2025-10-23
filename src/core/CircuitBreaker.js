/**
 * @fileoverview Circuit Breaker implementation for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { CircuitBreakerState } = require('../types');

/**
 * Circuit Breaker class for handling failures and preventing cascading failures
 * Implements the circuit breaker pattern with configurable thresholds and timeouts
 */
class CircuitBreaker {
  /**
   * Creates a new CircuitBreaker instance
   * @param {Object} config - Circuit breaker configuration
   * @param {number} [config.failureThreshold=5] - Number of failures before opening circuit
   * @param {number} [config.timeout=60000] - Timeout in milliseconds before attempting to close circuit
   * @param {number} [config.monitoringPeriod=10000] - Period for monitoring failures
   */
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 5;
    this.timeout = config.timeout || 60000;
    this.monitoringPeriod = config.monitoringPeriod || 10000;
    
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.monitoringStartTime = Date.now();
  }

  /**
   * Checks if the circuit breaker allows the operation
   * @returns {boolean} True if operation is allowed
   */
  canExecute = () => {
    const now = Date.now();
    
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitBreakerState.OPEN) {
      if (now - this.lastFailureTime > this.timeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        return true;
      }
      return false;
    }
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }
    
    return false;
  };

  /**
   * Records a successful operation
   */
  recordSuccess = () => {
    this.successCount++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= this.failureThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    }
  };

  /**
   * Records a failed operation
   */
  recordFailure = () => {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
      }
    }
  };

  /**
   * Resets the circuit breaker to closed state
   */
  reset = () => {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.monitoringStartTime = Date.now();
  };

  /**
   * Gets the current state of the circuit breaker
   * @returns {string} Current circuit breaker state
   */
  getState = () => this.state;

  /**
   * Gets the current failure count
   * @returns {number} Current failure count
   */
  getFailureCount = () => this.failureCount;

  /**
   * Gets the current success count
   * @returns {number} Current success count
   */
  getSuccessCount = () => this.successCount;

  /**
   * Gets the time since last failure
   * @returns {number} Time in milliseconds since last failure
   */
  getTimeSinceLastFailure = () => {
    if (!this.lastFailureTime) return null;
    return Date.now() - this.lastFailureTime;
  };

  /**
   * Gets comprehensive circuit breaker status
   * @returns {Object} Circuit breaker status
   */
  getStatus = () => ({
    state: this.state,
    failureCount: this.failureCount,
    successCount: this.successCount,
    lastFailureTime: this.lastFailureTime,
    timeSinceLastFailure: this.getTimeSinceLastFailure(),
    canExecute: this.canExecute()
  });
}

module.exports = CircuitBreaker;
