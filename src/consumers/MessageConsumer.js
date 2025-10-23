/**
 * @fileoverview Message Consumer for Enterprise SQS
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const ProcessingEngine = require('./ProcessingEngine');
const { ProcessingMode } = require('../types');

/**
 * Message Consumer class for consuming messages from SQS queues
 * Provides intelligent processing with parallel/sequential modes
 */
class MessageConsumer {
  /**
   * Creates a new MessageConsumer instance
   * @param {Object} sqsClient - SQS client instance
   * @param {string} queueUrl - Queue URL
   * @param {Object} options - Consumer options
   * @param {string} [options.processingMode='sequential'] - Processing mode
   * @param {number} [options.batchSize=5] - Batch size for parallel processing
   * @param {number} [options.throttleDelayMs=0] - Throttle delay between batches
   * @param {number} [options.maxMessages=10] - Maximum messages to receive
   * @param {number} [options.waitTimeSeconds=20] - Long polling wait time
   * @param {number} [options.visibilityTimeoutSeconds=30] - Message visibility timeout
   * @param {boolean} [options.autoStart=true] - Whether to start consuming immediately
   * @param {number} [options.pollingInterval=1000] - Polling interval in milliseconds
   */
  constructor(sqsClient, queueUrl, options = {}) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.options = {
      processingMode: options.processingMode || ProcessingMode.SEQUENTIAL,
      batchSize: options.batchSize || 5,
      throttleDelayMs: options.throttleDelayMs || 0,
      maxMessages: options.maxMessages || 10,
      waitTimeSeconds: options.waitTimeSeconds || 20,
      visibilityTimeoutSeconds: options.visibilityTimeoutSeconds || 30,
      autoStart: options.autoStart !== false,
      pollingInterval: options.pollingInterval || 1000
    };
    
    this.processingEngine = new ProcessingEngine({
      mode: this.options.processingMode,
      batchSize: this.options.batchSize,
      throttleDelayMs: this.options.throttleDelayMs
    });
    
