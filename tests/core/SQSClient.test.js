/**
 * @fileoverview Tests for SQSClient
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const SQSClient = require('../../src/core/SQSClient');
const { SQSClient: AWSSQSClient } = require('@aws-sdk/client-sqs');

describe('SQSClient', () => {
  let sqsClient;
  let mockAWSClient;

  beforeEach(() => {
    mockAWSClient = {
      send: jest.fn()
    };
    
    AWSSQSClient.mockImplementation(() => mockAWSClient);
    
    sqsClient = new SQSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      },
      circuitBreaker: {
        failureThreshold: 3,
        timeout: 1000
      },
      retry: {
        maxRetries: 2,
        backoffMultiplier: 2
      }
    });
  });

  describe('constructor', () => {
    it('should create SQS client with configuration', () => {
      expect(sqsClient.region).toBe('us-east-1');
      expect(sqsClient.credentials).toEqual({
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      });
      expect(sqsClient.awsClient).toBe(mockAWSClient);
    });

    it('should initialize circuit breaker and retry manager', () => {
      expect(sqsClient.circuitBreaker).toBeDefined();
      expect(sqsClient.retryManager).toBeDefined();
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const mockResult = { MessageId: 'test-123' };
      mockAWSClient.send.mockResolvedValue(mockResult);
      
      const command = { QueueUrl: 'test-queue' };
      const result = await sqsClient.executeCommand(command);
      
      expect(result).toEqual(mockResult);
      expect(mockAWSClient.send).toHaveBeenCalledWith(command);
    });

    it('should handle command failure with retry', async () => {
      const error = new Error('AWS Error');
      error.name = 'ThrottlingException';
      
      mockAWSClient.send
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ MessageId: 'test-123' });
      
      const command = { QueueUrl: 'test-queue' };
      const result = await sqsClient.executeCommand(command);
      
      expect(result).toEqual({ MessageId: 'test-123' });
      expect(mockAWSClient.send).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Non-retryable error');
      error.name = 'InvalidParameterException';
      
      mockAWSClient.send.mockRejectedValue(error);
      
      const command = { QueueUrl: 'test-queue' };
      
      await expect(sqsClient.executeCommand(command)).rejects.toThrow('Non-retryable error');
      expect(mockAWSClient.send).toHaveBeenCalledTimes(1);
    });

    it('should not execute when circuit breaker is open', async () => {
      // Open circuit breaker
      for (let i = 0; i < 3; i++) {
        sqsClient.circuitBreaker.recordFailure();
      }
      
      const command = { QueueUrl: 'test-queue' };
      
      await expect(sqsClient.executeCommand(command)).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('getCircuitBreakerStatus', () => {
    it('should return circuit breaker status', () => {
      const status = sqsClient.getCircuitBreakerStatus();
      
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('successCount');
      expect(status).toHaveProperty('canExecute');
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker', () => {
      sqsClient.circuitBreaker.recordFailure();
      sqsClient.resetCircuitBreaker();
      
      expect(sqsClient.circuitBreaker.getFailureCount()).toBe(0);
      expect(sqsClient.circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('getRetryConfig', () => {
    it('should return retry configuration', () => {
      const config = sqsClient.getRetryConfig();
      
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('backoffMultiplier');
      expect(config).toHaveProperty('maxBackoffMs');
      expect(config).toHaveProperty('initialDelayMs');
    });
  });

  describe('updateRetryConfig', () => {
    it('should update retry configuration', () => {
      sqsClient.updateRetryConfig({
        maxRetries: 5,
        backoffMultiplier: 3
      });
      
      const config = sqsClient.getRetryConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.backoffMultiplier).toBe(3);
    });
  });

  describe('getAWSClient', () => {
    it('should return AWS client', () => {
      const client = sqsClient.getAWSClient();
      expect(client).toBe(mockAWSClient);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = sqsClient.getConfig();
      
      expect(config).toHaveProperty('region');
      expect(config).toHaveProperty('credentials');
      expect(config).toHaveProperty('circuitBreaker');
      expect(config).toHaveProperty('retry');
    });
  });
});
