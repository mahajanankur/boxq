# Best Practices for Production Deployment

Production-ready guidelines for Enterprise SQS. 🏭

## 🎯 Table of Contents

- [Configuration Best Practices](#configuration-best-practices)
- [Error Handling Strategies](#error-handling-strategies)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Alerting](#monitoring--alerting)
- [Security Considerations](#security-considerations)
- [Scaling Strategies](#scaling-strategies)
- [Disaster Recovery](#disaster-recovery)
- [Testing Strategies](#testing-strategies)

---

## Configuration Best Practices

### 1. Environment-Specific Configuration

```javascript
// config/production.js
module.exports = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  circuitBreaker: {
    failureThreshold: 10,        // Higher threshold for production
    timeout: 120000,             // 2 minutes timeout
    monitoringPeriod: 30000     // 30 seconds monitoring
  },
  retry: {
    maxRetries: 5,               // More retries for production
    backoffMultiplier: 2,
    maxBackoffMs: 60000,         // 1 minute max backoff
    initialDelayMs: 2000         // 2 seconds initial delay
  },
  logging: {
    level: 'info',               // Info level for production
    structured: true
  }
};
```

### 2. Queue Configuration

```javascript
// Production queue configuration
const sqs = new EnterpriseSQS(config);

// FIFO queues for critical operations
const criticalPublisher = sqs.createPublisher('critical-orders.fifo', {
  messageGroupId: 'order-processing',
  enableDeduplication: true,
  deduplicationStrategy: 'content'
});

// Standard queues for high-throughput operations
const highVolumePublisher = sqs.createPublisher('events', {
  enableDeduplication: false
});
```

### 3. Consumer Configuration

```javascript
// High-reliability consumer
const reliableConsumer = sqs.createConsumer('critical-orders.fifo', {
  processingMode: 'sequential',    // Sequential for critical operations
  batchSize: 1,                    // One message at a time
  maxMessages: 1,                  // Single message processing
  waitTimeSeconds: 20,             // Long polling
  visibilityTimeoutSeconds: 300,   // 5 minutes visibility timeout
  throttleDelayMs: 100            // Small delay between messages
});

// High-throughput consumer
const fastConsumer = sqs.createConsumer('events', {
  processingMode: 'parallel',      // Parallel for high throughput
  batchSize: 10,                   // Process 10 messages at once
  maxMessages: 10,                 // Receive up to 10 messages
  waitTimeSeconds: 20,             // Long polling
  visibilityTimeoutSeconds: 60,    // 1 minute visibility timeout
  throttleDelayMs: 10              // Minimal delay
});
```

---

## Error Handling Strategies

### 1. Comprehensive Error Handling

```javascript
// Publisher error handling
const publishWithErrorHandling = async (message) => {
  try {
    const result = await publisher.publish(message);
    
    if (result.success) {
      console.log('Message published successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('Publishing failed:', result.error);
      
      // Handle specific error types
      if (result.error.includes('Circuit breaker')) {
        // Circuit breaker is open - implement fallback
        await handleCircuitBreakerOpen(message);
      } else if (result.error.includes('Duplicate')) {
        // Duplicate message - this is expected for FIFO queues
        console.log('Duplicate message detected (expected for FIFO)');
        return { success: true, duplicate: true };
      } else {
        // Other errors - retry or fail
        throw new Error(`Publishing failed: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('Unexpected publishing error:', error.message);
    throw error;
  }
};
```

### 2. Consumer Error Handling

```javascript
// Consumer with comprehensive error handling
consumer.start(async (message, context) => {
  const startTime = Date.now();
  
  try {
    // Validate message
    if (!message || !message.type) {
      throw new Error('Invalid message format');
    }
    
    // Process message based on type
    switch (message.type) {
      case 'user-registration':
        await processUserRegistration(message);
        break;
      case 'order-created':
        await processOrderCreated(message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
        return; // Skip processing unknown message types
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Message processed successfully in ${processingTime}ms`);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Message processing failed:', {
      messageId: context.messageId,
      error: error.message,
      processingTime,
      message: message
    });
    
    // Handle different error types
    if (error.name === 'ValidationError') {
      // Validation errors - don't retry
      console.error('Validation error - message will be discarded');
    } else if (error.name === 'TimeoutError') {
      // Timeout errors - may be retried
      console.error('Timeout error - message may be retried');
      throw error; // Re-throw to trigger SQS retry
    } else {
      // Other errors - retry with backoff
      console.error('Processing error - message will be retried');
      throw error; // Re-throw to trigger SQS retry
    }
  }
});
```

### 3. Circuit Breaker Monitoring

```javascript
// Monitor circuit breaker status
const monitorCircuitBreaker = () => {
  const status = sqs.getSQSClient().getCircuitBreakerStatus();
  
  if (status.state === 'OPEN') {
    console.error('Circuit breaker is OPEN - system may be degraded');
    
    // Implement fallback mechanisms
    await implementFallbackMechanisms();
    
    // Alert operations team
    await alertOperationsTeam('Circuit breaker is open');
  } else if (status.state === 'HALF_OPEN') {
    console.warn('Circuit breaker is HALF_OPEN - testing recovery');
  } else {
    console.log('Circuit breaker is CLOSED - system is healthy');
  }
};

// Monitor every 30 seconds
setInterval(monitorCircuitBreaker, 30000);
```

---

## Performance Optimization

### 1. Throughput Optimization

```javascript
// High-throughput configuration
const highThroughputConsumer = sqs.createConsumer('high-volume-queue', {
  processingMode: 'parallel',
  batchSize: 20,                    // Process 20 messages in parallel
  maxMessages: 20,                 // Receive up to 20 messages
  waitTimeSeconds: 20,             // Long polling
  visibilityTimeoutSeconds: 300,   // 5 minutes visibility timeout
  throttleDelayMs: 0,             // No throttling for maximum throughput
  pollingInterval: 100             // Fast polling
});
```

### 2. Memory Management

```javascript
// Periodic metrics cleanup
const cleanupMetrics = () => {
  // Clear old metrics every hour
  sqs.resetMetrics();
  
  // Clear old alerts
  sqs.getHealthMonitor().clearAlerts();
  
  console.log('Metrics cleaned up');
};

// Run cleanup every hour
setInterval(cleanupMetrics, 3600000);
```

### 3. Resource Monitoring

```javascript
// Monitor resource usage
const monitorResources = () => {
  const metrics = sqs.getMetrics();
  
  // Check throughput
  if (metrics.system.throughput < 100) {
    console.warn('Low throughput detected:', metrics.system.throughput);
  }
  
  // Check success rate
  if (metrics.system.successRate < 95) {
    console.error('Low success rate detected:', metrics.system.successRate);
  }
  
  // Check processing time
  if (metrics.system.averageProcessingTime > 5000) {
    console.warn('High processing time detected:', metrics.system.averageProcessingTime);
  }
};

// Monitor every 5 minutes
setInterval(monitorResources, 300000);
```

---

## Monitoring & Alerting

### 1. Health Check Implementation

```javascript
// Custom health checks
const registerCustomHealthChecks = () => {
  const healthMonitor = sqs.getHealthMonitor();
  
  // Database health check
  healthMonitor.registerHealthCheck('database', async () => {
    try {
      await database.ping();
      return { status: 'healthy', details: { connection: 'active' } };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  });
  
  // External service health check
  healthMonitor.registerHealthCheck('external-service', async () => {
    try {
      const response = await fetch('https://api.example.com/health');
      return { status: 'healthy', details: { response: response.status } };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  });
};
```

### 2. Alerting System

```javascript
// Alert system implementation
const setupAlerting = () => {
  const healthMonitor = sqs.getHealthMonitor();
  
  // Monitor health status
  setInterval(async () => {
    const health = await sqs.getHealthStatus();
    
    if (health.status === 'unhealthy') {
      await sendAlert('SQS system is unhealthy', {
        status: health.status,
        details: health.details,
        timestamp: health.timestamp
      });
    }
  }, 60000); // Check every minute
  
  // Monitor circuit breaker
  setInterval(() => {
    const status = sqs.getSQSClient().getCircuitBreakerStatus();
    
    if (status.state === 'OPEN') {
      sendAlert('Circuit breaker is open', {
        state: status.state,
        failureCount: status.failureCount,
        timeSinceLastFailure: status.timeSinceLastFailure
      });
    }
  }, 30000); // Check every 30 seconds
};
```

### 3. Metrics Dashboard

```javascript
// Metrics collection for dashboard
const collectMetrics = () => {
  const metrics = sqs.getMetrics();
  
  // Send metrics to monitoring system
  sendMetrics({
    timestamp: new Date().toISOString(),
    system: {
      uptime: metrics.system.uptime,
      totalMessages: metrics.system.totalMessages,
      successRate: metrics.system.successRate,
      throughput: metrics.system.throughput,
      averageProcessingTime: metrics.system.averageProcessingTime
    },
    circuitBreaker: {
      state: metrics.circuitBreaker.state,
      failureCount: metrics.circuitBreaker.failureCount,
      successCount: metrics.circuitBreaker.successCount
    },
    components: {
      publishers: metrics.components.publishers,
      consumers: metrics.components.consumers,
      activeConsumers: metrics.components.activeConsumers
    }
  });
};

// Collect metrics every minute
setInterval(collectMetrics, 60000);
```

---

## Security Considerations

### 1. Credential Management

```javascript
// Use IAM roles instead of access keys
const sqs = new EnterpriseSQS({
  region: process.env.AWS_REGION,
  // Don't specify credentials - use IAM role
});

// Or use AWS SDK credential chain
const sqs = new EnterpriseSQS({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN // For temporary credentials
  }
});
```

### 2. Message Encryption

```javascript
// Encrypt sensitive data before publishing
const publishEncryptedMessage = async (sensitiveData) => {
  const encryptedData = await encrypt(sensitiveData);
  
  const result = await publisher.publish({
    type: 'sensitive-data',
    encryptedData: encryptedData,
    timestamp: new Date().toISOString()
  });
  
  return result;
};
```

### 3. Access Control

```javascript
// Implement message-level access control
const processMessageWithAccessControl = async (message, context) => {
  // Check if user has access to this message
  if (!await hasAccess(message.userId, context.messageGroupId)) {
    console.warn('Access denied for message:', context.messageId);
    return; // Skip processing
  }
  
  // Process message
  await processMessage(message);
};
```

---

## Scaling Strategies

### 1. Horizontal Scaling

```javascript
// Multiple consumer instances
const createConsumerInstance = (instanceId) => {
  const consumer = sqs.createConsumer('high-volume-queue', {
    processingMode: 'parallel',
    batchSize: 10,
    maxMessages: 10
  });
  
  consumer.start(async (message, context) => {
    console.log(`Instance ${instanceId} processing:`, message);
    await processMessage(message);
  });
  
  return consumer;
};

// Create multiple instances
const instances = [];
for (let i = 0; i < 5; i++) {
  instances.push(createConsumerInstance(i));
}
```

### 2. Queue Partitioning

```javascript
// Partition messages by customer ID
const publishToPartitionedQueue = async (message) => {
  const partition = message.customerId % 10; // 10 partitions
  const queueUrl = `customer-queue-${partition}.fifo`;
  
  const partitionPublisher = sqs.createPublisher(queueUrl, {
    messageGroupId: `customer-${message.customerId}`
  });
  
  return await partitionPublisher.publish(message);
};
```

### 3. Load Balancing

```javascript
// Load balance across multiple queues
const loadBalancedPublish = async (message) => {
  const queues = [
    'queue-1.fifo',
    'queue-2.fifo',
    'queue-3.fifo'
  ];
  
  const queueIndex = Math.floor(Math.random() * queues.length);
  const queueUrl = queues[queueIndex];
  
  const publisher = sqs.createPublisher(queueUrl, {
    messageGroupId: 'load-balanced'
  });
  
  return await publisher.publish(message);
};
```

---

## Disaster Recovery

### 1. Multi-Region Setup

```javascript
// Primary region
const primarySQS = new EnterpriseSQS({
  region: 'us-east-1',
  credentials: primaryCredentials
});

// Secondary region
const secondarySQS = new EnterpriseSQS({
  region: 'us-west-2',
  credentials: secondaryCredentials
});

// Failover mechanism
const publishWithFailover = async (message) => {
  try {
    return await primarySQS.createPublisher('queue.fifo').publish(message);
  } catch (error) {
    console.warn('Primary region failed, using secondary:', error.message);
    return await secondarySQS.createPublisher('queue.fifo').publish(message);
  }
};
```

### 2. Message Backup

```javascript
// Backup messages to secondary storage
const publishWithBackup = async (message) => {
  try {
    const result = await publisher.publish(message);
    
    // Backup to secondary storage
    await backupToSecondaryStorage(message, result.messageId);
    
    return result;
  } catch (error) {
    console.error('Publishing failed, message backed up:', error.message);
    throw error;
  }
};
```

---

## Testing Strategies

### 1. Unit Testing

```javascript
// Test publisher
describe('MessagePublisher', () => {
  it('should publish message successfully', async () => {
    const publisher = sqs.createPublisher('test-queue.fifo');
    const result = await publisher.publish({ type: 'test' });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
  
  it('should handle publishing errors', async () => {
    const publisher = sqs.createPublisher('invalid-queue');
    const result = await publisher.publish({ type: 'test' });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Integration Testing

```javascript
// Test end-to-end flow
describe('SQS Integration', () => {
  it('should process messages end-to-end', async () => {
    const publisher = sqs.createPublisher('test-queue.fifo');
    const consumer = sqs.createConsumer('test-queue.fifo');
    
    let processedMessage = null;
    
    consumer.start(async (message) => {
      processedMessage = message;
    });
    
    await publisher.publish({ type: 'test', data: 'hello' });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    expect(processedMessage).toBeDefined();
    expect(processedMessage.type).toBe('test');
  });
});
```

### 3. Load Testing

```javascript
// Load test implementation
const loadTest = async () => {
  const publisher = sqs.createPublisher('load-test-queue');
  
  const startTime = Date.now();
  const messageCount = 1000;
  
  // Publish messages
  const promises = [];
  for (let i = 0; i < messageCount; i++) {
    promises.push(publisher.publish({ id: i, data: `message-${i}` }));
  }
  
  const results = await Promise.allSettled(promises);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const throughput = (successful / (endTime - startTime)) * 1000;
  
  console.log(`Load test results:`);
  console.log(`Messages: ${messageCount}`);
  console.log(`Successful: ${successful}`);
  console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
};
```

---

## 🎯 Summary

Following these best practices will ensure:

- **High Reliability** - Circuit breaker patterns and comprehensive error handling
- **Optimal Performance** - Proper configuration and resource management
- **Production Monitoring** - Health checks, metrics, and alerting
- **Security** - Proper credential management and access control
- **Scalability** - Horizontal scaling and load balancing
- **Disaster Recovery** - Multi-region setup and message backup
- **Quality Assurance** - Comprehensive testing strategies

**Ready to deploy?** Check out our [Performance Guide](performance.md) for optimization tips!
