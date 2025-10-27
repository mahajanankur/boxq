#!/usr/bin/env node

/**
 * BoxQ Long Polling Test Script
 * Demonstrates and tests long polling functionality with SQS
 * 
 * Usage: node test-long-polling.js
 * 
 * This test shows:
 * 1. How long polling works with different wait times
 * 2. Efficiency comparison between short and long polling
 * 3. Real-time message consumption with minimal API calls
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

class LongPollingTester {
  constructor() {
    this.boxq = null;
    this.publisher = null;
    this.consumer = null;
    this.receivedMessages = [];
    this.apiCallCount = 0;
    this.startTime = null;
  }

  /**
   * Initialize BoxQ with environment variables
   */
  async initialize() {
    console.log('🚀 Initializing BoxQ Long Polling Test...\n');

    // Validate environment variables
    this.validateEnvironment();

    // Initialize BoxQ
    this.boxq = new BoxQ({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      circuitBreaker: {
        failureThreshold: 5,
        timeout: 60000
      },
      retry: {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxBackoffMs: 30000
      }
    });

    // Create publisher
    this.publisher = this.boxq.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      enableDeduplication: true
    });

    console.log('✅ BoxQ initialized successfully');
    console.log(`📊 Queue URL: ${process.env.SQS_QUEUE_URL}`);
    console.log(`🏷️  Message Group ID: ${process.env.SQS_MESSAGE_GROUP_ID}\n`);
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'SQS_QUEUE_URL',
      'SQS_MESSAGE_GROUP_ID'
    ];

    const missing = required.filter(key => !process.env[key] || process.env[key] === `your-${key.toLowerCase().replace('_', '-')}-here`);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\nPlease set up your .env file with valid AWS credentials and SQS configuration.');
      process.exit(1);
    }
  }

  /**
   * Test short polling (no wait time)
   */
  async testShortPolling() {
    console.log('⚡ Testing Short Polling (No Wait Time)...');
    console.log('   This will make frequent API calls to SQS\n');

    this.consumer = this.boxq.createConsumer(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      processingMode: 'sequential',
      batchSize: 1,
      maxMessages: 1,
      waitTimeSeconds: 0, // No long polling
      visibilityTimeoutSeconds: 30,
      pollingInterval: 1000 // Poll every second
    });

    this.apiCallCount = 0;
    this.receivedMessages = [];
    this.startTime = Date.now();

    // Override the _receiveMessages method to count API calls
    const originalReceiveMessages = this.consumer._receiveMessages;
    this.consumer._receiveMessages = async (options) => {
      this.apiCallCount++;
      return await originalReceiveMessages.call(this.consumer, options);
    };

    const messageHandler = async (message, context) => {
      this.receivedMessages.push({
        messageId: context.messageId,
        body: message,
        receivedAt: new Date().toISOString(),
        pollingType: 'short'
      });
      console.log(`   📨 Short polling received: ${context.messageId} (API call #${this.apiCallCount})`);
      return { success: true };
    };

    // Start consumer
    this.consumer.start(messageHandler);

    // Publish a test message after 3 seconds
    setTimeout(async () => {
      try {
        const testMessage = {
          type: 'short-polling-test',
          data: 'Message for short polling test',
          timestamp: new Date().toISOString()
        };
        
        console.log('   📤 Publishing test message for short polling...');
        await this.publisher.publish(testMessage);
      } catch (error) {
        console.error('   ❌ Failed to publish message:', error.message);
      }
    }, 3000);

    // Wait for message to be received
    await this.waitForMessage(10000);

    // Stop consumer
    this.consumer.stop();

    const duration = Date.now() - this.startTime;
    console.log(`\n📊 Short Polling Results:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   API Calls: ${this.apiCallCount}`);
    console.log(`   Messages Received: ${this.receivedMessages.length}`);
    console.log(`   API Calls per Message: ${this.apiCallCount / Math.max(this.receivedMessages.length, 1)}\n`);
  }

  /**
   * Test long polling (with wait time)
   */
  async testLongPolling() {
    console.log('⏳ Testing Long Polling (20 Second Wait Time)...');
    console.log('   This will make fewer API calls by waiting for messages\n');

    this.consumer = this.boxq.createConsumer(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      processingMode: 'sequential',
      batchSize: 1,
      maxMessages: 1,
      waitTimeSeconds: 20, // Long polling - wait up to 20 seconds
      visibilityTimeoutSeconds: 30,
      pollingInterval: 1000 // Poll every second (but with long polling)
    });

    this.apiCallCount = 0;
    this.receivedMessages = [];
    this.startTime = Date.now();

    // Override the _receiveMessages method to count API calls
    const originalReceiveMessages = this.consumer._receiveMessages;
    this.consumer._receiveMessages = async (options) => {
      this.apiCallCount++;
      console.log(`   🔍 Long polling API call #${this.apiCallCount} (waiting up to ${options.waitTimeSeconds}s)...`);
      return await originalReceiveMessages.call(this.consumer, options);
    };

    const messageHandler = async (message, context) => {
      this.receivedMessages.push({
        messageId: context.messageId,
        body: message,
        receivedAt: new Date().toISOString(),
        pollingType: 'long'
      });
      console.log(`   📨 Long polling received: ${context.messageId} (API call #${this.apiCallCount})`);
      return { success: true };
    };

    // Start consumer
    this.consumer.start(messageHandler);

    // Publish a test message after 5 seconds
    setTimeout(async () => {
      try {
        const testMessage = {
          type: 'long-polling-test',
          data: 'Message for long polling test',
          timestamp: new Date().toISOString()
        };
        
        console.log('   📤 Publishing test message for long polling...');
        await this.publisher.publish(testMessage);
      } catch (error) {
        console.error('   ❌ Failed to publish message:', error.message);
      }
    }, 5000);

    // Wait for message to be received
    await this.waitForMessage(25000);

    // Stop consumer
    this.consumer.stop();

    const duration = Date.now() - this.startTime;
    console.log(`\n📊 Long Polling Results:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   API Calls: ${this.apiCallCount}`);
    console.log(`   Messages Received: ${this.receivedMessages.length}`);
    console.log(`   API Calls per Message: ${this.apiCallCount / Math.max(this.receivedMessages.length, 1)}\n`);
  }

  /**
   * Test burst message handling with long polling
   */
  async testBurstHandling() {
    console.log('💥 Testing Burst Message Handling with Long Polling...');
    console.log('   Publishing multiple messages quickly to test batch processing\n');

    this.consumer = this.boxq.createConsumer(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      processingMode: 'sequential',
      batchSize: 3, // Process up to 3 messages at once
      maxMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeoutSeconds: 30,
      pollingInterval: 1000
    });

    this.apiCallCount = 0;
    this.receivedMessages = [];
    this.startTime = Date.now();

    // Override the _receiveMessages method to count API calls
    const originalReceiveMessages = this.consumer._receiveMessages;
    this.consumer._receiveMessages = async (options) => {
      this.apiCallCount++;
      return await originalReceiveMessages.call(this.consumer, options);
    };

    const messageHandler = async (message, context) => {
      this.receivedMessages.push({
        messageId: context.messageId,
        body: message,
        receivedAt: new Date().toISOString(),
        pollingType: 'burst'
      });
      console.log(`   📨 Burst handling received: ${context.messageId} (${message.type})`);
      return { success: true };
    };

    // Start consumer
    this.consumer.start(messageHandler);

    // Publish multiple messages in quick succession
    setTimeout(async () => {
      try {
        const messages = [
          { type: 'burst-test-1', data: 'Burst message 1', timestamp: new Date().toISOString() },
          { type: 'burst-test-2', data: 'Burst message 2', timestamp: new Date().toISOString() },
          { type: 'burst-test-3', data: 'Burst message 3', timestamp: new Date().toISOString() },
          { type: 'burst-test-4', data: 'Burst message 4', timestamp: new Date().toISOString() },
          { type: 'burst-test-5', data: 'Burst message 5', timestamp: new Date().toISOString() }
        ];
        
        console.log('   📤 Publishing 5 messages in quick succession...');
        for (const message of messages) {
          await this.publisher.publish(message);
          await this.sleep(100); // Small delay between publishes
        }
      } catch (error) {
        console.error('   ❌ Failed to publish messages:', error.message);
      }
    }, 3000);

    // Wait for all messages to be received
    await this.waitForMessages(5, 25000);

    // Stop consumer
    this.consumer.stop();

    const duration = Date.now() - this.startTime;
    console.log(`\n📊 Burst Handling Results:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   API Calls: ${this.apiCallCount}`);
    console.log(`   Messages Received: ${this.receivedMessages.length}`);
    console.log(`   API Calls per Message: ${this.apiCallCount / Math.max(this.receivedMessages.length, 1)}\n`);
  }

  /**
   * Wait for a single message to be received
   */
  async waitForMessage(timeout = 10000) {
    const startTime = Date.now();
    while (this.receivedMessages.length === 0 && (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }
  }

  /**
   * Wait for multiple messages to be received
   */
  async waitForMessages(expectedCount, timeout = 10000) {
    const startTime = Date.now();
    while (this.receivedMessages.length < expectedCount && (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('📊 LONG POLLING TEST REPORT');
    console.log('=' .repeat(50));
    
    const shortPolling = this.receivedMessages.filter(msg => msg.pollingType === 'short');
    const longPolling = this.receivedMessages.filter(msg => msg.pollingType === 'long');
    const burstHandling = this.receivedMessages.filter(msg => msg.pollingType === 'burst');
    
    console.log('\n⚡ Short Polling:');
    console.log(`   Messages: ${shortPolling.length}`);
    console.log(`   API Efficiency: ${shortPolling.length > 0 ? 'Low (frequent API calls)' : 'N/A'}`);
    
    console.log('\n⏳ Long Polling:');
    console.log(`   Messages: ${longPolling.length}`);
    console.log(`   API Efficiency: ${longPolling.length > 0 ? 'High (fewer API calls)' : 'N/A'}`);
    
    console.log('\n💥 Burst Handling:');
    console.log(`   Messages: ${burstHandling.length}`);
    console.log(`   Batch Processing: ${burstHandling.length > 0 ? 'Efficient' : 'N/A'}`);
    
    console.log('\n🎯 Key Benefits of Long Polling:');
    console.log('   ✅ Reduces API calls by up to 90%');
    console.log('   ✅ Lower costs (fewer SQS API requests)');
    console.log('   ✅ Better performance (less network overhead)');
    console.log('   ✅ Real-time message delivery');
    console.log('   ✅ Automatic scaling with message volume');
    
    console.log('\n📋 Best Practices:');
    console.log('   • Use waitTimeSeconds: 20 for maximum efficiency');
    console.log('   • Set appropriate batchSize for your workload');
    console.log('   • Monitor API call counts in production');
    console.log('   • Adjust pollingInterval based on message frequency');
    
    console.log('\n🎉 Long Polling Test Complete!');
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the complete long polling test suite
   */
  async run() {
    try {
      console.log('🧪 BoxQ Long Polling Test Suite');
      console.log('=' .repeat(40));
      console.log('');
      
      await this.initialize();
      
      // Run tests sequentially
      await this.testShortPolling();
      await this.sleep(2000); // Brief pause between tests
      
      await this.testLongPolling();
      await this.sleep(2000); // Brief pause between tests
      
      await this.testBurstHandling();
      
      this.generateReport();
      
    } catch (error) {
      console.error('💥 Long polling test failed with error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new LongPollingTester();
  tester.run();
}

module.exports = LongPollingTester;
