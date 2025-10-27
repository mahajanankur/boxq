/**
 * @fileoverview Batch processing example for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

require('dotenv').config();
const { BoxQ } = require('../src/index');

/**
 * Batch processing example demonstrating high-throughput message processing
 */
const batchProcessingExample = async () => {
  console.log('⚡ BoxQ - Batch Processing Example');
  
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
    }
  });

  try {
    // Create batch publisher
    const batchPublisher = sqs.createBatchPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID || 'event-processing',
      enableDeduplication: true,
      batchSize: 10
    });

    // Generate batch of events
    console.log('📤 Publishing batch of events...');
    const events = [];
    for (let i = 1; i <= 50; i++) {
      events.push({
        body: {
          type: 'user-action',
          eventId: i,
          userId: Math.floor(Math.random() * 100) + 1,
          action: ['click', 'view', 'purchase', 'login'][Math.floor(Math.random() * 4)],
          timestamp: new Date().toISOString(),
          metadata: {
            sessionId: `session-${i}`,
            ipAddress: `192.168.1.${i % 255}`,
            userAgent: 'Mozilla/5.0...'
          }
        },
        options: {
          messageGroupId: `user-${Math.floor(Math.random() * 10) + 1}`,
          messageAttributes: {
            priority: Math.random() > 0.8 ? 'high' : 'normal',
            eventType: 'user-action'
          }
        }
      });
    }

    // Publish batch
    const batchResult = await batchPublisher.publishBatch(events, {
      batchSize: 10,
      continueOnError: true
    });

    console.log(`📊 Batch publishing results:`);
    console.log(`Total messages: ${batchResult.totalMessages}`);
    console.log(`Successful: ${batchResult.successfulMessages}`);
    console.log(`Failed: ${batchResult.failedMessages}`);
    console.log(`Processing time: ${batchResult.processingTime}ms`);

    if (batchResult.errors.length > 0) {
      console.log('❌ Errors:');
      batchResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message || error.error}`);
      });
    }

    // Create parallel consumer
    const consumer = sqs.createConsumer(process.env.SQS_QUEUE_URL, {
      processingMode: 'parallel',
      batchSize: 5,
      throttleDelayMs: 10,
      maxMessages: 10,
      waitTimeSeconds: 20
    });

    // Start consuming with parallel processing
    console.log('📥 Starting parallel consumer...');
    let processedEvents = [];
    let processingStats = {
      startTime: Date.now(),
      totalProcessed: 0,
      totalFailed: 0
    };
    
    consumer.start(async (message, context) => {
      const processingStart = Date.now();
      
      try {
        // Simulate event processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        processedEvents.push({
          eventId: message.eventId,
          userId: message.userId,
          action: message.action,
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - processingStart
        });
        
        processingStats.totalProcessed++;
        
        if (processingStats.totalProcessed % 10 === 0) {
          console.log(`📈 Processed ${processingStats.totalProcessed} events...`);
        }
        
      } catch (error) {
        processingStats.totalFailed++;
        console.error(`❌ Failed to process event ${message.eventId}:`, error.message);
      }
    });

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Display processing statistics
    const totalTime = Date.now() - processingStats.startTime;
    const throughput = (processingStats.totalProcessed / totalTime) * 1000;
    
    console.log('📊 Processing Statistics:');
    console.log(`Total processed: ${processingStats.totalProcessed}`);
    console.log(`Total failed: ${processingStats.totalFailed}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} events/second`);
    console.log(`Success rate: ${((processingStats.totalProcessed / (processingStats.totalProcessed + processingStats.totalFailed)) * 100).toFixed(2)}%`);

    // Display sample processed events
    console.log('📋 Sample processed events:');
    processedEvents.slice(0, 5).forEach((event, index) => {
      console.log(`${index + 1}. Event ${event.eventId} (User: ${event.userId}, Action: ${event.action}) - ${event.processingTime}ms`);
    });

    // Get consumer statistics
    const consumerStats = consumer.getStats();
    console.log('🔧 Consumer Statistics:');
    console.log(`Processing mode: ${consumerStats.mode}`);
    console.log(`Batch size: ${consumerStats.batchSize}`);
    console.log(`Throttle delay: ${consumerStats.throttleDelayMs}ms`);
    console.log(`Average processing time: ${consumerStats.averageProcessingTime}ms`);

    // Get system metrics
    console.log('📈 System Metrics:');
    const metrics = sqs.getMetrics();
    console.log(`Circuit breaker state: ${metrics.circuitBreaker.state}`);
    console.log(`System throughput: ${metrics.system.throughput.toFixed(2)} messages/second`);
    console.log(`System success rate: ${metrics.system.successRate}%`);

    // Stop consumer
    consumer.stop();
    console.log('🛑 Batch consumer stopped');

  } catch (error) {
    console.error('❌ Error in batch processing example:', error.message);
  }
};

// Run example if called directly
if (require.main === module) {
  batchProcessingExample().catch(console.error);
}

module.exports = batchProcessingExample;
