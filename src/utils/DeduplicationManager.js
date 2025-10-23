/**
 * @fileoverview Deduplication Manager for Enterprise SQS
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const crypto = require('crypto');

/**
 * Deduplication Manager class for handling message deduplication
 * Provides content-based deduplication strategies for FIFO queues
 */
class DeduplicationManager {
  /**
   * Creates a new DeduplicationManager instance
   * @param {Object} config - Deduplication configuration
   * @param {string} [config.strategy='content'] - Deduplication strategy
   * @param {string} [config.hashAlgorithm='sha256'] - Hash algorithm for content hashing
   * @param {number} [config.hashLength=32] - Length of hash to use
   */
  constructor(config = {}) {
    this.strategy = config.strategy || 'content';
    this.hashAlgorithm = config.hashAlgorithm || 'sha256';
    this.hashLength = config.hashLength || 32;
    this.deduplicationCache = new Map();
    this.cacheExpiry = 300000; // 5 minutes
  }

  /**
   * Generates a deduplication ID for a message
   * @param {Object} messageBody - Message body
   * @param {Object} options - Message options
   * @param {string} [options.messageGroupId] - Message group ID
   * @param {string} [options.customId] - Custom ID for deduplication
   * @returns {string} Deduplication ID
   */
  generateDeduplicationId = (messageBody, options = {}) => {
    if (options.customId) {
      return this._hashString(options.customId);
    }

    if (this.strategy === 'content') {
      return this._generateContentBasedId(messageBody, options);
    }

    if (this.strategy === 'timestamp') {
      return this._generateTimestampBasedId();
    }

    if (this.strategy === 'hybrid') {
      return this._generateHybridId(messageBody, options);
    }

    // Default to content-based
    return this._generateContentBasedId(messageBody, options);
  };

  /**
   * Generates content-based deduplication ID
   * @private
   * @param {Object} messageBody - Message body
   * @param {Object} options - Message options
   * @returns {string} Content-based deduplication ID
   */
  _generateContentBasedId = (messageBody, options) => {
    const contentForHash = {
      body: messageBody,
      groupId: options.messageGroupId,
      timestamp: Date.now()
    };
    
    return this._hashObject(contentForHash);
  };

  /**
   * Generates timestamp-based deduplication ID
   * @private
   * @returns {string} Timestamp-based deduplication ID
   */
  _generateTimestampBasedId = () => {
    const timestamp = Date.now();
    return this._hashString(timestamp.toString());
  };

  /**
   * Generates hybrid deduplication ID
   * @private
   * @param {Object} messageBody - Message body
   * @param {Object} options - Message options
   * @returns {string} Hybrid deduplication ID
   */
  _generateHybridId = (messageBody, options) => {
    const contentHash = this._hashObject(messageBody);
    const timestamp = Date.now();
    const groupId = options.messageGroupId || 'default';
    
    return this._hashString(`${contentHash}-${timestamp}-${groupId}`);
  };

  /**
   * Hashes an object to create a deduplication ID
   * @private
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  _hashObject = (obj) => {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return this._hashString(str);
  };

  /**
   * Hashes a string using the configured algorithm
   * @private
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  _hashString = (str) => {
    const hash = crypto.createHash(this.hashAlgorithm);
    hash.update(str);
    return hash.digest('hex').substring(0, this.hashLength);
  };

  /**
   * Checks if a message is a duplicate
   * @param {string} deduplicationId - Deduplication ID to check
   * @returns {boolean} True if message is a duplicate
   */
  isDuplicate = (deduplicationId) => {
    const now = Date.now();
    
    // Clean expired entries
    for (const [id, timestamp] of this.deduplicationCache) {
      if (now - timestamp > this.cacheExpiry) {
        this.deduplicationCache.delete(id);
      }
    }
    
    if (this.deduplicationCache.has(deduplicationId)) {
      return true;
    }
    
    this.deduplicationCache.set(deduplicationId, now);
    return false;
  };

  /**
   * Clears the deduplication cache
   */
  clearCache = () => {
    this.deduplicationCache.clear();
  };

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats = () => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [id, timestamp] of this.deduplicationCache) {
      if (now - timestamp > this.cacheExpiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.deduplicationCache.size,
      validEntries,
      expiredEntries,
      cacheExpiry: this.cacheExpiry
    };
  };

  /**
   * Updates the deduplication configuration
   * @param {Object} config - New configuration
   */
  updateConfig = (config) => {
    if (config.strategy) this.strategy = config.strategy;
    if (config.hashAlgorithm) this.hashAlgorithm = config.hashAlgorithm;
    if (config.hashLength) this.hashLength = config.hashLength;
    if (config.cacheExpiry) this.cacheExpiry = config.cacheExpiry;
  };

  /**
   * Gets the current configuration
   * @returns {Object} Current configuration
   */
  getConfig = () => ({
    strategy: this.strategy,
    hashAlgorithm: this.hashAlgorithm,
    hashLength: this.hashLength,
    cacheExpiry: this.cacheExpiry
  });
}

module.exports = DeduplicationManager;
