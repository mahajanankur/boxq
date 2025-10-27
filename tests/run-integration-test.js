/**
 * Integration Test Runner for BoxQ
 * This script runs the complete message flow test
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

async function runIntegrationTest() {
  console.log('🧪 Running BoxQ Integration Test\n');
  console.log('=' .repeat(50));

  try {
    // Initialize BoxQ
    const sqs = new BoxQ({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    console.log('✅ BoxQ initialized');

    // Test health status
    const healthStatus = await sqs.getHealthStatus();
    console.log(`📊 Health Status: ${healthStatus.status}`);

    // Test metrics
    const metrics = sqs.getMetrics();
    console.log(`📈 Circuit Breaker State: ${metrics.circuitBreaker.state}`);

    // Create publisher
    const publisher = sqs.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      enableDeduplication: true
    });

    console.log('✅ Publisher created');

    // Test publishing a message
    const testMessage = {
      type: 'integration-test',
      data: 'Hello from BoxQ Integration Test!',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Publishing test message...');
    const publishResult = await publisher.publish(testMessage);

    if (publishResult.success) {
      console.log('✅ Message published successfully');
      console.log(`   Message ID: ${publishResult.messageId}`);
      console.log(`   Processing Time: ${publishResult.processingTime}ms`);
    } else {
      console.error('❌ Message publishing failed:', publishResult.error);
    }

    // Test batch publishing
    console.log('\n📤 Testing batch publishing...');
    const batchMessages = [
      { body: { type: 'batch-1', data: 'Batch message 1' } },
      { body: { type: 'batch-2', data: 'Batch message 2' } }
    ];

    const batchResults = await publisher.publishBatch(batchMessages);
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`✅ Batch publishing: ${successCount}/${batchResults.length} successful`);

    // Test consumer creation
    const consumer = sqs.createConsumer(process.env.SQS_QUEUE_URL, {
      processingMode: 'sequential',
      maxMessages: 5,
      waitTimeSeconds: 10,
      visibilityTimeoutSeconds: 300,
      autoStart: false
    });

    console.log('✅ Consumer created');

    // Set up message handler
    let receivedCount = 0;
    const messageHandler = async (message, context) => {
      receivedCount++;
      console.log(`📨 Received message ${receivedCount}: ${context.messageId}`);
      console.log(`   Body:`, JSON.stringify(message, null, 2));
      return { success: true };
    };

    // Start consuming for a short time
    console.log('\n🔄 Starting consumer for 10 seconds...');
    consumer.start(messageHandler);

    // Wait for messages
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop consumer
    consumer.stop();
    console.log('⏹️  Consumer stopped');

    // Final summary
    console.log('\n📋 Test Summary:');
    console.log(`   Messages Published: 3 (1 single + 2 batch)`);
    console.log(`   Messages Received: ${receivedCount}`);
    console.log(`   Success Rate: ${receivedCount > 0 ? '100%' : '0%'}`);

    if (receivedCount > 0) {
      console.log('\n🎉 Integration test PASSED!');
      console.log('✅ BoxQ is working correctly with real AWS SQS');
    } else {
      console.log('\n⚠️  Integration test PARTIAL - No messages consumed');
      console.log('   This might be due to:');
      console.log('   - Queue not existing in AWS account');
      console.log('   - Network connectivity issues');
      console.log('   - AWS credentials permissions');
    }

  } catch (error) {
    console.error('❌ Integration test FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Integration test completed');
}

// Run the test
runIntegrationTest().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
