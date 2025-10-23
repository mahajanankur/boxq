/**
 * @fileoverview Processing Engine for Enterprise SQS
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { ProcessingMode } = require('../types');

/**
 * Processing Engine class for handling message processing strategies
 * Provides parallel and sequential processing modes with intelligent switching
 */
class ProcessingEngine {
  /**
   * Creates a new ProcessingEngine instance
   * @param {Object} config - Processing configuration
   * @param {string} [config.mode='sequential'] - Processing mode
   * @param {number} [config.batchSize=5] - Batch size for parallel processing
   * @param {number} [config.throttleDelayMs=0] - Throttle delay between batches
   * @param {number} [config.maxConcurrency=10] - Maximum concurrent operations
   */
  constructor(config = {}) {
    this.mode = config.mode || ProcessingMode.SEQUENTIAL;
    this.batchSize = config.batchSize || 5;
    this.throttleDelayMs = config.throttleDelayMs || 0;
    this.maxConcurrency = config.maxConcurrency || 10;
    this.isRunning = false;
    this.processingStats = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      lastProcessingTime: null
    };
  }

  /**
   * Processes messages using the configured strategy
   * @param {Array} messages - Array of messages to process
   * @param {Function} messageHandler - Message handler function
   * @param {Object} [options] - Processing options
   * @returns {Promise<Object>} Processing results
   */
  processMessages = async (messages, messageHandler, options = {}) => {
    const startTime = Date.now();
    const results = {
      total: messages.length,
      successful: 0,
      failed: 0,
      errors: [],
      processingTime: 0
    };

    try {
      if (this.mode === ProcessingMode.PARALLEL) {
        await this._processParallel(messages, messageHandler, results, options);
      } else {
        await this._processSequential(messages, messageHandler, results, options);
      }

      results.processingTime = Date.now() - startTime;
      this._updateStats(results);
      
      return results;

    } catch (error) {
      results.processingTime = Date.now() - startTime;
      results.errors.push({
        type: 'processing_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      return results;
    }
  };

  /**
   * Processes messages in parallel
   * @private
   * @param {Array} messages - Messages to process
   * @param {Function} messageHandler - Message handler function
   * @param {Object} results - Results object to update
   * @param {Object} options - Processing options
   */
  _processParallel = async (messages, messageHandler, results, options) => {
    const batchSize = options.batchSize || this.batchSize;
    const maxConcurrency = options.maxConcurrency || this.maxConcurrency;
    
    // Process messages in controlled batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      // Limit concurrency
      const concurrencyLimit = Math.min(batch.length, maxConcurrency);
      const batches = this._chunkArray(batch, concurrencyLimit);
      
      for (const batchChunk of batches) {
        const batchPromises = batchChunk.map(message =>
          this._processSingleMessage(message, messageHandler)
            .catch(error => ({
              success: false,
              error: error.message,
              messageId: message.MessageId
            }))
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const processedResult = result.value;
            if (processedResult.success) {
              results.successful++;
            } else {
              results.failed++;
              results.errors.push({
                messageId: processedResult.messageId,
                error: processedResult.error,
                timestamp: Date.now()
              });
            }
          } else {
            results.failed++;
            results.errors.push({
              messageId: batchChunk[index].MessageId,
              error: result.reason?.message || 'Unknown error',
              timestamp: Date.now()
            });
          }
        });
      }
      
      // Throttle between batches
      if (this.throttleDelayMs > 0 && i + batchSize < messages.length) {
        await this._sleep(this.throttleDelayMs);
      }
    }
  };

  /**
   * Processes messages sequentially
   * @private
   * @param {Array} messages - Messages to process
   * @param {Function} messageHandler - Message handler function
   * @param {Object} results - Results object to update
   * @param {Object} options - Processing options
   */
  _processSequential = async (messages, messageHandler, results, options) => {
    for (const message of messages) {
      try {
        await this._processSingleMessage(message, messageHandler);
        results.successful++;
        
        // Throttle between messages
        if (this.throttleDelayMs > 0) {
          await this._sleep(this.throttleDelayMs);
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          messageId: message.MessageId,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  };

  /**
   * Processes a single message
   * @private
   * @param {Object} message - Message to process
   * @param {Function} messageHandler - Message handler function
   * @returns {Promise<Object>} Processing result
   */
  _processSingleMessage = async (message, messageHandler) => {
    const startTime = Date.now();
    
    try {
      // Parse message body
      const messageBody = JSON.parse(message.Body);
      
      // Create message context
      const context = {
        messageId: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        messageAttributes: message.MessageAttributes || {},
        messageGroupId: message.Attributes?.MessageGroupId,
        messageDeduplicationId: message.Attributes?.MessageDeduplicationId
      };
      
      // Process message
      await messageHandler(messageBody, context);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        messageId: message.MessageId,
        processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        messageId: message.MessageId,
        error: error.message,
        processingTime
      };
    }
  };

  /**
   * Chunks an array into smaller arrays
   * @private
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  _chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  /**
   * Sleeps for the specified number of milliseconds
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>} Promise that resolves after the delay
   */
  _sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Updates processing statistics
   * @private
   * @param {Object} results - Processing results
   */
  _updateStats = (results) => {
    this.processingStats.totalProcessed += results.successful;
    this.processingStats.totalFailed += results.failed;
    this.processingStats.lastProcessingTime = results.processingTime;
    
    // Calculate average processing time
    const totalMessages = this.processingStats.totalProcessed + this.processingStats.totalFailed;
    if (totalMessages > 0) {
      this.processingStats.averageProcessingTime = 
        (this.processingStats.averageProcessingTime * (totalMessages - 1) + results.processingTime) / totalMessages;
    }
  };

  /**
   * Sets the processing mode
   * @param {string} mode - Processing mode
   */
  setMode = (mode) => {
    this.mode = mode;
  };

  /**
   * Gets the current processing mode
   * @returns {string} Current processing mode
   */
  getMode = () => this.mode;

  /**
   * Gets processing statistics
   * @returns {Object} Processing statistics
   */
  getStats = () => ({
    ...this.processingStats,
    mode: this.mode,
    batchSize: this.batchSize,
    throttleDelayMs: this.throttleDelayMs
  });

  /**
   * Resets processing statistics
   */
  resetStats = () => {
    this.processingStats = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      lastProcessingTime: null
    };
  };

  /**
   * Gets the processing configuration
   * @returns {Object} Processing configuration
   */
  getConfig = () => ({
    mode: this.mode,
    batchSize: this.batchSize,
    throttleDelayMs: this.throttleDelayMs,
    maxConcurrency: this.maxConcurrency
  });

  /**
   * Updates the processing configuration
   * @param {Object} config - New configuration
   */
  updateConfig = (config) => {
    if (config.mode) this.mode = config.mode;
    if (config.batchSize) this.batchSize = config.batchSize;
    if (config.throttleDelayMs !== undefined) this.throttleDelayMs = config.throttleDelayMs;
    if (config.maxConcurrency) this.maxConcurrency = config.maxConcurrency;
  };
}

module.exports = ProcessingEngine;
