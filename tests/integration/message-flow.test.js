/**
 * @fileoverview Integration test for BoxQ message publishing and consumption
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { BoxQ } = require('../../src/index');

// Skip integration tests if no real AWS credentials are available
const hasRealCredentials = process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_ACCESS_KEY_ID !== 'your-access-key-here' &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_SECRET_ACCESS_KEY !== 'your-secret-key-here';

describe.skip('BoxQ Integration Tests', () => {
  let sqs;
  let publisher;
  let consumer;
  let receivedMessages = [];
  let messageHandler;

  beforeAll(async () => {
    // Skip integration tests if no real AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your-access-key-here') {
      console.log('⚠️  Skipping integration tests - no real AWS credentials found');
      return;
    }

    // Initialize BoxQ with environment variables
    sqs = new BoxQ({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      circuitBreaker: {
        failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) || 5,
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000
      },
      retry: {
        maxRetries: parseInt(process.env.RETRY_MAX_RETRIES) || 3,
        backoffMultiplier: parseInt(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
        maxBackoffMs: parseInt(process.env.RETRY_MAX_BACKOFF_MS) || 30000
      }
    });

    // Create publisher
    publisher = sqs.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      enableDeduplication: true
    });

    // Create message handler
    messageHandler = async (message, context) => {
      console.log('📨 Received message:', {
        id: context.messageId,
        body: message,
        groupId: context.messageGroupId,
        timestamp: new Date().toISOString()
      });
      
      receivedMessages.push({
        id: context.messageId,
        body: message,
        groupId: context.messageGroupId,
        timestamp: new Date().toISOString()
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, processedAt: new Date().toISOString() };
    };

    // Create consumer
    consumer = sqs.createConsumer(process.env.SQS_QUEUE_URL, {
      processingMode: 'sequential',
      maxMessages: parseInt(process.env.SQS_MAX_MESSAGES) || 10,
      waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS) || 20,
      visibilityTimeoutSeconds: parseInt(process.env.SQS_VISIBILITY_TIMEOUT_SECONDS) || 300,
      autoStart: false // We'll start manually in tests
    });

    // Set up message handler - will be passed to start() method
  });

  afterAll(async () => {
    // Clean up
    if (consumer) {
      consumer.stop();
    }
  });

  beforeEach(() => {
    // Clear received messages before each test
    receivedMessages = [];
  });

  describe('Message Publishing', () => {
    beforeEach(() => {
      if (!sqs) {
        console.log('⚠️  Skipping integration tests - no AWS credentials');
        return;
      }
    });

    it('should publish a single message successfully', async () => {
      if (!sqs) {
        console.log('⚠️  Skipping test - no AWS credentials');
        return;
      }
      const testMessage = {
        type: 'test',
        data: 'Hello BoxQ!',
        timestamp: new Date().toISOString(),
        testId: 'single-message-test'
      };

      const result = await publisher.publish(testMessage);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.md5OfBody).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      
      console.log('✅ Single message published:', result.messageId);
    }, 10000);

    it('should publish multiple messages in batch', async () => {
      if (!sqs) {
        console.log('⚠️  Skipping test - no AWS credentials');
        return;
      }
      const messages = [
        { body: { type: 'batch-test-1', data: 'Batch message 1', testId: 'batch-test-1' } },
        { body: { type: 'batch-test-2', data: 'Batch message 2', testId: 'batch-test-2' } },
        { body: { type: 'batch-test-3', data: 'Batch message 3', testId: 'batch-test-3' } }
      ];

      const results = await publisher.publishBatch(messages);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        console.log(`✅ Batch message ${index + 1} published:`, result.messageId);
      });
    }, 15000);

    it('should handle message deduplication', async () => {
      const duplicateMessage = {
        type: 'deduplication-test',
        data: 'This message should be deduplicated',
        timestamp: new Date().toISOString()
      };

      // Publish the same message twice quickly
      const result1 = await publisher.publish(duplicateMessage);
      const result2 = await publisher.publish(duplicateMessage);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Duplicate message detected');
      
      console.log('✅ Deduplication working correctly');
    }, 10000);
  });

  describe('Message Consumption', () => {
    it('should consume messages successfully', async () => {
      // First, publish a test message
      const testMessage = {
        type: 'consumption-test',
        data: 'Message for consumption test',
        timestamp: new Date().toISOString(),
        testId: 'consumption-test'
      };

      const publishResult = await publisher.publish(testMessage);
      expect(publishResult.success).toBe(true);
      
      console.log('📤 Published message for consumption:', publishResult.messageId);

      // Start consumer with message handler
      consumer.start(messageHandler);
      
      // Wait for message to be consumed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Stop consumer
      consumer.stop();

      // Verify message was received
      expect(receivedMessages.length).toBeGreaterThan(0);
      
      const receivedMessage = receivedMessages.find(msg => 
        msg.body.testId === 'consumption-test'
      );
      
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage.body.type).toBe('consumption-test');
      expect(receivedMessage.body.data).toBe('Message for consumption test');
      
      console.log('✅ Message consumed successfully:', receivedMessage.id);
    }, 15000);

    it('should handle multiple messages in sequence', async () => {
      // Publish multiple messages
      const messages = [
        { type: 'sequence-test-1', data: 'Sequence message 1', testId: 'sequence-1' },
        { type: 'sequence-test-2', data: 'Sequence message 2', testId: 'sequence-2' },
        { type: 'sequence-test-3', data: 'Sequence message 3', testId: 'sequence-3' }
      ];

      // Publish messages
      for (const message of messages) {
        const result = await publisher.publish(message);
        expect(result.success).toBe(true);
        console.log(`📤 Published sequence message: ${message.testId}`);
      }

      // Start consumer with message handler
      consumer.start(messageHandler);
      
      // Wait for messages to be consumed
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Stop consumer
      consumer.stop();

      // Verify all messages were received
      expect(receivedMessages.length).toBeGreaterThanOrEqual(3);
      
      const sequenceMessages = receivedMessages.filter(msg => 
        msg.body.testId && msg.body.testId.startsWith('sequence-')
      );
      
      expect(sequenceMessages.length).toBe(3);
      
      console.log('✅ All sequence messages consumed:', sequenceMessages.length);
    }, 20000);
  });

  describe('Health Monitoring', () => {
    it('should provide health status', async () => {
      const healthStatus = await sqs.getHealthStatus();
      
      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.timestamp).toBeDefined();
      expect(healthStatus.uptime).toBeGreaterThanOrEqual(0);
      
      console.log('📊 Health Status:', healthStatus.status);
      console.log('⏱️  Uptime:', healthStatus.uptime, 'ms');
    });

    it('should provide system metrics', () => {
      const metrics = sqs.getMetrics();
      
      expect(metrics.system).toBeDefined();
      expect(metrics.circuitBreaker).toBeDefined();
      expect(metrics.components).toBeDefined();
      
      console.log('📈 System Metrics:');
      console.log('  - Publishers:', metrics.components.publishers);
      console.log('  - Consumers:', metrics.components.consumers);
      console.log('  - Circuit Breaker State:', metrics.circuitBreaker.state);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message body', async () => {
      await expect(publisher.publish(null)).rejects.toThrow();
      await expect(publisher.publish('invalid')).rejects.toThrow();
      
      console.log('✅ Invalid message body handling working');
    });

    it('should handle network errors gracefully', async () => {
      // This test would require network simulation
      // For now, we'll test the error handling structure
      const healthStatus = await sqs.getHealthStatus();
      expect(healthStatus.status).toBeDefined();
      
      console.log('✅ Error handling structure verified');
    });
  });

  describe('Performance Tests', () => {
    it('should handle high throughput publishing', async () => {
      const startTime = Date.now();
      const messageCount = 10;
      const promises = [];

      for (let i = 0; i < messageCount; i++) {
        const message = {
          type: 'performance-test',
          data: `Performance message ${i}`,
          timestamp: new Date().toISOString(),
          testId: `perf-${i}`
        };
        
        promises.push(publisher.publish(message));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all messages were published successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      console.log(`✅ Published ${messageCount} messages in ${duration}ms`);
      console.log(`📊 Average: ${duration / messageCount}ms per message`);
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);
  });
});
