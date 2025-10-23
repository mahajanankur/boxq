/**
 * @fileoverview Health Monitor for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { HealthStatus } = require('../types');

/**
 * Health Monitor class for tracking system health and metrics
 * Provides comprehensive health monitoring for SQS operations
 */
class HealthMonitor {
  /**
   * Creates a new HealthMonitor instance
   */
  constructor() {
    this.metrics = {
      messagesProcessed: 0,
      messagesFailed: 0,
      totalProcessingTime: 0,
      circuitBreakerState: 'CLOSED',
      lastHealthCheck: null,
      startTime: Date.now()
    };
    
    this.healthChecks = new Map();
    this.alerts = [];
  }

  /**
   * Records a successful message processing
   * @param {number} processingTime - Processing time in milliseconds
   */
  recordSuccess = (processingTime = 0) => {
    this.metrics.messagesProcessed++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.lastHealthCheck = Date.now();
  };

  /**
   * Records a failed message processing
   * @param {string} error - Error message
   */
  recordFailure = (error) => {
    this.metrics.messagesFailed++;
    this.metrics.lastHealthCheck = Date.now();
    
    // Add to alerts if it's a significant error
    if (error && error.includes('Circuit breaker')) {
      this.alerts.push({
        type: 'circuit_breaker',
        message: error,
        timestamp: Date.now()
      });
    }
  };

  /**
   * Updates circuit breaker state
   * @param {string} state - Circuit breaker state
   */
  updateCircuitBreakerState = (state) => {
    this.metrics.circuitBreakerState = state;
  };

  /**
   * Registers a health check function
   * @param {string} name - Health check name
   * @param {Function} checkFn - Health check function
   */
  registerHealthCheck = (name, checkFn) => {
    this.healthChecks.set(name, checkFn);
  };

  /**
   * Removes a health check function
   * @param {string} name - Health check name
   */
  unregisterHealthCheck = (name) => {
    this.healthChecks.delete(name);
  };

  /**
   * Performs all registered health checks
   * @returns {Promise<Object>} Health check results
   */
  performHealthChecks = async () => {
    const results = {};
    let allHealthy = true;

    for (const [name, checkFn] of this.healthChecks) {
      try {
        const result = await checkFn();
        results[name] = {
          status: result.status || 'healthy',
          details: result.details || {},
          timestamp: Date.now()
        };
        
        if (result.status !== 'healthy') {
          allHealthy = false;
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: Date.now()
        };
        allHealthy = false;
      }
    }

    return {
      overall: allHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: Date.now()
    };
  };

  /**
   * Gets current health status
   * @returns {Object} Current health status
   */
  getHealthStatus = () => {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const averageProcessingTime = this.metrics.messagesProcessed > 0 
      ? this.metrics.totalProcessingTime / this.metrics.messagesProcessed 
      : 0;

    // Determine overall health status
    let status = HealthStatus.HEALTHY;
    
    if (this.metrics.circuitBreakerState === 'OPEN') {
      status = HealthStatus.UNHEALTHY;
    } else if (this.metrics.messagesFailed > 0 && this.metrics.messagesProcessed > 0) {
      const failureRate = this.metrics.messagesFailed / (this.metrics.messagesProcessed + this.metrics.messagesFailed);
      if (failureRate > 0.1) { // 10% failure rate threshold
        status = HealthStatus.DEGRADED;
      }
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      metrics: {
        messagesProcessed: this.metrics.messagesProcessed,
        messagesFailed: this.metrics.messagesFailed,
        averageProcessingTime: Math.round(averageProcessingTime),
        circuitBreakerState: this.metrics.circuitBreakerState,
        lastHealthCheck: this.metrics.lastHealthCheck
      },
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };
  };

  /**
   * Gets detailed metrics
   * @returns {Object} Detailed metrics
   */
  getMetrics = () => {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const totalMessages = this.metrics.messagesProcessed + this.metrics.messagesFailed;
    const successRate = totalMessages > 0 ? (this.metrics.messagesProcessed / totalMessages) * 100 : 100;
    const averageProcessingTime = this.metrics.messagesProcessed > 0 
      ? this.metrics.totalProcessingTime / this.metrics.messagesProcessed 
      : 0;

    return {
      ...this.metrics,
      uptime,
      totalMessages,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      throughput: this.metrics.messagesProcessed / (uptime / 1000), // messages per second
      alerts: this.alerts
    };
  };

  /**
   * Clears all metrics
   */
  clearMetrics = () => {
    this.metrics = {
      messagesProcessed: 0,
      messagesFailed: 0,
      totalProcessingTime: 0,
      circuitBreakerState: 'CLOSED',
      lastHealthCheck: null,
      startTime: Date.now()
    };
    this.alerts = [];
  };

  /**
   * Gets alerts
   * @returns {Array} Array of alerts
   */
  getAlerts = () => this.alerts;

  /**
   * Clears alerts
   */
  clearAlerts = () => {
    this.alerts = [];
  };
}

module.exports = HealthMonitor;
