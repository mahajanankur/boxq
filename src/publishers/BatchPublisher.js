/**
 * @fileoverview Batch Publisher for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { SendMessageBatchCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');
const DeduplicationManager = require('../utils/DeduplicationManager');

/**
 * Batch Publisher class for publishing multiple messages efficiently
 * Provides optimized batch publishing with deduplication and error handling
 */
class BatchPublisher {
  /**
   * Creates a new BatchPublisher instance
   * @param {Object} sqsClient - SQS client instance
   * @param {string} queueUrl - Queue URL
   * @param {Object} options - Batch publisher options
   * @param {string} [options.messageGroupId] - Default message group ID
   * @param {boolean} [options.enableDeduplication=true] - Enable content-based deduplication
   * @param {number} [options.batchSize=10] - Maximum batch size
   */
  constructor(sqsClient, queueUrl, options = {}) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.messageGroupId = options.messageGroupId;
    this.enableDeduplication = options.enableDeduplication !== false;
    this.batchSize = Math.min(options.batchSize || 10, 10); // SQS max is 10
    this.deduplicationManager = new DeduplicationManager({
      strategy: options.deduplicationStrategy || 'content'
    });
  }

  /**
   * Publishes multiple messages in optimized batches
   * @param {Array} messages - Array of message objects
   * @param {Object} [options] - Publishing options
   * @param {number} [options.batchSize] - Override default batch size
   * @param {boolean} [options.continueOnError=true] - Continue processing on errors
   * @returns {Promise<Object>} Batch publishing results
   */
  publishBatch = async (messages, options = {}) => {
    const startTime = Date.now();
    const batchSize = options.batchSize || this.batchSize;
    const continueOnError = options.continueOnError !== false;
    
    const results = {
      totalMessages: messages.length,
      successfulMessages: 0,
      failedMessages: 0,
      batches: [],
      errors: [],
      processingTime: 0
    };
    
    try {
      // Process messages in batches
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchResult = await this._processBatch(batch, i);
        
        results.batches.push(batchResult);
        results.successfulMessages += batchResult.successful;
        results.failedMessages += batchResult.failed;
        
        if (batchResult.errors.length > 0) {
          results.errors.push(...batchResult.errors);
          
          if (!continueOnError) {
            throw new Error(`Batch processing failed: ${batchResult.errors[0].message}`);
          }
        }
      }
      
      results.processingTime = Date.now() - startTime;
      return results;
      
    } catch (error) {
      results.processingTime = Date.now() - startTime;
      results.errors.push({
        type: 'batch_processing',
        message: error.message,
        timestamp: Date.now()
      });
      
      return results;
    }
  };

  /**
   * Processes a single batch of messages
   * @private
   * @param {Array} batch - Batch of messages
   * @param {number} batchIndex - Batch index
   * @returns {Promise<Object>} Batch processing result
   */
  _processBatch = async (batch, batchIndex) => {
    const batchResult = {
      batchIndex,
      total: batch.length,
      successful: 0,
      failed: 0,
      errors: [],
      messages: []
    };
    
    try {
      // Prepare batch entries
      const entries = [];
      const messageMap = new Map();
      
      for (let i = 0; i < batch.length; i++) {
        const message = batch[i];
        const entryId = `msg-${batchIndex}-${i}`;
        
        try {
          const entry = await this._prepareBatchEntry(message, entryId);
          entries.push(entry);
          messageMap.set(entryId, message);
        } catch (error) {
          batchResult.failed++;
          batchResult.errors.push({
            messageId: entryId,
            error: error.message,
            timestamp: Date.now()
          });
        }
      }
      
      if (entries.length === 0) {
        return batchResult;
      }
      
      // Send batch to SQS
      const command = new SendMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries: entries
      });
      
      const result = await this.sqsClient.executeCommand(command);
      
      // Process results
      if (result.Successful) {
        result.Successful.forEach(success => {
          batchResult.successful++;
          batchResult.messages.push({
            messageId: success.MessageId,
            entryId: success.Id,
            md5OfBody: success.MD5OfBody
          });
        });
      }
      
      if (result.Failed) {
        result.Failed.forEach(failure => {
          batchResult.failed++;
          batchResult.errors.push({
            messageId: failure.Id,
            error: failure.Message,
            code: failure.Code,
            timestamp: Date.now()
          });
        });
      }
      
      return batchResult;
      
    } catch (error) {
      batchResult.failed = batch.length;
      batchResult.errors.push({
        type: 'batch_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      return batchResult;
    }
  };

  /**
   * Prepares a single batch entry
   * @private
   * @param {Object} message - Message object
   * @param {string} entryId - Entry ID
   * @returns {Promise<Object>} Batch entry
   */
  _prepareBatchEntry = async (message, entryId) => {
    const { body, options = {} } = message;
    
    // Validate message body
    if (!body || typeof body !== 'object') {
      throw new Error('Message body is required and must be an object');
    }
    
    // Generate deduplication ID if needed
    const messageDeduplicationId = this._generateDeduplicationId(body, options);
    
    // Check for duplicates if deduplication is enabled
    if (this.enableDeduplication && this.deduplicationManager.isDuplicate(messageDeduplicationId)) {
      throw new Error('Duplicate message detected');
    }
    
    // Build message attributes
    const messageAttributes = this._buildMessageAttributes(options.messageAttributes);
    
    // Create batch entry
    const entry = {
      Id: entryId,
      MessageBody: JSON.stringify(body),
      MessageAttributes: messageAttributes
    };
    
    // Add FIFO-specific parameters
    if (this._isFIFOQueue()) {
      entry.MessageGroupId = options.messageGroupId || this.messageGroupId;
      entry.MessageDeduplicationId = messageDeduplicationId;
    }
    
    // Add delay if specified
    if (options.delaySeconds && options.delaySeconds > 0) {
      entry.DelaySeconds = Math.min(options.delaySeconds, 900);
    }
    
    return entry;
  };

  /**
   * Generates a deduplication ID for a message
   * @private
   * @param {Object} messageBody - Message body
   * @param {Object} options - Message options
   * @returns {string} Deduplication ID
   */
  _generateDeduplicationId = (messageBody, options) => {
    if (options.messageDeduplicationId) {
      return options.messageDeduplicationId;
    }
    
    if (this._isFIFOQueue()) {
      return this.deduplicationManager.generateDeduplicationId(messageBody, options);
    }
    
    return uuidv4();
  };

  /**
   * Checks if the queue is a FIFO queue
   * @private
   * @returns {boolean} True if FIFO queue
   */
  _isFIFOQueue = () => this.queueUrl.endsWith('.fifo');

  /**
   * Builds message attributes for SQS message
   * @private
   * @param {Object} attributes - Raw message attributes
   * @returns {Object} Formatted message attributes
   */
  _buildMessageAttributes = (attributes = {}) => {
    const messageAttributes = {};
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === 'string') {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value
        };
      } else if (typeof value === 'number') {
        messageAttributes[key] = {
          DataType: 'Number',
          StringValue: value.toString()
        };
      } else if (typeof value === 'boolean') {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value.toString()
        };
      }
    });
    
    return messageAttributes;
  };

  /**
   * Gets the deduplication manager
   * @returns {DeduplicationManager} Deduplication manager instance
   */
  getDeduplicationManager = () => this.deduplicationManager;

  /**
   * Gets the queue URL
   * @returns {string} Queue URL
   */
  getQueueUrl = () => this.queueUrl;

  /**
   * Gets the batch publisher configuration
   * @returns {Object} Batch publisher configuration
   */
  getConfig = () => ({
    queueUrl: this.queueUrl,
    messageGroupId: this.messageGroupId,
    enableDeduplication: this.enableDeduplication,
    batchSize: this.batchSize,
    deduplicationStrategy: this.deduplicationManager.getConfig().strategy
  });
}

module.exports = BatchPublisher;
