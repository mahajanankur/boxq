/**
 * @fileoverview Basic usage example for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

/**
 * Basic usage example demonstrating core features
 */
const basicUsageExample = async () => {
  console.log('🚀 BoxQ - Basic Usage Example');
  
  // Check for required environment variables
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SQS_QUEUE_URL) {
    console.error('❌ Missing required environment variables:');
    console.error('   Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and SQS_QUEUE_URL in your .env file');
    return;
  }

  // Create SQS instance
  const sqs = new BoxQ({
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
      backoffMultiplier: 2
    }
  });

  try {
    // Create publisher
    const publisher = sqs.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID || 'example-group',
      enableDeduplication: true
    });

    // Publish a message
    console.log('📤 Publishing message...');
    const publishResult = await publisher.publish({
      type: 'user-registration',
      userId: 12345,
      timestamp: new Date().toISOString(),
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        source: 'web-app'
      }
    });

    if (publishResult.success) {
      console.log('✅ Message published successfully:', publishResult.messageId);
    } else {
      console.error('❌ Failed to publish message:', publishResult.error);
    }

    // Create consumer
    const consumer = sqs.createConsumer(process.env.SQS_QUEUE_URL, {
      processingMode: 'sequential',
      batchSize: 1,
      maxMessages: 1
    });

    // Start consuming
    console.log('📥 Starting consumer...');
    consumer.start(async (message, context) => {
      console.log('📨 Processing message:', message);
      console.log('🆔 Message ID:', context.messageId);
      console.log('👥 Group ID:', context.messageGroupId);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Message processed successfully');
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get health status
    console.log('🏥 Getting health status...');
    const health = await sqs.getHealthStatus();
    console.log('Health Status:', health.status);
    console.log('Uptime:', health.uptime, 'ms');

    // Get metrics
    console.log('📊 Getting metrics...');
    const metrics = sqs.getMetrics();
    console.log('Messages processed:', metrics.system.totalMessages);
    console.log('Success rate:', metrics.system.successRate + '%');
    console.log('Circuit breaker state:', metrics.circuitBreaker.state);

    // Stop consumer
    consumer.stop();
    console.log('🛑 Consumer stopped');

  } catch (error) {
    console.error('❌ Error in basic usage example:', error.message);
  }
};

// Run example if called directly
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

module.exports = basicUsageExample;