    this.isRunning = false;
    this.messageHandler = null;
    this.healthMonitor = null;
  }

  /**
   * Starts consuming messages from the queue
   * @param {Function} messageHandler - Message handler function
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  start = async (messageHandler, options = {}) => {
    if (!messageHandler || typeof messageHandler !== 'function') {
      throw new Error('Message handler is required and must be a function');
    }
    
    this.messageHandler = messageHandler;
    this.isRunning = true;
    
    // Merge options
    const finalOptions = { ...this.options, ...options };
    
    console.log('Starting message consumer', {
      queueUrl: this.queueUrl,
      processingMode: finalOptions.processingMode,
      batchSize: finalOptions.batchSize,
      maxMessages: finalOptions.maxMessages
    });
    
    // Start consuming loop
    this._consumeLoop(finalOptions);
  };

  /**
   * Stops consuming messages
   */
  stop = () => {
    this.isRunning = false;
    console.log('Message consumer stopped');
  };

  /**
   * Main consumption loop
   * @private
   * @param {Object} options - Consumer options
   */
  _consumeLoop = async (options) => {
    while (this.isRunning) {
      try {
        const messages = await this._receiveMessages(options);
        
        if (messages.length === 0) {
          // No messages available, wait before next poll
          await this._sleep(options.pollingInterval);
          continue;
        }
        
        // Process messages
        const results = await this.processingEngine.processMessages(
          messages,
          this.messageHandler,
          options
        );
        
        // Delete successfully processed messages
        await this._deleteProcessedMessages(messages, results);
        
        // Update health monitor if available
        if (this.healthMonitor) {
          this._updateHealthMonitor(results);
        }
        
        // Throttle between processing cycles
        if (options.throttleDelayMs > 0) {
          await this._sleep(options.throttleDelayMs);
        }
        
      } catch (error) {
        console.error('Error in consumption loop:', error.message);
        
        // Wait before retrying to avoid tight error loops
        await this._sleep(options.pollingInterval * 2);
      }
    }
  };

  /**
   * Receives messages from the queue
   * @private
   * @param {Object} options - Consumer options
   * @returns {Promise<Array>} Array of received messages
   */
  _receiveMessages = async (options) => {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: options.maxMessages,
      WaitTimeSeconds: options.waitTimeSeconds,
      VisibilityTimeoutSeconds: options.visibilityTimeoutSeconds,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All']
    });
    
    const result = await this.sqsClient.executeCommand(command);
    return result.Messages || [];
  };

  /**
   * Deletes successfully processed messages
   * @private
   * @param {Array} messages - Original messages
   * @param {Object} results - Processing results
   */
  _deleteProcessedMessages = async (messages, results) => {
    const deletePromises = messages
      .filter(message => {
        // Only delete messages that were successfully processed
        const messageResult = results.successful > 0;
        return messageResult;
      })
      .map(message => this._deleteMessage(message.ReceiptHandle));
    
    await Promise.allSettled(deletePromises);
  };

  /**
   * Deletes a single message
   * @private
   * @param {string} receiptHandle - Message receipt handle
   * @returns {Promise<void>}
   */
  _deleteMessage = async (receiptHandle) => {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      });
      
      await this.sqsClient.executeCommand(command);
    } catch (error) {
      console.error('Failed to delete message:', error.message);
    }
  };

  /**
   * Updates health monitor with processing results
   * @private
   * @param {Object} results - Processing results
   */
  _updateHealthMonitor = (results) => {
    if (results.successful > 0) {
      this.healthMonitor.recordSuccess(results.processingTime);
    }
    
    if (results.failed > 0) {
      results.errors.forEach(error => {
        this.healthMonitor.recordFailure(error.error);
      });
    }
  };

  /**
   * Sleeps for the specified number of milliseconds
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>} Promise that resolves after the delay
   */
  _sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Sets the health monitor
   * @param {Object} healthMonitor - Health monitor instance
   */
  setHealthMonitor = (healthMonitor) => {
    this.healthMonitor = healthMonitor;
  };

  /**
   * Gets the current processing mode
   * @returns {string} Current processing mode
   */
  getProcessingMode = () => this.processingEngine.getMode();

  /**
   * Sets the processing mode
   * @param {string} mode - Processing mode
   */
  setProcessingMode = (mode) => {
    this.processingEngine.setMode(mode);
    this.options.processingMode = mode;
  };

  /**
   * Gets processing statistics
   * @returns {Object} Processing statistics
   */
  getStats = () => this.processingEngine.getStats();

  /**
   * Resets processing statistics
   */
  resetStats = () => this.processingEngine.resetStats();

  /**
   * Gets the consumer configuration
   * @returns {Object} Consumer configuration
   */
  getConfig = () => ({
    queueUrl: this.queueUrl,
    ...this.options,
    processingEngine: this.processingEngine.getConfig()
  });

  /**
   * Updates the consumer configuration
   * @param {Object} config - New configuration
   */
  updateConfig = (config) => {
    if (config.processingMode) {
      this.setProcessingMode(config.processingMode);
    }
    
    if (config.batchSize) {
      this.options.batchSize = config.batchSize;
      this.processingEngine.updateConfig({ batchSize: config.batchSize });
    }
    
    if (config.throttleDelayMs !== undefined) {
      this.options.throttleDelayMs = config.throttleDelayMs;
      this.processingEngine.updateConfig({ throttleDelayMs: config.throttleDelayMs });
    }
    
    if (config.maxMessages) this.options.maxMessages = config.maxMessages;
    if (config.waitTimeSeconds) this.options.waitTimeSeconds = config.waitTimeSeconds;
    if (config.visibilityTimeoutSeconds) this.options.visibilityTimeoutSeconds = config.visibilityTimeoutSeconds;
    if (config.pollingInterval) this.options.pollingInterval = config.pollingInterval;
  };

  /**
   * Checks if the consumer is running
   * @returns {boolean} True if consumer is running
   */
  isConsumerRunning = () => this.isRunning;
}

module.exports = MessageConsumer;
