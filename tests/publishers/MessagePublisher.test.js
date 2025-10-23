/**
 * @fileoverview Tests for MessagePublisher
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const MessagePublisher = require('../../src/publishers/MessagePublisher');
const { SendMessageCommand } = require('@aws-sdk/client-sqs');

describe('MessagePublisher', () => {
  let mockSQSClient;
  let publisher;

  beforeEach(() => {
    mockSQSClient = {
      executeCommand: jest.fn()
    };
    
    publisher = new MessagePublisher(mockSQSClient, 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo', {
      messageGroupId: 'test-group',
      enableDeduplication: true
    });
  });

  describe('constructor', () => {
    it('should create publisher with configuration', () => {
      expect(publisher.sqsClient).toBe(mockSQSClient);
      expect(publisher.queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo');
      expect(publisher.messageGroupId).toBe('test-group');
      expect(publisher.enableDeduplication).toBe(true);
    });

    it('should create publisher with default options', () => {
      const defaultPublisher = new MessagePublisher(mockSQSClient, 'test-queue');
      
      expect(defaultPublisher.enableDeduplication).toBe(true);
      expect(defaultPublisher.messageGroupId).toBeUndefined();
    });
  });

  describe('publish', () => {
    it('should publish message successfully', async () => {
      const messageBody = { type: 'test', data: 'hello' };
      const options = { messageGroupId: 'group-1' };
      
      mockSQSClient.executeCommand.mockResolvedValue({
        MessageId: 'msg-123',
        MD5OfBody: 'hash-123'
      });
      
      const result = await publisher.publish(messageBody, options);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(result.md5OfBody).toBe('hash-123');
      expect(mockSQSClient.executeCommand).toHaveBeenCalledWith(
        expect.any(SendMessageCommand)
      );
    });

    it('should handle publishing failure', async () => {
      const messageBody = { type: 'test', data: 'hello' };
      
      mockSQSClient.executeCommand.mockRejectedValue(new Error('Publishing failed'));
      
      const result = await publisher.publish(messageBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Publishing failed');
    });

    it('should validate message body', async () => {
      await expect(publisher.publish(null)).rejects.toThrow('Message body is required and must be an object');
      await expect(publisher.publish('string')).rejects.toThrow('Message body is required and must be an object');
    });

    it('should validate options', async () => {
      const messageBody = { type: 'test' };
      
      await expect(publisher.publish(messageBody, { messageGroupId: 123 })).rejects.toThrow('Message group ID must be a string');
      await expect(publisher.publish(messageBody, { delaySeconds: -1 })).rejects.toThrow('Delay seconds must be a non-negative number');
    });

    it('should handle duplicate messages', async () => {
      const messageBody = { type: 'test', data: 'hello' };
      
      // First publish
      mockSQSClient.executeCommand.mockResolvedValueOnce({
        MessageId: 'msg-123',
        MD5OfBody: 'hash-123'
      });
      
      await publisher.publish(messageBody);
      
      // Second publish with same content should fail
      const result = await publisher.publish(messageBody);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate message detected');
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple messages', async () => {
      // Create a new publisher without deduplication for this test
      const testPublisher = new MessagePublisher(mockSQSClient, 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo', {
        messageGroupId: 'test-group',
        enableDeduplication: false
      });
      
      const messages = [
        { body: { type: 'test1' }, options: {} },
        { body: { type: 'test2' }, options: {} }
      ];
      
      mockSQSClient.executeCommand
        .mockResolvedValueOnce({ MessageId: 'msg-1', MD5OfBody: 'hash-1' })
        .mockResolvedValueOnce({ MessageId: 'msg-2', MD5OfBody: 'hash-2' });
      
      const results = await testPublisher.publishBatch(messages);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle batch publishing with errors', async () => {
      const messages = [
        { body: { type: 'test1' }, options: {} },
        { body: { type: 'test2' }, options: {} }
      ];
      
      mockSQSClient.executeCommand
        .mockResolvedValueOnce({ MessageId: 'msg-1', MD5OfBody: 'hash-1' })
        .mockRejectedValueOnce(new Error('Batch error'));
      
      const results = await publisher.publishBatch(messages);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('_generateDeduplicationId', () => {
    it('should use custom deduplication ID if provided', () => {
      const messageBody = { type: 'test' };
      const options = { messageDeduplicationId: 'custom-id' };
      
      const id = publisher._generateDeduplicationId(messageBody, options);
      
      expect(id).toBe('custom-id');
    });

    it('should generate deduplication ID for FIFO queue', () => {
      const messageBody = { type: 'test' };
      const options = {};
      
      const id = publisher._generateDeduplicationId(messageBody, options);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  describe('_isFIFOQueue', () => {
    it('should detect FIFO queue', () => {
      expect(publisher._isFIFOQueue()).toBe(true);
    });

    it('should detect non-FIFO queue', () => {
      const nonFifoPublisher = new MessagePublisher(mockSQSClient, 'test-queue');
      expect(nonFifoPublisher._isFIFOQueue()).toBe(false);
    });
  });

  describe('_validateMessageBody', () => {
    it('should validate valid message body', () => {
      expect(() => publisher._validateMessageBody({ type: 'test' })).not.toThrow();
    });

    it('should throw error for invalid message body', () => {
      expect(() => publisher._validateMessageBody(null)).toThrow('Message body is required and must be an object');
      expect(() => publisher._validateMessageBody('string')).toThrow('Message body is required and must be an object');
    });
  });

  describe('_validateOptions', () => {
    it('should validate valid options', () => {
      expect(() => publisher._validateOptions({ messageGroupId: 'group-1' })).not.toThrow();
      expect(() => publisher._validateOptions({ delaySeconds: 10 })).not.toThrow();
    });

    it('should throw error for invalid options', () => {
      expect(() => publisher._validateOptions({ messageGroupId: 123 })).toThrow('Message group ID must be a string');
      expect(() => publisher._validateOptions({ delaySeconds: -1 })).toThrow('Delay seconds must be a non-negative number');
    });
  });

  describe('_buildMessageAttributes', () => {
    it('should build message attributes for different types', () => {
      const attributes = {
        string: 'test',
        number: 123,
        boolean: true
      };
      
      const result = publisher._buildMessageAttributes(attributes);
      
      expect(result.string.DataType).toBe('String');
      expect(result.string.StringValue).toBe('test');
      expect(result.number.DataType).toBe('Number');
      expect(result.number.StringValue).toBe('123');
      expect(result.boolean.DataType).toBe('String');
      expect(result.boolean.StringValue).toBe('true');
    });

    it('should handle empty attributes', () => {
      const result = publisher._buildMessageAttributes();
      
      expect(result).toEqual({});
    });
  });

  describe('getDeduplicationManager', () => {
    it('should return deduplication manager', () => {
      const manager = publisher.getDeduplicationManager();
      
      expect(manager).toBeDefined();
      expect(manager.getConfig).toBeDefined();
    });
  });

  describe('getQueueUrl', () => {
    it('should return queue URL', () => {
      expect(publisher.getQueueUrl()).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo');
    });
  });

  describe('getConfig', () => {
    it('should return publisher configuration', () => {
      const config = publisher.getConfig();
      
      expect(config.queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue.fifo');
      expect(config.messageGroupId).toBe('test-group');
      expect(config.enableDeduplication).toBe(true);
    });
  });
});
