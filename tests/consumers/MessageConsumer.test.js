/**
 * @fileoverview Tests for MessageConsumer
 * @author Enterprise SQS Team
 * @version 1.0.0
 */

const MessageConsumer = require('../../src/consumers/MessageConsumer');
const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { ProcessingMode } = require('../../src/types');

describe('MessageConsumer', () => {
  let mockSQSClient;
  let consumer;

  beforeEach(() => {
    mockSQSClient = {
      executeCommand: jest.fn()
    };
    
    consumer = new MessageConsumer(mockSQSClient, 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
      processingMode: ProcessingMode.SEQUENTIAL,
      batchSize: 5,
      maxMessages: 10
    });
  });

  describe('constructor', () => {
    it('should create consumer with configuration', () => {
      expect(consumer.sqsClient).toBe(mockSQSClient);
      expect(consumer.queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
      expect(consumer.options.processingMode).toBe(ProcessingMode.SEQUENTIAL);
      expect(consumer.options.batchSize).toBe(5);
      expect(consumer.options.maxMessages).toBe(10);
    });

    it('should create consumer with default options', () => {
      const defaultConsumer = new MessageConsumer(mockSQSClient, 'test-queue');
      
      expect(defaultConsumer.options.processingMode).toBe(ProcessingMode.SEQUENTIAL);
      expect(defaultConsumer.options.batchSize).toBe(5);
      expect(defaultConsumer.options.maxMessages).toBe(10);
      expect(defaultConsumer.options.autoStart).toBe(true);
    });
  });

  describe('start', () => {
    it('should start consuming with message handler', async () => {
      const messageHandler = jest.fn();
      
      mockSQSClient.executeCommand.mockResolvedValue({ Messages: [] });
      
      await consumer.start(messageHandler);
      
      expect(consumer.messageHandler).toBe(messageHandler);
      expect(consumer.isRunning).toBe(true);
    });

    it('should throw error for invalid message handler', async () => {
      await expect(consumer.start(null)).rejects.toThrow('Message handler is required and must be a function');
      await expect(consumer.start('string')).rejects.toThrow('Message handler is required and must be a function');
    });
  });

  describe('stop', () => {
    it('should stop consuming', () => {
      consumer.isRunning = true;
      consumer.stop();
      
      expect(consumer.isRunning).toBe(false);
    });
  });

  describe('_consumeLoop', () => {
    it('should process messages when available', async () => {
      const messageHandler = jest.fn();
      const messages = [
        {
          MessageId: 'msg-1',
          Body: JSON.stringify({ type: 'test1' }),
          ReceiptHandle: 'handle-1'
        },
        {
          MessageId: 'msg-2',
          Body: JSON.stringify({ type: 'test2' }),
          ReceiptHandle: 'handle-2'
        }
      ];
      
      mockSQSClient.executeCommand
        .mockResolvedValueOnce({ Messages: messages })
        .mockResolvedValueOnce({ Messages: [] });
      
      await consumer.start(messageHandler);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messageHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle empty message response', async () => {
      const messageHandler = jest.fn();
      
      mockSQSClient.executeCommand.mockResolvedValue({ Messages: [] });
      
      await consumer.start(messageHandler);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      const messageHandler = jest.fn().mockRejectedValue(new Error('Processing failed'));
      const messages = [
        {
          MessageId: 'msg-1',
          Body: JSON.stringify({ type: 'test1' }),
          ReceiptHandle: 'handle-1'
        }
      ];
      
      mockSQSClient.executeCommand
        .mockResolvedValueOnce({ Messages: messages })
        .mockResolvedValueOnce({ Messages: [] });
      
      await consumer.start(messageHandler);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(messageHandler).toHaveBeenCalled();
    });
  });

  describe('_receiveMessages', () => {
    it('should receive messages from queue', async () => {
      const messages = [
        { MessageId: 'msg-1', Body: '{"type":"test1"}' },
        { MessageId: 'msg-2', Body: '{"type":"test2"}' }
      ];
      
      mockSQSClient.executeCommand.mockResolvedValue({ Messages: messages });
      
      const result = await consumer._receiveMessages(consumer.options);
      
      expect(result).toEqual(messages);
      expect(mockSQSClient.executeCommand).toHaveBeenCalledWith(
        expect.any(ReceiveMessageCommand)
      );
    });

    it('should handle empty response', async () => {
      mockSQSClient.executeCommand.mockResolvedValue({ Messages: [] });
      
      const result = await consumer._receiveMessages(consumer.options);
      
      expect(result).toEqual([]);
    });
  });

  describe('_deleteProcessedMessages', () => {
    it('should delete successfully processed messages', async () => {
      const messages = [
        { MessageId: 'msg-1', ReceiptHandle: 'handle-1' },
        { MessageId: 'msg-2', ReceiptHandle: 'handle-2' }
      ];
      
      const results = {
        successful: 2,
        failed: 0,
        errors: []
      };
      
      mockSQSClient.executeCommand.mockResolvedValue({});
      
      await consumer._deleteProcessedMessages(messages, results);
      
      expect(mockSQSClient.executeCommand).toHaveBeenCalledWith(
        expect.any(DeleteMessageCommand)
      );
    });

    it('should not delete failed messages', async () => {
      const messages = [
        { MessageId: 'msg-1', ReceiptHandle: 'handle-1' }
      ];
      
      const results = {
        successful: 0,
        failed: 1,
        errors: [{ messageId: 'msg-1', error: 'Processing failed' }]
      };
      
      await consumer._deleteProcessedMessages(messages, results);
      
      expect(mockSQSClient.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('_deleteMessage', () => {
    it('should delete single message', async () => {
      mockSQSClient.executeCommand.mockResolvedValue({});
      
      await consumer._deleteMessage('handle-123');
      
      expect(mockSQSClient.executeCommand).toHaveBeenCalledWith(
        expect.any(DeleteMessageCommand)
      );
    });

    it('should handle delete errors', async () => {
      mockSQSClient.executeCommand.mockRejectedValue(new Error('Delete failed'));
      
      // Should not throw
      await expect(consumer._deleteMessage('handle-123')).resolves.toBeUndefined();
    });
  });

  describe('_updateHealthMonitor', () => {
    it('should update health monitor with results', () => {
      const mockHealthMonitor = {
        recordSuccess: jest.fn(),
        recordFailure: jest.fn()
      };
      
      consumer.setHealthMonitor(mockHealthMonitor);
      
      const results = {
        successful: 2,
        failed: 1,
        processingTime: 100,
        errors: [{ error: 'Test error' }]
      };
      
      consumer._updateHealthMonitor(results);
      
      expect(mockHealthMonitor.recordSuccess).toHaveBeenCalledWith(100);
      expect(mockHealthMonitor.recordFailure).toHaveBeenCalledWith('Test error');
    });
  });

  describe('setHealthMonitor', () => {
    it('should set health monitor', () => {
      const mockHealthMonitor = { recordSuccess: jest.fn() };
      
      consumer.setHealthMonitor(mockHealthMonitor);
      
      expect(consumer.healthMonitor).toBe(mockHealthMonitor);
    });
  });

  describe('getProcessingMode', () => {
    it('should return current processing mode', () => {
      expect(consumer.getProcessingMode()).toBe(ProcessingMode.SEQUENTIAL);
    });
  });

  describe('setProcessingMode', () => {
    it('should set processing mode', () => {
      consumer.setProcessingMode(ProcessingMode.PARALLEL);
      
      expect(consumer.getProcessingMode()).toBe(ProcessingMode.PARALLEL);
      expect(consumer.options.processingMode).toBe(ProcessingMode.PARALLEL);
    });
  });

  describe('getStats', () => {
    it('should return processing statistics', () => {
      const stats = consumer.getStats();
      
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('mode');
    });
  });

  describe('resetStats', () => {
    it('should reset processing statistics', () => {
      consumer.resetStats();
      
      const stats = consumer.getStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return consumer configuration', () => {
      const config = consumer.getConfig();
      
      expect(config.queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
      expect(config.processingMode).toBe(ProcessingMode.SEQUENTIAL);
      expect(config.batchSize).toBe(5);
    });
  });

  describe('updateConfig', () => {
    it('should update consumer configuration', () => {
      consumer.updateConfig({
        processingMode: ProcessingMode.PARALLEL,
        batchSize: 10,
        maxMessages: 20
      });
      
      expect(consumer.options.processingMode).toBe(ProcessingMode.PARALLEL);
      expect(consumer.options.batchSize).toBe(10);
      expect(consumer.options.maxMessages).toBe(20);
    });
  });

  describe('isConsumerRunning', () => {
    it('should return running status', () => {
      expect(consumer.isConsumerRunning()).toBe(false);
      
      consumer.isRunning = true;
      expect(consumer.isConsumerRunning()).toBe(true);
    });
  });
});
