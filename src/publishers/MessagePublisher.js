/**
 * @fileoverview Message Publisher for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');
const DeduplicationManager = require('../utils/DeduplicationManager');

/**
 * Message Publisher class for publishing messages to SQS queues
 * Provides FIFO support, deduplication, and advanced publishing features
 */
class MessagePublisher {
  /**
   * Creates a new MessagePublisher instance
   * @param {Object} sqsClient - SQS client instance
   * @param {string} queueUrl - Queue URL
   * @param {Object} options - Publisher options
   * @param {string} [options.messageGroupId] - Default message group ID
   * @param {boolean} [options.enableDeduplication=true] - Enable content-based deduplication
   * @param {string} [options.deduplicationStrategy='content'] - Deduplication strategy
   */
  constructor(sqsClient, queueUrl, options = {}) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.messageGroupId = options.messageGroupId;
    this.enableDeduplication = options.enableDeduplication !== false;
    this.deduplicationManager = new DeduplicationManager({
      strategy: options.deduplicationStrategy || 'content'
    });
  }

  /**
   * Publishes a single message to the queue
   * @param {Object} messageBody - Message body
   * @param {Object} options - Message options
   * @param {string} [options.messageGroupId] - Message group ID for FIFO queues
   * @param {string} [options.messageDeduplicationId] - Custom deduplication ID
   * @param {number} [options.delaySeconds] - Delay in seconds before message becomes available
   * @param {Object} [options.messageAttributes] - Additional message attributes
   * @returns {Promise<Object>} Publishing result
   */
  publish = async (messageBody, options = {}) => {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      this._validateMessageBody(messageBody);
      this._validateOptions(options);
      
      // Generate deduplication ID if needed
      const messageDeduplicationId = this._generateDeduplicationId(messageBody, options);
      
      // Check for duplicates if deduplication is enabled
      if (this.enableDeduplication && this.deduplicationManager.isDuplicate(messageDeduplicationId)) {
        throw new Error('Duplicate message detected');
      }
      
      // Prepare message attributes
      const messageAttributes = this._buildMessageAttributes(options.messageAttributes);
      
      // Build command parameters
      const commandParams = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: messageAttributes
      };
      
      // Add FIFO-specific parameters
      if (this._isFIFOQueue()) {
        commandParams.MessageGroupId = options.messageGroupId || this.messageGroupId;
        commandParams.MessageDeduplicationId = messageDeduplicationId;
      }
      
      // Add delay if specified
      if (options.delaySeconds && options.delaySeconds > 0) {
        commandParams.DelaySeconds = Math.min(options.delaySeconds, 900); // Max 15 minutes
      }
      
      // Send message
      const command = new SendMessageCommand(commandParams);
      const result = await this.sqsClient.executeCommand(command);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        messageId: result.MessageId,
        md5OfBody: result.MD5OfBody,
        messageDeduplicationId,
        messageGroupId: commandParams.MessageGroupId,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Re-throw validation errors
      if (error.message.includes('Message body is required') || 
          error.message.includes('Message group ID must be') ||
          error.message.includes('Delay seconds must be')) {
        throw error;
      }
      
      return {
        success: false,
        error: error.message,
        processingTime
      };
    }
  };

  /**
   * Publishes multiple messages in batch
   * @param {Array} messages - Array of message objects
   * @param {Object} [options] - Batch options
   * @param {number} [options.batchSize=10] - Batch size for processing
   * @returns {Promise<Array>} Array of publishing results
   */
  publishBatch = async (messages, options = {}) => {
    const batchSize = options.batchSize || 10;
    const results = [];
    
    // Process messages in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(message => 
        this.publish(message.body, message.options || {})
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
            processingTime: 0
          });
        }
      });
    }
    
    return results;
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
   * Validates message body
   * @private
   * @param {Object} messageBody - Message body to validate
   * @throws {Error} If validation fails
   */
  _validateMessageBody = (messageBody) => {
    if (!messageBody || typeof messageBody !== 'object') {
      throw new Error('Message body is required and must be an object');
    }
  };

  /**
   * Validates message options
   * @private
   * @param {Object} options - Options to validate
   * @throws {Error} If validation fails
   */
  _validateOptions = (options) => {
    if (options.messageGroupId && typeof options.messageGroupId !== 'string') {
      throw new Error('Message group ID must be a string');
    }
    
    if (options.delaySeconds && (typeof options.delaySeconds !== 'number' || options.delaySeconds < 0)) {
      throw new Error('Delay seconds must be a non-negative number');
    }
  };

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
   * Gets the publisher configuration
   * @returns {Object} Publisher configuration
   */
  getConfig = () => ({
    queueUrl: this.queueUrl,
    messageGroupId: this.messageGroupId,
    enableDeduplication: this.enableDeduplication,
    deduplicationStrategy: this.deduplicationManager.getConfig().strategy
  });
}

module.exports = MessagePublisher;
