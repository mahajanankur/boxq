/**
 * @fileoverview FIFO queue example for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { BoxQ } = require('../src/index');

/**
 * FIFO queue example demonstrating message ordering and deduplication
 */
const fifoQueueExample = async () => {
  console.log('🔄 BoxQ - FIFO Queue Example');
  
  // Create SQS instance
  const sqs = new BoxQ({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    // Create publisher for FIFO queue
    const publisher = sqs.createPublisher('orders.fifo', {
      messageGroupId: 'order-processing',
      enableDeduplication: true,
      deduplicationStrategy: 'content'
    });

    // Publish ordered messages
    console.log('📤 Publishing ordered messages...');
    const orders = [
      { orderId: 1, customerId: 100, amount: 50.00, status: 'pending' },
      { orderId: 2, customerId: 100, amount: 75.00, status: 'pending' },
      { orderId: 3, customerId: 101, amount: 25.00, status: 'pending' },
      { orderId: 4, customerId: 100, amount: 100.00, status: 'pending' }
    ];

    for (const order of orders) {
      const result = await publisher.publish({
        type: 'order-created',
        orderId: order.orderId,
        customerId: order.customerId,
        amount: order.amount,
        status: order.status,
        timestamp: new Date().toISOString()
      }, {
        messageGroupId: `customer-${order.customerId}`, // Group by customer
        messageAttributes: {
          priority: order.amount > 50 ? 'high' : 'normal',
          customerId: order.customerId.toString()
        }
      });

      if (result.success) {
        console.log(`✅ Order ${order.orderId} published (Customer: ${order.customerId})`);
      } else {
        console.error(`❌ Failed to publish order ${order.orderId}:`, result.error);
      }
    }

    // Create consumer for FIFO queue
    const consumer = sqs.createConsumer('orders.fifo', {
      processingMode: 'sequential', // FIFO requires sequential processing
      batchSize: 1,
      maxMessages: 1,
      waitTimeSeconds: 20
    });

    // Start consuming with ordered processing
    console.log('📥 Starting FIFO consumer...');
    let processedOrders = [];
    
    consumer.start(async (message, context) => {
      console.log(`📨 Processing order: ${message.orderId} (Customer: ${message.customerId})`);
      console.log(`🆔 Message ID: ${context.messageId}`);
      console.log(`👥 Group ID: ${context.messageGroupId}`);
      
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      processedOrders.push({
        orderId: message.orderId,
        customerId: message.customerId,
        processedAt: new Date().toISOString()
      });
      
      console.log(`✅ Order ${message.orderId} processed successfully`);
    });

    // Wait for all messages to be processed
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Display processing order
    console.log('📋 Processing order:');
    processedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderId} (Customer: ${order.customerId}) - ${order.processedAt}`);
    });

    // Demonstrate deduplication
    console.log('🔄 Testing deduplication...');
    const duplicateOrder = {
      type: 'order-created',
      orderId: 1, // Same order ID
      customerId: 100,
      amount: 50.00,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    const duplicateResult = await publisher.publish(duplicateOrder, {
      messageGroupId: 'customer-100'
    });

    if (duplicateResult.success) {
      console.log('✅ Duplicate message published (will be deduplicated by SQS)');
    } else {
      console.log('🚫 Duplicate message rejected:', duplicateResult.error);
    }

    // Get FIFO-specific metrics
    console.log('📊 FIFO Queue Metrics:');
    const metrics = sqs.getMetrics();
    console.log('Messages processed:', metrics.system.totalMessages);
    console.log('Success rate:', metrics.system.successRate + '%');
    console.log('Average processing time:', metrics.system.averageProcessingTime + 'ms');

    // Stop consumer
    consumer.stop();
    console.log('🛑 FIFO consumer stopped');

  } catch (error) {
    console.error('❌ Error in FIFO queue example:', error.message);
  }
};

// Run example if called directly
if (require.main === module) {
  fifoQueueExample().catch(console.error);
}

module.exports = fifoQueueExample;
