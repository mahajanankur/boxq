/**
 * @fileoverview Tests for HealthMonitor
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const HealthMonitor = require('../../src/core/HealthMonitor');
const { HealthStatus } = require('../../src/types');

describe('HealthMonitor', () => {
  let healthMonitor;

  beforeEach(() => {
    healthMonitor = new HealthMonitor();
  });

  describe('constructor', () => {
    it('should initialize with default metrics', () => {
      expect(healthMonitor.metrics.messagesProcessed).toBe(0);
      expect(healthMonitor.metrics.messagesFailed).toBe(0);
      expect(healthMonitor.metrics.totalProcessingTime).toBe(0);
      expect(healthMonitor.metrics.circuitBreakerState).toBe('CLOSED');
    });
  });

  describe('recordSuccess', () => {
    it('should record successful message processing', () => {
      healthMonitor.recordSuccess(100);
      
      expect(healthMonitor.metrics.messagesProcessed).toBe(1);
      expect(healthMonitor.metrics.totalProcessingTime).toBe(100);
      expect(healthMonitor.metrics.lastHealthCheck).toBeDefined();
    });

    it('should record success without processing time', () => {
      healthMonitor.recordSuccess();
      
      expect(healthMonitor.metrics.messagesProcessed).toBe(1);
      expect(healthMonitor.metrics.totalProcessingTime).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should record failed message processing', () => {
      healthMonitor.recordFailure('Test error');
      
      expect(healthMonitor.metrics.messagesFailed).toBe(1);
      expect(healthMonitor.metrics.lastHealthCheck).toBeDefined();
    });

    it('should add circuit breaker alerts', () => {
      healthMonitor.recordFailure('Circuit breaker is open');
      
      expect(healthMonitor.alerts).toHaveLength(1);
      expect(healthMonitor.alerts[0].type).toBe('circuit_breaker');
    });
  });

  describe('updateCircuitBreakerState', () => {
    it('should update circuit breaker state', () => {
      healthMonitor.updateCircuitBreakerState('OPEN');
      
      expect(healthMonitor.metrics.circuitBreakerState).toBe('OPEN');
    });
  });

  describe('registerHealthCheck', () => {
    it('should register health check function', () => {
      const checkFn = jest.fn().mockResolvedValue({ status: 'healthy' });
      
      healthMonitor.registerHealthCheck('test', checkFn);
      
      expect(healthMonitor.healthChecks.has('test')).toBe(true);
    });
  });

  describe('unregisterHealthCheck', () => {
    it('should unregister health check function', () => {
      const checkFn = jest.fn().mockResolvedValue({ status: 'healthy' });
      
      healthMonitor.registerHealthCheck('test', checkFn);
      healthMonitor.unregisterHealthCheck('test');
      
      expect(healthMonitor.healthChecks.has('test')).toBe(false);
    });
  });

  describe('performHealthChecks', () => {
    it('should perform all registered health checks', async () => {
      const checkFn1 = jest.fn().mockResolvedValue({ status: 'healthy' });
      const checkFn2 = jest.fn().mockResolvedValue({ status: 'unhealthy' });
      
      healthMonitor.registerHealthCheck('check1', checkFn1);
      healthMonitor.registerHealthCheck('check2', checkFn2);
      
      const result = await healthMonitor.performHealthChecks();
      
      expect(result.overall).toBe('unhealthy');
      expect(result.checks).toHaveProperty('check1');
      expect(result.checks).toHaveProperty('check2');
      expect(result.checks.check1.status).toBe('healthy');
      expect(result.checks.check2.status).toBe('unhealthy');
    });

    it('should handle health check errors', async () => {
      const checkFn = jest.fn().mockRejectedValue(new Error('Check failed'));
      
      healthMonitor.registerHealthCheck('failing', checkFn);
      
      const result = await healthMonitor.performHealthChecks();
      
      expect(result.overall).toBe('unhealthy');
      expect(result.checks.failing.status).toBe('unhealthy');
      expect(result.checks.failing.error).toBe('Check failed');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status by default', () => {
      // Add a small delay to ensure uptime > 0
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 100);
      
      const status = healthMonitor.getHealthStatus();
      
      expect(status.status).toBe(HealthStatus.HEALTHY);
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      
      Date.now = originalNow;
    });

    it('should return unhealthy status when circuit breaker is open', () => {
      healthMonitor.updateCircuitBreakerState('OPEN');
      
      const status = healthMonitor.getHealthStatus();
      
      expect(status.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should return degraded status with high failure rate', () => {
      healthMonitor.recordSuccess();
      healthMonitor.recordFailure('Error 1');
      healthMonitor.recordFailure('Error 2');
      
      const status = healthMonitor.getHealthStatus();
      
      expect(status.status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics', () => {
      healthMonitor.recordSuccess(100);
      healthMonitor.recordFailure('Error');
      
      const metrics = healthMonitor.getMetrics();
      
      expect(metrics.messagesProcessed).toBe(1);
      expect(metrics.messagesFailed).toBe(1);
      expect(metrics.totalMessages).toBe(2);
      expect(metrics.successRate).toBe(50);
      expect(metrics.averageProcessingTime).toBe(100);
      expect(metrics.throughput).toBeGreaterThan(0);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      healthMonitor.recordSuccess(100);
      healthMonitor.recordFailure('Error');
      
      healthMonitor.clearMetrics();
      
      expect(healthMonitor.metrics.messagesProcessed).toBe(0);
      expect(healthMonitor.metrics.messagesFailed).toBe(0);
      expect(healthMonitor.metrics.totalProcessingTime).toBe(0);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts', () => {
      healthMonitor.recordFailure('Circuit breaker is open');
      
      const alerts = healthMonitor.getAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('circuit_breaker');
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      healthMonitor.recordFailure('Circuit breaker is open');
      healthMonitor.clearAlerts();
      
      expect(healthMonitor.alerts).toHaveLength(0);
    });
  });
});
