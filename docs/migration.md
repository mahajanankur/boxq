# Migration Guide

Migration guide for BoxQ from other SQS libraries. 🔄

## 📋 Table of Contents

- [From sqs-consumer](#from-sqs-consumer)
- [From aws-sdk](#from-aws-sdk)
- [From custom implementations](#from-custom-implementations)
- [Version Migration](#version-migration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## From sqs-consumer

### Overview

BoxQ provides a more advanced and feature-rich alternative to sqs-consumer with better performance, reliability, and monitoring capabilities.

### Key Differences

| Feature | sqs-consumer | BoxQ |
|---------|--------------|----------------|
| Circuit Breaker | ❌ | ✅ |
| Retry Logic | Basic | Advanced |
| Processing Modes | Sequential only | Parallel + Sequential |
| Deduplication | Basic | Content-based |
| Health Monitoring | ❌ | ✅ |
| Performance Metrics | ❌ | ✅ |
| FIFO Optimization | Basic | Advanced |

### Migration Steps

#### 1. Install BoxQ

```bash
# Remove sqs-consumer
npm uninstall sqs-consumer

# Install BoxQ
npm install boxq
```

#### 2. Update Imports

```javascript
// Old (sqs-consumer)
const Consumer = require('sqs-consumer');

// New (BoxQ)
const { BoxQ } = require('boxq');
```

#### 3. Update Configuration

```javascript
// Old (sqs-consumer)
const consumer = Consumer.create({
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
  handleMessage: async (message) => {
    // Process message
  }
});

// New (BoxQ)
const sqs = new BoxQ({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' }
});

const consumer = sqs.createConsumer('my-queue', {
  processingMode: 'sequential'
});

consumer.start(async (message, context) => {
  // Process message
});
```

#### 4. Update Message Handling

```javascript
// Old (sqs-consumer)
const consumer = Consumer.create({
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
  handleMessage: async (message) => {
    console.log('Processing message:', message.Body);
    // Process message
  }
});

// New (Enterprise SQS)
consumer.start(async (message, context) => {
  console.log('Processing message:', message);
  console.log('Message ID:', context.messageId);
  console.log('Group ID:', context.messageGroupId);
  // Process message
});
```

#### 5. Add Advanced Features

```javascript
// Add circuit breaker and retry logic
const sqs = new EnterpriseSQS({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' },
  circuitBreaker: {
    failureThreshold: 5,
    timeout: 60000
  },
  retry: {
    maxRetries: 3,
    backoffMultiplier: 2
  }
});

// Add health monitoring
const health = await sqs.getHealthStatus();
console.log('System health:', health.status);

// Add performance metrics
const metrics = sqs.getMetrics();
console.log('Throughput:', metrics.system.throughput);
```

---

## From aws-sdk

### Overview

BoxQ provides a higher-level abstraction over the AWS SDK with built-in reliability, monitoring, and performance optimizations.

### Key Differences

| Feature | aws-sdk | BoxQ |
|---------|---------|----------------|
| Boilerplate Code | High | Low |
| Error Handling | Manual | Automatic |
| Retry Logic | Manual | Automatic |
| Circuit Breaker | ❌ | ✅ |
| Health Monitoring | ❌ | ✅ |
| Performance Metrics | ❌ | ✅ |
| FIFO Support | Basic | Advanced |

### Migration Steps

#### 1. Install BoxQ

```bash
# Keep aws-sdk for other services
npm install boxq
```

#### 2. Update Imports

```javascript
// Old (aws-sdk)
const { SQSClient, SendMessageCommand, ReceiveMessageCommand } = require('@aws-sdk/client-sqs');

// New (BoxQ)
const { BoxQ } = require('boxq');
```

#### 3. Update SQS Client

```javascript
// Old (aws-sdk)
const sqsClient = new SQSClient({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' }
});

// New (BoxQ)
const sqs = new BoxQ({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' }
});
```

#### 4. Update Message Publishing

```javascript
// Old (aws-sdk)
const publishMessage = async (messageBody) => {
  try {
    const command = new SendMessageCommand({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
      MessageBody: JSON.stringify(messageBody)
    });
    
    const result = await sqsClient.send(command);
    return result;
  } catch (error) {
    console.error('Publishing failed:', error);
    throw error;
  }
};

// New (Enterprise SQS)
const publisher = sqs.createPublisher('my-queue');

const publishMessage = async (messageBody) => {
  const result = await publisher.publish(messageBody);
  
  if (result.success) {
    return result;
  } else {
    throw new Error(`Publishing failed: ${result.error}`);
  }
};
```

#### 5. Update Message Consuming

```javascript
// Old (aws-sdk)
const consumeMessages = async () => {
  while (true) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20
      });
      
      const result = await sqsClient.send(command);
      const messages = result.Messages || [];
      
      for (const message of messages) {
        try {
          // Process message
          await processMessage(JSON.parse(message.Body));
          
          // Delete message
          await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
            ReceiptHandle: message.ReceiptHandle
          }));
        } catch (error) {
          console.error('Message processing failed:', error);
        }
      }
    } catch (error) {
      console.error('Consuming failed:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// New (Enterprise SQS)
const consumer = sqs.createConsumer('my-queue', {
  processingMode: 'parallel',
  batchSize: 10
});

consumer.start(async (message, context) => {
  // Process message
  await processMessage(message);
});
```

---

## From Custom Implementations

### Overview

If you have a custom SQS implementation, BoxQ can provide significant improvements in reliability, performance, and maintainability.

### Migration Benefits

- **Reduced Code** - Less boilerplate code
- **Better Reliability** - Circuit breaker and retry logic
- **Improved Performance** - Optimized processing
- **Enhanced Monitoring** - Health checks and metrics
- **Better Error Handling** - Comprehensive error management

### Migration Steps

#### 1. Analyze Current Implementation

```javascript
// Document your current implementation
const currentImplementation = {
  features: [
    'Message publishing',
    'Message consuming',
    'Error handling',
    'Retry logic',
    'Monitoring'
  ],
  painPoints: [
    'Manual error handling',
    'No circuit breaker',
    'Limited monitoring',
    'Performance issues'
  ]
};
```

#### 2. Plan Migration

```javascript
// Create migration plan
const migrationPlan = {
  phase1: 'Core functionality migration',
  phase2: 'Advanced features implementation',
  phase3: 'Performance optimization',
  phase4: 'Monitoring and alerting'
};
```

#### 3. Implement Core Features

```javascript
// Start with basic functionality
const sqs = new EnterpriseSQS({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' }
});

// Replace custom publisher
const publisher = sqs.createPublisher('my-queue');

// Replace custom consumer
const consumer = sqs.createConsumer('my-queue');
```

#### 4. Add Advanced Features

```javascript
// Add circuit breaker
const sqs = new EnterpriseSQS({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' },
  circuitBreaker: {
    failureThreshold: 5,
    timeout: 60000
  }
});

// Add retry logic
sqs.getSQSClient().updateRetryConfig({
  maxRetries: 3,
  backoffMultiplier: 2
});

// Add health monitoring
const health = await sqs.getHealthStatus();
console.log('System health:', health.status);
```

#### 5. Performance Optimization

```javascript
// Optimize for high throughput
const consumer = sqs.createConsumer('my-queue', {
  processingMode: 'parallel',
  batchSize: 20,
  throttleDelayMs: 10
});

// Monitor performance
const metrics = sqs.getMetrics();
console.log('Throughput:', metrics.system.throughput);
```

---

## Version Migration

### From v0.9.0 to v1.0.0

#### Breaking Changes

1. **Configuration Structure**
   ```javascript
   // Old configuration
   const sqs = new BoxQ({
     region: 'us-east-1',
     credentials: { accessKeyId: '...', secretAccessKey: '...' }
   });
   
   // New configuration
   const sqs = new BoxQ({
     region: 'us-east-1',
     credentials: { accessKeyId: '...', secretAccessKey: '...' },
     circuitBreaker: {
       failureThreshold: 5,
       timeout: 60000
     },
     retry: {
       maxRetries: 3,
       backoffMultiplier: 2
     }
   });
   ```

2. **API Changes**
   ```javascript
   // Old API
   const publisher = sqs.createPublisher('queue.fifo');
   
   // New API
   const publisher = sqs.createPublisher('queue.fifo', {
     messageGroupId: 'group-1',
     enableDeduplication: true
   });
   ```

#### Migration Steps

1. **Update Dependencies**
   ```bash
   npm update boxq
   ```

2. **Update Configuration**
   ```javascript
   // Add new configuration options
   const sqs = new BoxQ({
     // ... existing config
     circuitBreaker: {
       failureThreshold: 5,
       timeout: 60000
     },
     retry: {
       maxRetries: 3,
       backoffMultiplier: 2
     }
   });
   ```

3. **Update API Usage**
   ```javascript
   // Update publisher usage
   const publisher = sqs.createPublisher('queue.fifo', {
     messageGroupId: 'group-1',
     enableDeduplication: true
   });
   
   // Update consumer usage
   const consumer = sqs.createConsumer('queue.fifo', {
     processingMode: 'parallel',
     batchSize: 5
   });
   ```

4. **Test Migration**
   ```bash
   # Run tests
   npm test
   
   # Check for breaking changes
   npm run lint
   ```

---

## Best Practices

### 1. Gradual Migration

```javascript
// Migrate one component at a time
const migrationSteps = [
  '1. Update configuration',
  '2. Migrate publishers',
  '3. Migrate consumers',
  '4. Add monitoring',
  '5. Optimize performance'
];
```

### 2. Testing Strategy

```javascript
// Test migration thoroughly
const testMigration = async () => {
  // Test basic functionality
  await testBasicFunctionality();
  
  // Test error handling
  await testErrorHandling();
  
  // Test performance
  await testPerformance();
  
  // Test monitoring
  await testMonitoring();
};
```

### 3. Rollback Plan

```javascript
// Prepare rollback plan
const rollbackPlan = {
  steps: [
    '1. Revert to previous version',
    '2. Restore old configuration',
    '3. Update API usage',
    '4. Test rollback',
    '5. Monitor system'
  ],
  triggers: [
    'High error rate',
    'Performance degradation',
    'System instability'
  ]
};
```

### 4. Monitoring Migration

```javascript
// Monitor migration progress
const monitorMigration = () => {
  const metrics = sqs.getMetrics();
  
  console.log('Migration metrics:');
  console.log('Success rate:', metrics.system.successRate);
  console.log('Throughput:', metrics.system.throughput);
  console.log('Error rate:', 100 - metrics.system.successRate);
  
  // Alert if issues detected
  if (metrics.system.successRate < 99) {
    console.warn('Migration issues detected!');
  }
};
```

---

## Troubleshooting

### Common Migration Issues

#### 1. Configuration Errors

```javascript
// Check configuration
const validateConfiguration = (config) => {
  const required = ['region', 'credentials'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};
```

#### 2. API Compatibility

```javascript
// Check API compatibility
const checkAPICompatibility = () => {
  const requiredMethods = [
    'createPublisher',
    'createConsumer',
    'getHealthStatus',
    'getMetrics'
  ];
  
  requiredMethods.forEach(method => {
    if (typeof sqs[method] !== 'function') {
      throw new Error(`Missing required method: ${method}`);
    }
  });
};
```

#### 3. Performance Issues

```javascript
// Monitor performance during migration
const monitorPerformance = () => {
  const metrics = sqs.getMetrics();
  
  if (metrics.system.throughput < 100) {
    console.warn('Low throughput detected');
    // Optimize configuration
  }
  
  if (metrics.system.averageProcessingTime > 1000) {
    console.warn('High processing time detected');
    // Optimize processing
  }
};
```

### Migration Checklist

- [ ] **Dependencies Updated** - All dependencies updated
- [ ] **Configuration Updated** - New configuration applied
- [ ] **API Usage Updated** - All API calls updated
- [ ] **Tests Passing** - All tests pass
- [ ] **Performance Verified** - Performance meets requirements
- [ ] **Monitoring Working** - Health checks and metrics working
- [ ] **Documentation Updated** - Documentation updated
- [ ] **Team Trained** - Team trained on new features

### Support

If you encounter issues during migration:

- **GitHub Issues** - [Report migration issues](https://github.com/mahajanankur/boxq/issues)
- **Discord Community** - [Get help from community](https://discord.gg/boxq)
- **Email Support** - [Contact support team](mailto:support@boxq.com)
- **Documentation** - [Check documentation](https://docs.boxq.com)

---

## 🎯 Summary

Migration to BoxQ provides:

- **Better Reliability** - Circuit breaker and retry logic
- **Improved Performance** - Optimized processing and monitoring
- **Enhanced Monitoring** - Health checks and metrics
- **Reduced Complexity** - Less boilerplate code
- **Better Error Handling** - Comprehensive error management

**Ready to migrate?** Check out our [Getting Started Guide](getting-started.md) for detailed setup instructions!
