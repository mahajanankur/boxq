/**
 * @fileoverview Tests for RetryManager
 * @author Enterprise SQS Team
 * @version 1.0.0
 */

const RetryManager = require('../../src/core/RetryManager');

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffMs: 1000,
      initialDelayMs: 100
    });
  });

  describe('constructor', () => {
    it('should create retry manager with default config', () => {
      const rm = new RetryManager();
      expect(rm.maxRetries).toBe(3);
      expect(rm.backoffMultiplier).toBe(2);
      expect(rm.maxBackoffMs).toBe(30000);
      expect(rm.initialDelayMs).toBe(1000);
    });

    it('should create retry manager with custom config', () => {
      expect(retryManager.maxRetries).toBe(3);
      expect(retryManager.backoffMultiplier).toBe(2);
      expect(retryManager.maxBackoffMs).toBe(1000);
      expect(retryManager.initialDelayMs).toBe(100);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate correct delay for attempt 0', () => {
      const delay = retryManager.calculateDelay(0);
      expect(delay).toBe(100);
    });

    it('should calculate correct delay for attempt 1', () => {
      const delay = retryManager.calculateDelay(1);
      expect(delay).toBe(200);
    });

    it('should calculate correct delay for attempt 2', () => {
      const delay = retryManager.calculateDelay(2);
      expect(delay).toBe(400);
    });

    it('should not exceed max backoff', () => {
      const delay = retryManager.calculateDelay(10);
      expect(delay).toBe(1000);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified milliseconds', async () => {
      const start = Date.now();
      await retryManager.sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('executeWithRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryManager.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(retryManager.executeWithRetry(fn)).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should call onRetry callback', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const onRetry = jest.fn();
      
      await expect(retryManager.executeWithRetry(fn, { onRetry })).rejects.toThrow();
      expect(onRetry).toHaveBeenCalled();
    });

    it('should call onFailure callback', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const onFailure = jest.fn();
      
      await expect(retryManager.executeWithRetry(fn, { onFailure })).rejects.toThrow();
      expect(onFailure).toHaveBeenCalled();
    });

    it('should respect shouldRetry function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const shouldRetry = jest.fn().mockReturnValue(false);
      
      await expect(retryManager.executeWithRetry(fn, { shouldRetry })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('executeWithRetryDetailed', () => {
    it('should return detailed results on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryManager.executeWithRetryDetailed(fn);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.retryCount).toBe(1);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].success).toBe(true);
    });

    it('should return detailed results on failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const result = await retryManager.executeWithRetryDetailed(fn);
      
      expect(result.success).toBe(false);
      expect(result.result).toBe(null);
      expect(result.retryCount).toBe(4);
      expect(result.attempts).toHaveLength(4);
      expect(result.error).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = retryManager.getConfig();
      
      expect(config).toEqual({
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffMs: 1000,
        initialDelayMs: 100
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      retryManager.updateConfig({
        maxRetries: 5,
        backoffMultiplier: 3
      });
      
      expect(retryManager.maxRetries).toBe(5);
      expect(retryManager.backoffMultiplier).toBe(3);
    });
  });
});
