#!/usr/bin/env node

/**
 * BoxQ End-to-End Test Script
 * Tests complete message publishing and consumption flow using real AWS SQS
 * 
 * Usage: node test-end-to-end.js
 * 
 * Make sure to set up your .env file with AWS credentials and SQS configuration
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

// Test configuration
const TEST_CONFIG = {
  // Test message data
  testMessages: [
    {
      type: 'user-registration',
      userId: 'user-123',
      email: 'test@example.com',
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'web-app',
        version: '1.0.0'
      }
    },
    {
      type: 'order-created',
      orderId: 'order-456',
      customerId: 'customer-789',
      amount: 99.99,
      currency: 'USD',
      items: [
        { id: 'item-1', name: 'Product A', quantity: 2, price: 49.99 }
      ],
      timestamp: new Date().toISOString()
    },
    {
      type: 'payment-processed',
      paymentId: 'payment-789',
      orderId: 'order-456',
      amount: 99.99,
      status: 'completed',
      method: 'credit-card',
      timestamp: new Date().toISOString()
    }
  ],
  
  // Test settings
  maxWaitTime: 30000, // 30 seconds
  messageProcessingDelay: 2000, // 2 seconds between messages
  consumerTimeout: 15000 // 15 seconds for consumer to process
};

class EndToEndTester {
  constructor() {
    this.boxq = null;
    this.publisher = null;
    this.consumer = null;
    this.receivedMessages = [];
    this.testResults = {
      published: 0,
      consumed: 0,
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Initialize BoxQ with environment variables
   */
  async initialize() {
    console.log('🚀 Initializing BoxQ End-to-End Test...\n');

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
    this.publisher = this.boxq.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      enableDeduplication: true
    });

    // Create consumer
    this.consumer = this.boxq.createConsumer(process.env.SQS_QUEUE_URL, {
      processingMode: 'sequential',
      batchSize: 1,
      maxMessages: 10,
      visibilityTimeoutSeconds: 30,
      waitTimeSeconds: 5
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
   * Test health status
   */
  async testHealthStatus() {
    console.log('🏥 Testing Health Status...');
    
    try {
      const healthStatus = await this.boxq.getHealthStatus();
      console.log(`   Status: ${healthStatus.status}`);
      console.log(`   Uptime: ${healthStatus.uptime}ms`);
      console.log(`   Timestamp: ${new Date(healthStatus.timestamp).toISOString()}`);
      
      if (healthStatus.status !== 'healthy') {
        throw new Error(`Health status is ${healthStatus.status}, expected healthy`);
      }
      
      console.log('✅ Health status test passed\n');
    } catch (error) {
      console.error('❌ Health status test failed:', error.message);
      this.testResults.errors.push(`Health test: ${error.message}`);
    }
  }

  /**
   * Test system metrics
   */
  async testSystemMetrics() {
    console.log('📈 Testing System Metrics...');
    
    try {
      const metrics = this.boxq.getMetrics();
      console.log(`   Publishers: ${metrics.components.publishers}`);
      console.log(`   Consumers: ${metrics.components.consumers}`);
      console.log(`   Active Consumers: ${metrics.components.activeConsumers}`);
      console.log(`   Circuit Breaker State: ${metrics.circuitBreaker.state}`);
      console.log(`   System Uptime: ${metrics.system.uptime}ms`);
      console.log(`   Total Messages: ${metrics.system.totalMessages}`);
      
      console.log('✅ System metrics test passed\n');
    } catch (error) {
      console.error('❌ System metrics test failed:', error.message);
      this.testResults.errors.push(`Metrics test: ${error.message}`);
    }
  }

  /**
   * Test message publishing
   */
  async testPublishing() {
    console.log('📤 Testing Message Publishing...');
    this.testResults.startTime = Date.now();

    for (let i = 0; i < TEST_CONFIG.testMessages.length; i++) {
      const message = TEST_CONFIG.testMessages[i];
      
      try {
        console.log(`   Publishing message ${i + 1}/${TEST_CONFIG.testMessages.length}: ${message.type}`);
        
        const result = await this.publisher.publish(message);
        
        if (result.success) {
          console.log(`   ✅ Published: ${result.messageId} (${result.processingTime}ms)`);
          this.testResults.published++;
        } else {
          throw new Error(`Publish failed: ${result.error}`);
        }
        
        // Small delay between messages
        if (i < TEST_CONFIG.testMessages.length - 1) {
          await this.sleep(TEST_CONFIG.messageProcessingDelay);
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to publish message ${i + 1}:`, error.message);
        this.testResults.errors.push(`Publish ${i + 1}: ${error.message}`);
      }
    }

    console.log(`\n📊 Publishing Summary: ${this.testResults.published}/${TEST_CONFIG.testMessages.length} messages published\n`);
  }

  /**
   * Test message consumption
   */
  async testConsumption() {
    console.log('📥 Testing Message Consumption...');
    
    // Set up message handler
    const messageHandler = async (message, context) => {
      console.log(`   📨 Consumed: ${context.messageId} (${message.type})`);
      
      this.receivedMessages.push({
        messageId: context.messageId,
        body: message,
        receivedAt: new Date().toISOString()
      });
      
      this.testResults.consumed++;
      
      // Simulate some processing time
      await this.sleep(500);
      
      return { success: true };
    };

    try {
      // Start consumer
      console.log('   🎯 Starting consumer...');
      this.consumer.start(messageHandler);
      
      // Wait for messages to be consumed
      console.log(`   ⏳ Waiting up to ${TEST_CONFIG.consumerTimeout / 1000}s for messages...`);
      
      const startWait = Date.now();
      while (this.testResults.consumed < this.testResults.published && 
             (Date.now() - startWait) < TEST_CONFIG.consumerTimeout) {
        await this.sleep(1000);
        process.stdout.write('.');
      }
      
      console.log('\n');
      
      // Stop consumer
      this.consumer.stop();
      console.log('   🛑 Consumer stopped');
      
      console.log(`\n📊 Consumption Summary: ${this.testResults.consumed}/${this.testResults.published} messages consumed\n`);
      
    } catch (error) {
      console.error('❌ Consumption test failed:', error.message);
      this.testResults.errors.push(`Consumption test: ${error.message}`);
    }
  }

  /**
   * Verify consumed messages
   */
  async verifyConsumedMessages() {
    console.log('🔍 Verifying Consumed Messages...');
    
    try {
      if (this.receivedMessages.length === 0) {
        throw new Error('No messages were consumed');
      }

      // Check if we received the expected message types
      const receivedTypes = this.receivedMessages.map(msg => msg.body.type);
      const expectedTypes = TEST_CONFIG.testMessages.map(msg => msg.type);
      
      console.log(`   Expected types: ${expectedTypes.join(', ')}`);
      console.log(`   Received types: ${receivedTypes.join(', ')}`);
      
      // Verify each expected message type was received
      for (const expectedType of expectedTypes) {
        if (!receivedTypes.includes(expectedType)) {
          throw new Error(`Missing message type: ${expectedType}`);
        }
      }
      
      console.log('✅ All expected message types were consumed');
      
      // Display detailed message info
      console.log('\n📋 Consumed Message Details:');
      this.receivedMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ID: ${msg.messageId}`);
        console.log(`      Type: ${msg.body.type}`);
        console.log(`      Received: ${msg.receivedAt}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Message verification failed:', error.message);
      this.testResults.errors.push(`Verification: ${error.message}`);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    this.testResults.endTime = Date.now();
    const duration = this.testResults.endTime - this.testResults.startTime;
    
    console.log('📊 END-TO-END TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📤 Messages Published: ${this.testResults.published}`);
    console.log(`📥 Messages Consumed: ${this.testResults.consumed}`);
    console.log(`❌ Errors: ${this.testResults.errors.length}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    const success = this.testResults.errors.length === 0 && 
                   this.testResults.published === TEST_CONFIG.testMessages.length &&
                   this.testResults.consumed === this.testResults.published;
    
    console.log(`\n${success ? '✅' : '❌'} Overall Result: ${success ? 'PASSED' : 'FAILED'}`);
    
    if (success) {
      console.log('\n🎉 BoxQ End-to-End Test PASSED!');
      console.log('   The library is working correctly with real AWS SQS.');
    } else {
      console.log('\n💥 BoxQ End-to-End Test FAILED!');
      console.log('   Please check the errors above and fix the issues.');
    }
    
    return success;
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the complete end-to-end test
   */
  async run() {
    try {
      console.log('🧪 BoxQ End-to-End Test Suite');
      console.log('=' .repeat(40));
      console.log('');
      
      await this.initialize();
      await this.testHealthStatus();
      await this.testSystemMetrics();
      await this.testPublishing();
      await this.testConsumption();
      await this.verifyConsumedMessages();
      
      const success = this.generateReport();
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('💥 Test suite failed with error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new EndToEndTester();
  tester.run();
}

module.exports = EndToEndTester;
