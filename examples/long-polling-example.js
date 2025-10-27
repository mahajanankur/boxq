#!/usr/bin/env node

/**
 * BoxQ Long Polling Example
 * Demonstrates how to use long polling for efficient message consumption
 * 
 * Usage: node examples/long-polling-example.js
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

async function longPollingExample() {
  console.log('🚀 BoxQ Long Polling Example\n');

  // Initialize BoxQ
  const boxq = new BoxQ({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  // Create publisher
  const publisher = boxq.createPublisher(process.env.SQS_QUEUE_URL, {
    messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
    enableDeduplication: true
  });

  // Create consumer with long polling configuration
  const consumer = boxq.createConsumer(process.env.SQS_QUEUE_URL, {
    messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
    processingMode: 'sequential',
    batchSize: 5,                    // Process up to 5 messages at once
    maxMessages: 10,                 // Receive up to 10 messages per poll
    waitTimeSeconds: 20,             // Long polling: wait up to 20 seconds for messages
    visibilityTimeoutSeconds: 30,    // Message visibility timeout
    pollingInterval: 1000,           // Poll every second (but with long polling)
    autoStart: false                 // Don't start automatically
  });

  console.log('📊 Consumer Configuration:');
  console.log(`   Queue URL: ${process.env.SQS_QUEUE_URL}`);
  console.log(`   Message Group ID: ${process.env.SQS_MESSAGE_GROUP_ID}`);
  console.log(`   Batch Size: 5`);
  console.log(`   Max Messages: 10`);
  console.log(`   Wait Time: 20 seconds (Long Polling)`);
  console.log(`   Visibility Timeout: 30 seconds`);
  console.log(`   Polling Interval: 1000ms\n`);

  // Message handler
  const messageHandler = async (message, context) => {
    console.log(`📨 Received message: ${context.messageId}`);
    console.log(`   Type: ${message.type}`);
    console.log(`   Data: ${message.data}`);
    console.log(`   Timestamp: ${message.timestamp}`);
    console.log('');

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true };
  };

  // Start consumer
  console.log('🎯 Starting consumer with long polling...');
  consumer.start(messageHandler);

  // Publish some test messages
  console.log('📤 Publishing test messages...\n');

  const messages = [
    { type: 'user-login', data: 'User logged in', timestamp: new Date().toISOString() },
    { type: 'order-created', data: 'New order placed', timestamp: new Date().toISOString() },
    { type: 'payment-processed', data: 'Payment completed', timestamp: new Date().toISOString() },
    { type: 'notification-sent', data: 'Email notification sent', timestamp: new Date().toISOString() },
    { type: 'analytics-event', data: 'User action tracked', timestamp: new Date().toISOString() }
  ];

  for (const message of messages) {
    try {
      const result = await publisher.publish(message);
      console.log(`✅ Published: ${result.messageId} (${result.processingTime}ms)`);
    } catch (error) {
      console.error(`❌ Failed to publish: ${error.message}`);
    }
  }

  console.log('\n⏳ Waiting for messages to be consumed...');
  console.log('   (Long polling will efficiently receive messages with minimal API calls)');
  console.log('   Press Ctrl+C to stop\n');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping consumer...');
    consumer.stop();
    console.log('✅ Consumer stopped. Goodbye!');
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    // This keeps the process running
  }, 1000);
}

// Run the example
if (require.main === module) {
  longPollingExample().catch(error => {
    console.error('💥 Example failed:', error.message);
    process.exit(1);
  });
}

module.exports = longPollingExample;
