# Getting Started with BoxQ

Welcome to BoxQ! This guide will get you up and running in minutes. 🚀

## 📋 Prerequisites

- **Node.js** 16.0.0 or higher
- **AWS Account** with SQS access
- **AWS Credentials** configured

## 🚀 Installation

```bash
# Install BoxQ
npm install boxq

# Or with yarn
yarn add boxq

# Or with pnpm
pnpm add boxq
```

## ⚡ Quick Start

### 1. Basic Setup

```javascript
const { BoxQ } = require('boxq');

// Create SQS instance
const sqs = new BoxQ({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

### 2. Publish Your First Message

```javascript
// Create publisher
const publisher = sqs.createPublisher('my-queue.fifo', {
  messageGroupId: 'my-group',
  enableDeduplication: true
});

// Publish message
const result = await publisher.publish({
  type: 'user-registration',
  userId: 12345,
  data: { name: 'John Doe', email: 'john@example.com' }
});

console.log('Message published:', result.messageId);
```

### 3. Consume Messages

```javascript
// Create consumer
const consumer = sqs.createConsumer('my-queue.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

// Start consuming
consumer.start(async (message, context) => {
  console.log('Processing message:', message);
  console.log('Message ID:', context.messageId);
  
  // Your business logic here
  await processUserRegistration(message);
});
```

## 🎯 Your First Complete Example

Here's a complete example that demonstrates the core features:

```javascript
const { BoxQ } = require('boxq');

async function main() {
  // 1. Create SQS instance
  const sqs = new BoxQ({
    region: 'us-east-1',
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

  // 2. Create publisher
  const publisher = sqs.createPublisher('orders.fifo', {
    messageGroupId: 'order-processing',
    enableDeduplication: true
  });

  // 3. Publish messages
  const orders = [
    { orderId: 1, customerId: 100, amount: 50.00 },
    { orderId: 2, customerId: 100, amount: 75.00 },
    { orderId: 3, customerId: 101, amount: 25.00 }
  ];

  for (const order of orders) {
    const result = await publisher.publish({
      type: 'order-created',
      ...order,
      timestamp: new Date().toISOString()
    }, {
      messageGroupId: `customer-${order.customerId}`
    });

    console.log(`Order ${order.orderId} published:`, result.messageId);
  }

  // 4. Create consumer
  const consumer = sqs.createConsumer('orders.fifo', {
    processingMode: 'sequential',
    batchSize: 1,
    maxMessages: 1
  });

  // 5. Start consuming
  consumer.start(async (message, context) => {
    console.log(`Processing order ${message.orderId} for customer ${message.customerId}`);
    
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Order ${message.orderId} processed successfully`);
  });

  // 6. Monitor health
  const health = await sqs.getHealthStatus();
  console.log('System health:', health.status);
  console.log('Uptime:', health.uptime, 'ms');

  // 7. Get metrics
  const metrics = sqs.getMetrics();
  console.log('Messages processed:', metrics.system.totalMessages);
  console.log('Success rate:', metrics.system.successRate + '%');

  // 8. Clean up
  setTimeout(() => {
    consumer.stop();
    console.log('Consumer stopped');
  }, 10000);
}

// Run the example
main().catch(console.error);
```

## 🔧 Configuration Options

### SQS Configuration

```javascript
const sqs = new BoxQ({
  region: 'us-east-1',                    // AWS region
  credentials: {                          // AWS credentials
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key'
  },
  circuitBreaker: {                       // Circuit breaker settings
    failureThreshold: 5,                  // Failures before opening circuit
    timeout: 60000,                       // Timeout before attempting to close
    monitoringPeriod: 10000               // Monitoring period
  },
  retry: {                               // Retry configuration
    maxRetries: 3,                       // Maximum retry attempts
    backoffMultiplier: 2,                // Exponential backoff multiplier
    maxBackoffMs: 30000,                 // Maximum backoff time
    initialDelayMs: 1000                 // Initial delay
  },
  logging: {                             // Logging configuration
    level: 'info',                       // Log level
    structured: true                     // Structured logging
  }
});
```

### Publisher Options

```javascript
const publisher = sqs.createPublisher('queue.fifo', {
  messageGroupId: 'group-1',             // Default message group ID
  enableDeduplication: true,             // Enable content-based deduplication
  deduplicationStrategy: 'content'       // Deduplication strategy
});
```

### Consumer Options

```javascript
const consumer = sqs.createConsumer('queue.fifo', {
  processingMode: 'parallel',            // 'parallel' or 'sequential'
  batchSize: 5,                          // Batch size for parallel processing
  throttleDelayMs: 100,                 // Throttle delay between batches
  maxMessages: 10,                       // Maximum messages to receive
  waitTimeSeconds: 20,                  // Long polling wait time
  visibilityTimeoutSeconds: 30,         // Message visibility timeout
  autoStart: true,                      // Start consuming immediately
  pollingInterval: 1000                 // Polling interval
});
```

## 🎯 Common Use Cases

### 1. Event-Driven Architecture

```javascript
// Publish events
const eventPublisher = sqs.createPublisher('events.fifo', {
  messageGroupId: 'event-stream',
  enableDeduplication: true
});

await eventPublisher.publish({
  type: 'user-login',
  userId: 12345,
  timestamp: new Date().toISOString(),
  metadata: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
});

// Consume events
const eventConsumer = sqs.createConsumer('events.fifo', {
  processingMode: 'parallel',
  batchSize: 10
});

eventConsumer.start(async (event, context) => {
  await processEvent(event);
});
```

### 2. Microservices Communication

```javascript
// Service A publishes to Service B
const serviceAPublisher = sqs.createPublisher('service-b-queue.fifo', {
  messageGroupId: 'service-communication'
});

await serviceAPublisher.publish({
  type: 'data-processed',
  serviceId: 'service-a',
  data: processedData
});

// Service B consumes from Service A
const serviceBConsumer = sqs.createConsumer('service-b-queue.fifo', {
  processingMode: 'sequential'
});

serviceBConsumer.start(async (message, context) => {
  await handleServiceAMessage(message);
});
```

### 3. Data Pipeline Processing

```javascript
// High-throughput data processing
const dataConsumer = sqs.createConsumer('data-pipeline.fifo', {
  processingMode: 'parallel',
  batchSize: 20,
  throttleDelayMs: 50
});

dataConsumer.start(async (data, context) => {
  await processDataRecord(data);
});
```

## 🚨 Error Handling

BoxQ provides comprehensive error handling:

```javascript
try {
  const result = await publisher.publish(message);
  
  if (result.success) {
    console.log('Message published:', result.messageId);
  } else {
    console.error('Publishing failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error.message);
}
```

## 📊 Monitoring and Health

### Health Status

```javascript
const health = await sqs.getHealthStatus();
console.log('System health:', health.status);
console.log('Uptime:', health.uptime);
console.log('Circuit breaker state:', health.details.sqsClient.state);
```

### Metrics

```javascript
const metrics = sqs.getMetrics();
console.log('Messages processed:', metrics.system.totalMessages);
console.log('Success rate:', metrics.system.successRate + '%');
console.log('Throughput:', metrics.system.throughput + ' messages/second');
console.log('Average processing time:', metrics.system.averageProcessingTime + 'ms');
```

## 🔄 Next Steps

Now that you have the basics, explore:

- **[API Reference](api-reference.md)** - Complete API documentation
- **[Configuration Guide](configuration.md)** - All configuration options
- **[Examples & Tutorials](examples.md)** - Real-world usage examples
- **[Best Practices](best-practices.md)** - Production deployment guide
- **[Performance Guide](performance.md)** - Optimization and scaling

## 🆘 Need Help?

- **💬 Discord Community** - [Join our Discord](https://discord.gg/boxq)
- **🐛 Issue Tracker** - [GitHub Issues](https://github.com/mahajanankur/boxq/issues)
- **📧 Email Support** - support@boxq.com

---

**Ready to build something amazing?** Check out our [Examples & Tutorials](examples.md) for real-world use cases!
