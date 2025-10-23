/**
 * @fileoverview Tests for CircuitBreaker
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const CircuitBreaker = require('../../src/core/CircuitBreaker');
const { CircuitBreakerState } = require('../../src/types');

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      timeout: 1000,
      monitoringPeriod: 500
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create circuit breaker with default config', () => {
      const cb = new CircuitBreaker();
      expect(cb.failureThreshold).toBe(5);
      expect(cb.timeout).toBe(60000);
      expect(cb.monitoringPeriod).toBe(10000);
    });

    it('should create circuit breaker with custom config', () => {
      expect(circuitBreaker.failureThreshold).toBe(3);
      expect(circuitBreaker.timeout).toBe(1000);
      expect(circuitBreaker.monitoringPeriod).toBe(500);
    });
  });

  describe('canExecute', () => {
    it('should allow execution when circuit is closed', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should not allow execution when circuit is open', () => {
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should allow execution when circuit is half-open', () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      
      // Wait for timeout
      jest.advanceTimersByTime(1001);
      
      expect(circuitBreaker.canExecute()).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should record success and update state', () => {
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getSuccessCount()).toBe(1);
    });

    it('should close circuit when in half-open state with enough successes', () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      
      // Wait for timeout to move to half-open
      jest.advanceTimersByTime(1001);
      
      // Call canExecute to trigger transition to half-open state
      circuitBreaker.canExecute();
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
      
      // Record enough successes (need failureThreshold number of successes)
      for (let i = 0; i < circuitBreaker.failureThreshold; i++) {
        circuitBreaker.recordSuccess();
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('recordFailure', () => {
    it('should record failure and update state', () => {
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should open circuit when failure threshold is reached', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to closed state', () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.getSuccessCount()).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('getFailureCount', () => {
    it('should return current failure count', () => {
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
  });

  describe('getSuccessCount', () => {
    it('should return current success count', () => {
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getSuccessCount()).toBe(1);
    });
  });

  describe('getTimeSinceLastFailure', () => {
    it('should return null when no failures recorded', () => {
      expect(circuitBreaker.getTimeSinceLastFailure()).toBe(null);
    });

    it('should return time since last failure', () => {
      circuitBreaker.recordFailure();
      const time = circuitBreaker.getTimeSinceLastFailure();
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive status', () => {
      const status = circuitBreaker.getStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('successCount');
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('timeSinceLastFailure');
      expect(status).toHaveProperty('canExecute');
    });
  });
});
