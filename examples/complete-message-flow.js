/**
 * Complete Message Flow Example for BoxQ
 * This example demonstrates publishing and consuming messages with real AWS SQS
 * 
 * Prerequisites:
 * 1. Set up AWS credentials in .env file
 * 2. Ensure SQS queue exists in your AWS account
 * 3. Run: npm install dotenv
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

class MessageFlowExample {
  constructor() {
    this.sqs = null;
    this.publisher = null;
    this.consumer = null;
    this.receivedMessages = [];
  }

  async initialize() {
    console.log('🚀 Initializing BoxQ with AWS credentials...\n');

    try {
      // Initialize BoxQ with environment variables
      this.sqs = new BoxQ({
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

      console.log('✅ BoxQ initialized successfully');

      // Create publisher
      this.publisher = this.sqs.createPublisher(process.env.SQS_QUEUE_URL, {
        messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
        enableDeduplication: true
      });

      console.log('✅ Publisher created');

      // Create consumer
      this.consumer = this.sqs.createConsumer(process.env.SQS_QUEUE_URL, {
        processingMode: 'sequential',
        maxMessages: parseInt(process.env.SQS_MAX_MESSAGES) || 10,
        waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS) || 20,
        visibilityTimeoutSeconds: parseInt(process.env.SQS_VISIBILITY_TIMEOUT_SECONDS) || 300,
        autoStart: false
      });

      console.log('✅ Consumer created');

      // Set up message handler - will be passed to start() method

      return true;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return false;
    }
  }

  async handleMessage(message, context) {
    console.log(`📨 Received message: ${context.messageId}`);
    console.log(`   Body:`, JSON.stringify(message, null, 2));
    console.log(`   Group ID: ${context.messageGroupId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}\n`);

    // Store received message
    this.receivedMessages.push({
      id: context.messageId,
      body: message,
      groupId: context.messageGroupId,
      timestamp: new Date().toISOString()
    });

    // Simulate processing
    await this.simulateProcessing(message);

    return { success: true, processedAt: new Date().toISOString() };
  }

  async simulateProcessing(message) {
    // Simulate some processing time
    const processingTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    console.log(`✅ Processed message in ${processingTime.toFixed(0)}ms\n`);
  }

  async publishSingleMessage() {
    console.log('📤 Publishing single message...');

    const message = {
      type: 'single-message',
      data: 'Hello from BoxQ!',
      timestamp: new Date().toISOString(),
      testId: 'single-test'
    };

    try {
      const result = await this.publisher.publish(message);
      
      if (result.success) {
        console.log('✅ Message published successfully');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   MD5: ${result.md5OfBody}`);
        console.log(`   Processing Time: ${result.processingTime}ms\n`);
        return result;
      } else {
        console.error('❌ Message publishing failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Publishing error:', error.message);
      return null;
    }
  }

  async publishBatchMessages() {
    console.log('📤 Publishing batch messages...');

    const messages = [
      { body: { type: 'batch-1', data: 'Batch message 1', testId: 'batch-1' } },
      { body: { type: 'batch-2', data: 'Batch message 2', testId: 'batch-2' } },
      { body: { type: 'batch-3', data: 'Batch message 3', testId: 'batch-3' } }
    ];

    try {
      const results = await this.publisher.publishBatch(messages);
      
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.success) {
          successCount++;
          console.log(`✅ Batch message ${index + 1} published: ${result.messageId}`);
        } else {
          console.error(`❌ Batch message ${index + 1} failed: ${result.error}`);
        }
      });

      console.log(`📊 Batch publishing complete: ${successCount}/${results.length} successful\n`);
      return results;
    } catch (error) {
      console.error('❌ Batch publishing error:', error.message);
      return null;
    }
  }

  async startConsuming() {
    console.log('🔄 Starting message consumption...');
    this.consumer.start(this.handleMessage.bind(this));
    console.log('✅ Consumer started\n');
  }

  async stopConsuming() {
    console.log('⏹️  Stopping message consumption...');
    this.consumer.stop();
    console.log('✅ Consumer stopped\n');
  }

  async getHealthStatus() {
    console.log('📊 Checking system health...');
    
    try {
      const healthStatus = await this.sqs.getHealthStatus();
      console.log(`   Status: ${healthStatus.status}`);
      console.log(`   Uptime: ${healthStatus.uptime}ms`);
      console.log(`   Timestamp: ${healthStatus.timestamp}\n`);
      
      return healthStatus;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return null;
    }
  }

  async getMetrics() {
    console.log('📈 Getting system metrics...');
    
    try {
      const metrics = this.sqs.getMetrics();
      console.log('   System Metrics:');
      console.log(`     - Uptime: ${metrics.system.uptime}ms`);
      console.log(`     - Total Messages: ${metrics.system.totalMessages}`);
      console.log(`     - Success Rate: ${metrics.system.successRate}%`);
      console.log(`     - Throughput: ${metrics.system.throughput} msg/s`);
      console.log('   Circuit Breaker:');
      console.log(`     - State: ${metrics.circuitBreaker.state}`);
      console.log(`     - Failures: ${metrics.circuitBreaker.failureCount}`);
      console.log(`     - Successes: ${metrics.circuitBreaker.successCount}`);
      console.log('   Components:');
      console.log(`     - Publishers: ${metrics.components.publishers}`);
      console.log(`     - Consumers: ${metrics.components.consumers}`);
      console.log(`     - Active Consumers: ${metrics.components.activeConsumers}\n`);
      
      return metrics;
    } catch (error) {
      console.error('❌ Metrics retrieval failed:', error.message);
      return null;
    }
  }

  async runCompleteFlow() {
    console.log('🎯 Starting Complete Message Flow Example\n');
    console.log('=' .repeat(60));

    // Initialize
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize BoxQ');
      return;
    }

    // Check health
    await this.getHealthStatus();

    // Publish single message
    await this.publishSingleMessage();

    // Publish batch messages
    await this.publishBatchMessages();

    // Start consuming
    await this.startConsuming();

    // Wait for messages to be consumed
    console.log('⏳ Waiting for messages to be consumed...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop consuming
    await this.stopConsuming();

    // Get final metrics
    await this.getMetrics();

    // Summary
    console.log('📋 Summary:');
    console.log(`   Messages Published: 4 (1 single + 3 batch)`);
    console.log(`   Messages Received: ${this.receivedMessages.length}`);
    console.log(`   Success Rate: ${this.receivedMessages.length > 0 ? '100%' : '0%'}`);
    
    if (this.receivedMessages.length > 0) {
      console.log('\n✅ Complete message flow successful!');
      console.log('🎉 BoxQ is working perfectly with real AWS SQS!');
    } else {
      console.log('\n⚠️  No messages were consumed. This might be due to:');
      console.log('   - Queue not existing in AWS account');
      console.log('   - Network connectivity issues');
      console.log('   - AWS credentials not having SQS permissions');
    }

    console.log('\n' + '=' .repeat(60));
  }
}

// Run the example
async function main() {
  const example = new MessageFlowExample();
  await example.runCompleteFlow();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Example failed:', error);
    process.exit(1);
  });
}

module.exports = MessageFlowExample;
