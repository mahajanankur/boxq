/**
 * @fileoverview Tests for BoxQ Main Library
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { BoxQ, ProcessingMode, HealthStatus } = require('../src/index');

describe('BoxQ', () => {
  let sqs;
  let mockSQSClient;

  beforeEach(() => {
    mockSQSClient = {
      executeCommand: jest.fn(),
      getCircuitBreakerStatus: jest.fn().mockReturnValue({
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        canExecute: true
      }),
      resetCircuitBreaker: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        region: 'us-east-1',
        credentials: {},
        circuitBreaker: {},
        retry: {}
      })
    };

    sqs = new BoxQ({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      },
      circuitBreaker: {
        failureThreshold: 5,
        timeout: 60000
      },
      retry: {
        maxRetries: 3,
        backoffMultiplier: 2
      }
    });

    // Mock the SQS client
    sqs.sqsClient = mockSQSClient;
  });

  describe('constructor', () => {
    it('should create Enterprise SQS instance', () => {
      expect(sqs.config).toBeDefined();
      expect(sqs.sqsClient).toBeDefined();
      expect(sqs.healthMonitor).toBeDefined();
      expect(sqs.publishers).toBeInstanceOf(Map);
      expect(sqs.consumers).toBeInstanceOf(Map);
    });

    it('should register health checks', () => {
      expect(sqs.healthMonitor.healthChecks.size).toBeGreaterThan(0);
    });
  });

  describe('createPublisher', () => {
    it('should create message publisher', () => {
      const publisher = sqs.createPublisher('test-queue.fifo', {
        messageGroupId: 'group-1',
        enableDeduplication: true
      });

      expect(publisher).toBeDefined();
      expect(publisher.getQueueUrl()).toBe('test-queue.fifo');
      expect(sqs.publishers.has('test-queue.fifo')).toBe(true);
    });

    it('should create publisher with default options', () => {
      const publisher = sqs.createPublisher('test-queue');

      expect(publisher).toBeDefined();
      expect(publisher.enableDeduplication).toBe(true);
    });
  });

  describe('createBatchPublisher', () => {
    it('should create batch publisher', () => {
      const batchPublisher = sqs.createBatchPublisher('test-queue.fifo', {
        messageGroupId: 'group-1',
        batchSize: 10
      });

      expect(batchPublisher).toBeDefined();
      expect(batchPublisher.getQueueUrl()).toBe('test-queue.fifo');
      expect(sqs.publishers.has('test-queue.fifo-batch')).toBe(true);
    });
  });

  describe('createConsumer', () => {
    it('should create message consumer', () => {
      const consumer = sqs.createConsumer('test-queue', {
        processingMode: ProcessingMode.PARALLEL,
        batchSize: 5
      });

      expect(consumer).toBeDefined();
      expect(consumer.getQueueUrl()).toBe('test-queue');
      expect(sqs.consumers.has('test-queue')).toBe(true);
    });

    it('should set health monitor on consumer', () => {
      const consumer = sqs.createConsumer('test-queue');
      
      expect(consumer.healthMonitor).toBe(sqs.healthMonitor);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const status = await sqs.getHealthStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('details');
    });

    it('should return unhealthy status on error', async () => {
      sqs.healthMonitor.performHealthChecks = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const status = await sqs.getHealthStatus();

      expect(status.status).toBe(HealthStatus.UNHEALTHY);
      expect(status.error).toBe('Health check failed');
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', () => {
      const metrics = sqs.getMetrics();

      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('circuitBreaker');
      expect(metrics).toHaveProperty('components');
      expect(metrics).toHaveProperty('alerts');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      sqs.resetMetrics();

      expect(sqs.healthMonitor.clearMetrics).toHaveBeenCalled();
      expect(sqs.healthMonitor.clearAlerts).toHaveBeenCalled();
      expect(sqs.sqsClient.resetCircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('getSQSClient', () => {
    it('should return SQS client', () => {
      const client = sqs.getSQSClient();
      expect(client).toBe(mockSQSClient);
    });
  });

  describe('getHealthMonitor', () => {
    it('should return health monitor', () => {
      const monitor = sqs.getHealthMonitor();
      expect(monitor).toBe(sqs.healthMonitor);
    });
  });

  describe('getPublishers', () => {
    it('should return publishers map', () => {
      const publishers = sqs.getPublishers();
      expect(publishers).toBeInstanceOf(Map);
    });
  });

  describe('getConsumers', () => {
    it('should return consumers map', () => {
      const consumers = sqs.getConsumers();
      expect(consumers).toBeInstanceOf(Map);
    });
  });

  describe('stopAllConsumers', () => {
    it('should stop all consumers', () => {
      const consumer1 = { stop: jest.fn() };
      const consumer2 = { stop: jest.fn() };
      
      sqs.consumers.set('queue1', consumer1);
      sqs.consumers.set('queue2', consumer2);
      
      sqs.stopAllConsumers();
      
      expect(consumer1.stop).toHaveBeenCalled();
      expect(consumer2.stop).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = sqs.getConfig();

      expect(config).toHaveProperty('region');
      expect(config).toHaveProperty('credentials');
      expect(config).toHaveProperty('sqsClient');
      expect(config).toHaveProperty('healthMonitor');
    });
  });

  describe('_registerHealthChecks', () => {
    it('should register health checks', () => {
      expect(sqs.healthMonitor.healthChecks.has('sqsClient')).toBe(true);
      expect(sqs.healthMonitor.healthChecks.has('publishers')).toBe(true);
      expect(sqs.healthMonitor.healthChecks.has('consumers')).toBe(true);
    });
  });
});

describe('ProcessingMode', () => {
  it('should have correct values', () => {
    expect(ProcessingMode.SEQUENTIAL).toBe('sequential');
    expect(ProcessingMode.PARALLEL).toBe('parallel');
  });
});

describe('HealthStatus', () => {
  it('should have correct values', () => {
    expect(HealthStatus.HEALTHY).toBe('healthy');
    expect(HealthStatus.UNHEALTHY).toBe('unhealthy');
    expect(HealthStatus.DEGRADED).toBe('degraded');
  });
});
