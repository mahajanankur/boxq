# Performance Guide

Optimization and scaling strategies for Enterprise SQS. ⚡

## 📊 Table of Contents

- [Performance Metrics](#performance-metrics)
- [Throughput Optimization](#throughput-optimization)
- [Latency Reduction](#latency-reduction)
- [Memory Management](#memory-management)
- [Scaling Strategies](#scaling-strategies)
- [Monitoring & Profiling](#monitoring--profiling)
- [Performance Testing](#performance-testing)
- [Troubleshooting](#troubleshooting)

---

## Performance Metrics

### Key Performance Indicators (KPIs)

```javascript
// Performance monitoring
const monitorPerformance = () => {
  const metrics = sqs.getMetrics();
  
  console.log('=== Performance Metrics ===');
  console.log(`Throughput: ${metrics.system.throughput.toFixed(2)} messages/second`);
  console.log(`Success Rate: ${metrics.system.successRate}%`);
  console.log(`Average Processing Time: ${metrics.system.averageProcessingTime}ms`);
  console.log(`Total Messages: ${metrics.system.totalMessages}`);
  console.log(`Uptime: ${metrics.system.uptime}ms`);
  
  // Circuit breaker metrics
  console.log(`Circuit Breaker State: ${metrics.circuitBreaker.state}`);
  console.log(`Failure Count: ${metrics.circuitBreaker.failureCount}`);
  console.log(`Success Count: ${metrics.circuitBreaker.successCount}`);
  
  // Component metrics
  console.log(`Active Consumers: ${metrics.components.activeConsumers}`);
  console.log(`Total Publishers: ${metrics.components.publishers}`);
  console.log(`Total Consumers: ${metrics.components.consumers}`);
};
```

### Performance Targets

| Metric | Target | Excellent | Good | Poor |
|--------|--------|-----------|------|------|
| Throughput | > 1000 msg/s | > 5000 msg/s | > 1000 msg/s | < 100 msg/s |
| Success Rate | > 99.9% | > 99.99% | > 99.9% | < 99% |
| Processing Time | < 100ms | < 50ms | < 100ms | > 500ms |
| Error Rate | < 0.1% | < 0.01% | < 0.1% | > 1% |
| Circuit Breaker | CLOSED | CLOSED | CLOSED | OPEN |

---

## Throughput Optimization

### 1. Parallel Processing Configuration

```javascript
// High-throughput parallel processing
const highThroughputConsumer = sqs.createConsumer('high-volume-queue', {
  processingMode: 'parallel',
  batchSize: 20,                    // Process 20 messages in parallel
  maxMessages: 20,                 // Receive up to 20 messages
  waitTimeSeconds: 20,             // Long polling for efficiency
  visibilityTimeoutSeconds: 300,   // 5 minutes visibility timeout
  throttleDelayMs: 0,             // No throttling for maximum throughput
  pollingInterval: 100             // Fast polling (100ms)
});
```

### 2. Batch Processing Optimization

```javascript
// Optimized batch publishing
const batchPublisher = sqs.createBatchPublisher('high-volume-queue', {
  batchSize: 100,                  // Large batch size
  enableDeduplication: true
});

// Publish large batches
const publishLargeBatch = async (messages) => {
  const startTime = Date.now();
  
  const result = await batchPublisher.publishBatch(messages, {
    batchSize: 50,                 // Process 50 messages per batch
    continueOnError: true         // Continue on individual failures
  });
  
  const processingTime = Date.now() - startTime;
  const throughput = (result.successfulMessages / processingTime) * 1000;
  
  console.log(`Batch processing completed:`);
  console.log(`Messages: ${result.totalMessages}`);
  console.log(`Successful: ${result.successfulMessages}`);
  console.log(`Failed: ${result.failedMessages}`);
  console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
  
  return result;
};
```

### 3. Queue Partitioning

```javascript
// Partition messages across multiple queues
const partitionMessages = (messages, partitionCount) => {
  const partitions = Array.from({ length: partitionCount }, () => []);
  
  messages.forEach((message, index) => {
    const partitionIndex = index % partitionCount;
    partitions[partitionIndex].push(message);
  });
  
  return partitions;
};

// Process partitioned messages
const processPartitionedMessages = async (messages) => {
  const partitionCount = 5; // 5 partitions
  const partitions = partitionMessages(messages, partitionCount);
  
  const promises = partitions.map(async (partition, index) => {
    const queueUrl = `partition-${index}.fifo`;
    const publisher = sqs.createPublisher(queueUrl, {
      messageGroupId: `partition-${index}`,
      enableDeduplication: true
    });
    
    return await publisher.publishBatch(partition);
  });
  
  const results = await Promise.allSettled(promises);
  
  const totalSuccessful = results.reduce((sum, result) => {
    return sum + (result.status === 'fulfilled' ? result.value.successfulMessages : 0);
  }, 0);
  
  console.log(`Partitioned processing completed: ${totalSuccessful} messages processed`);
  return results;
};
```

---

## Latency Reduction

### 1. Optimized Consumer Configuration

```javascript
// Low-latency consumer configuration
const lowLatencyConsumer = sqs.createConsumer('low-latency-queue', {
  processingMode: 'sequential',     // Sequential for low latency
  batchSize: 1,                    // Single message processing
  maxMessages: 1,                  // Receive one message at a time
  waitTimeSeconds: 20,            // Long polling
  visibilityTimeoutSeconds: 30,   // Short visibility timeout
  throttleDelayMs: 0,             // No throttling
  pollingInterval: 50              // Fast polling (50ms)
});
```

### 2. Message Preprocessing

```javascript
// Preprocess messages for faster processing
const preprocessMessage = (message) => {
  // Cache frequently accessed data
  const processedMessage = {
    ...message,
    _cached: {
      userId: message.userId,
      timestamp: new Date(message.timestamp),
      priority: message.priority || 'normal'
    }
  };
  
  return processedMessage;
};

// Consumer with preprocessing
const optimizedConsumer = sqs.createConsumer('optimized-queue', {
  processingMode: 'sequential',
  batchSize: 1
});

optimizedConsumer.start(async (message, context) => {
  // Preprocess message
  const processedMessage = preprocessMessage(message);
  
  // Fast processing
  await processMessage(processedMessage);
});
```

### 3. Connection Pooling

```javascript
// Reuse SQS client instances
const createOptimizedSQS = () => {
  const sqs = new EnterpriseSQS({
    region: 'us-east-1',
    credentials: { accessKeyId: '...', secretAccessKey: '...' }
  });
  
  // Configure for low latency
  sqs.getSQSClient().updateRetryConfig({
    maxRetries: 1,                 // Fewer retries for speed
    backoffMultiplier: 1.5,       // Lower backoff multiplier
    maxBackoffMs: 1000,           // Lower max backoff
    initialDelayMs: 100           // Lower initial delay
  });
  
  return sqs;
};
```

---

## Memory Management

### 1. Memory Monitoring

```javascript
// Monitor memory usage
const monitorMemory = () => {
  const usage = process.memoryUsage();
  
  console.log('=== Memory Usage ===');
  console.log(`RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
  
  // Alert if memory usage is high
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('High memory usage detected!');
  }
};

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);
```

### 2. Memory Cleanup

```javascript
// Periodic memory cleanup
const cleanupMemory = () => {
  // Clear old metrics
  sqs.resetMetrics();
  
  // Clear old alerts
  sqs.getHealthMonitor().clearAlerts();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('Memory cleanup completed');
};

// Run cleanup every 5 minutes
setInterval(cleanupMemory, 300000);
```

### 3. Message Size Optimization

```javascript
// Optimize message size
const optimizeMessage = (message) => {
  // Remove unnecessary fields
  const optimized = {
    type: message.type,
    id: message.id,
    data: message.data,
    timestamp: message.timestamp
  };
  
  // Compress large data
  if (message.data && JSON.stringify(message.data).length > 1000) {
    optimized.data = compressData(message.data);
    optimized.compressed = true;
  }
  
  return optimized;
};

// Publish optimized messages
const publishOptimizedMessage = async (message) => {
  const optimized = optimizeMessage(message);
  return await publisher.publish(optimized);
};
```

---

## Scaling Strategies

### 1. Horizontal Scaling

```javascript
// Multiple consumer instances
const createConsumerInstances = (instanceCount) => {
  const instances = [];
  
  for (let i = 0; i < instanceCount; i++) {
    const consumer = sqs.createConsumer('scalable-queue', {
      processingMode: 'parallel',
      batchSize: 10,
      maxMessages: 10
    });
    
    consumer.start(async (message, context) => {
      console.log(`Instance ${i} processing: ${message.id}`);
      await processMessage(message);
    });
    
    instances.push(consumer);
  }
  
  return instances;
};

// Create 5 consumer instances
const consumerInstances = createConsumerInstances(5);
```

### 2. Load Balancing

```javascript
// Load balance across multiple queues
const loadBalancedPublish = async (message) => {
  const queues = [
    'queue-1.fifo',
    'queue-2.fifo',
    'queue-3.fifo',
    'queue-4.fifo',
    'queue-5.fifo'
  ];
  
  // Round-robin load balancing
  const queueIndex = Math.floor(Math.random() * queues.length);
  const queueUrl = queues[queueIndex];
  
  const publisher = sqs.createPublisher(queueUrl, {
    messageGroupId: 'load-balanced'
  });
  
  return await publisher.publish(message);
};
```

### 3. Auto-scaling

```javascript
// Auto-scaling based on metrics
const autoScale = () => {
  const metrics = sqs.getMetrics();
  
  // Scale up if throughput is high
  if (metrics.system.throughput > 1000) {
    console.log('High throughput detected - scaling up');
    // Add more consumer instances
    addConsumerInstances(2);
  }
  
  // Scale down if throughput is low
  if (metrics.system.throughput < 100) {
    console.log('Low throughput detected - scaling down');
    // Remove consumer instances
    removeConsumerInstances(1);
  }
};

// Check scaling every minute
setInterval(autoScale, 60000);
```

---

## Monitoring & Profiling

### 1. Performance Profiling

```javascript
// Profile message processing
const profileMessageProcessing = async (message) => {
  const startTime = process.hrtime.bigint();
  
  try {
    await processMessage(message);
    
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    console.log(`Message processed in ${processingTime.toFixed(2)}ms`);
    
    // Alert if processing time is too high
    if (processingTime > 1000) {
      console.warn(`Slow message processing: ${processingTime.toFixed(2)}ms`);
    }
    
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000000;
    
    console.error(`Message processing failed after ${processingTime.toFixed(2)}ms:`, error.message);
    throw error;
  }
};
```

### 2. Throughput Monitoring

```javascript
// Monitor throughput in real-time
const monitorThroughput = () => {
  let messageCount = 0;
  let startTime = Date.now();
  
  const consumer = sqs.createConsumer('monitored-queue', {
    processingMode: 'parallel',
    batchSize: 10
  });
  
  consumer.start(async (message, context) => {
    messageCount++;
    
    // Calculate throughput every 10 seconds
    if (messageCount % 100 === 0) {
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime) / 1000; // seconds
      const throughput = messageCount / elapsedTime;
      
      console.log(`Current throughput: ${throughput.toFixed(2)} messages/second`);
      
      // Reset counters
      messageCount = 0;
      startTime = currentTime;
    }
    
    await processMessage(message);
  });
};
```

### 3. Performance Dashboard

```javascript
// Create performance dashboard
const createPerformanceDashboard = () => {
  const dashboard = {
    metrics: {},
    alerts: [],
    recommendations: []
  };
  
  const updateDashboard = () => {
    const metrics = sqs.getMetrics();
    
    dashboard.metrics = {
      throughput: metrics.system.throughput,
      successRate: metrics.system.successRate,
      averageProcessingTime: metrics.system.averageProcessingTime,
      circuitBreakerState: metrics.circuitBreaker.state,
      activeConsumers: metrics.components.activeConsumers
    };
    
    // Generate alerts
    if (metrics.system.throughput < 100) {
      dashboard.alerts.push('Low throughput detected');
    }
    
    if (metrics.system.successRate < 99) {
      dashboard.alerts.push('Low success rate detected');
    }
    
    if (metrics.circuitBreaker.state === 'OPEN') {
      dashboard.alerts.push('Circuit breaker is open');
    }
    
    // Generate recommendations
    if (metrics.system.averageProcessingTime > 500) {
      dashboard.recommendations.push('Consider optimizing message processing');
    }
    
    if (metrics.system.throughput > 1000) {
      dashboard.recommendations.push('Consider scaling up consumers');
    }
    
    console.log('=== Performance Dashboard ===');
    console.log('Metrics:', dashboard.metrics);
    console.log('Alerts:', dashboard.alerts);
    console.log('Recommendations:', dashboard.recommendations);
  };
  
  // Update dashboard every 30 seconds
  setInterval(updateDashboard, 30000);
  
  return dashboard;
};
```

---

## Performance Testing

### 1. Load Testing

```javascript
// Load test implementation
const loadTest = async (messageCount, duration) => {
  console.log(`Starting load test: ${messageCount} messages over ${duration}ms`);
  
  const startTime = Date.now();
  const endTime = startTime + duration;
  let messagesSent = 0;
  let messagesProcessed = 0;
  let errors = 0;
  
  // Create test consumer
  const testConsumer = sqs.createConsumer('load-test-queue', {
    processingMode: 'parallel',
    batchSize: 20,
    maxMessages: 20
  });
  
  testConsumer.start(async (message, context) => {
    messagesProcessed++;
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  });
  
  // Send messages
  const sendMessages = async () => {
    while (Date.now() < endTime && messagesSent < messageCount) {
      try {
        await publisher.publish({
          id: messagesSent,
          data: `test-message-${messagesSent}`,
          timestamp: new Date().toISOString()
        });
        
        messagesSent++;
      } catch (error) {
        errors++;
        console.error('Send error:', error.message);
      }
    }
  };
  
  // Start sending messages
  await sendMessages();
  
  // Wait for processing to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const totalTime = Date.now() - startTime;
  const throughput = (messagesProcessed / totalTime) * 1000;
  const successRate = ((messagesSent - errors) / messagesSent) * 100;
  
  console.log('=== Load Test Results ===');
  console.log(`Messages sent: ${messagesSent}`);
  console.log(`Messages processed: ${messagesProcessed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  
  return {
    messagesSent,
    messagesProcessed,
    errors,
    totalTime,
    throughput,
    successRate
  };
};

// Run load test
loadTest(1000, 60000).then(results => {
  console.log('Load test completed:', results);
});
```

### 2. Stress Testing

```javascript
// Stress test implementation
const stressTest = async (maxMessages) => {
  console.log(`Starting stress test: up to ${maxMessages} messages`);
  
  let messagesSent = 0;
  let errors = 0;
  const startTime = Date.now();
  
  // Send messages as fast as possible
  const sendMessages = async () => {
    const promises = [];
    
    for (let i = 0; i < maxMessages; i++) {
      promises.push(
        publisher.publish({
          id: i,
          data: `stress-test-message-${i}`,
          timestamp: new Date().toISOString()
        }).catch(error => {
          errors++;
          console.error(`Message ${i} failed:`, error.message);
        })
      );
      
      messagesSent++;
    }
    
    await Promise.allSettled(promises);
  };
  
  await sendMessages();
  
  const totalTime = Date.now() - startTime;
  const throughput = (messagesSent / totalTime) * 1000;
  const successRate = ((messagesSent - errors) / messagesSent) * 100;
  
  console.log('=== Stress Test Results ===');
  console.log(`Messages sent: ${messagesSent}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  
  return {
    messagesSent,
    errors,
    totalTime,
    throughput,
    successRate
  };
};
```

### 3. Performance Benchmarking

```javascript
// Performance benchmark
const benchmark = async () => {
  const benchmarks = [];
  
  // Test different batch sizes
  const batchSizes = [1, 5, 10, 20, 50];
  
  for (const batchSize of batchSizes) {
    console.log(`Benchmarking batch size: ${batchSize}`);
    
    const consumer = sqs.createConsumer('benchmark-queue', {
      processingMode: 'parallel',
      batchSize: batchSize
    });
    
    const startTime = Date.now();
    let messagesProcessed = 0;
    
    consumer.start(async (message, context) => {
      messagesProcessed++;
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing
    });
    
    // Send test messages
    for (let i = 0; i < 100; i++) {
      await publisher.publish({
        id: i,
        data: `benchmark-message-${i}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const throughput = (messagesProcessed / totalTime) * 1000;
    
    benchmarks.push({
      batchSize,
      messagesProcessed,
      totalTime,
      throughput
    });
    
    console.log(`Batch size ${batchSize}: ${throughput.toFixed(2)} messages/second`);
  }
  
  // Find optimal batch size
  const optimal = benchmarks.reduce((best, current) => 
    current.throughput > best.throughput ? current : best
  );
  
  console.log('=== Benchmark Results ===');
  console.log(`Optimal batch size: ${optimal.batchSize}`);
  console.log(`Optimal throughput: ${optimal.throughput.toFixed(2)} messages/second`);
  
  return benchmarks;
};
```

---

## Troubleshooting

### 1. Common Performance Issues

```javascript
// Diagnose performance issues
const diagnosePerformance = () => {
  const metrics = sqs.getMetrics();
  
  console.log('=== Performance Diagnosis ===');
  
  // Check throughput
  if (metrics.system.throughput < 100) {
    console.warn('⚠️  Low throughput detected');
    console.log('Recommendations:');
    console.log('- Increase batch size');
    console.log('- Use parallel processing');
    console.log('- Check network connectivity');
  }
  
  // Check success rate
  if (metrics.system.successRate < 99) {
    console.warn('⚠️  Low success rate detected');
    console.log('Recommendations:');
    console.log('- Check error handling');
    console.log('- Review message format');
    console.log('- Check AWS credentials');
  }
  
  // Check processing time
  if (metrics.system.averageProcessingTime > 1000) {
    console.warn('⚠️  High processing time detected');
    console.log('Recommendations:');
    console.log('- Optimize message processing logic');
    console.log('- Check database performance');
    console.log('- Review external API calls');
  }
  
  // Check circuit breaker
  if (metrics.circuitBreaker.state === 'OPEN') {
    console.error('❌ Circuit breaker is open');
    console.log('Recommendations:');
    console.log('- Check AWS SQS service status');
    console.log('- Review error logs');
    console.log('- Check network connectivity');
  }
};
```

### 2. Performance Optimization Checklist

```javascript
// Performance optimization checklist
const performanceChecklist = () => {
  const checklist = [
    '✅ Use appropriate batch sizes',
    '✅ Enable parallel processing for high throughput',
    '✅ Use sequential processing for critical operations',
    '✅ Configure proper visibility timeouts',
    '✅ Implement circuit breaker patterns',
    '✅ Monitor memory usage',
    '✅ Use long polling',
    '✅ Optimize message sizes',
    '✅ Implement proper error handling',
    '✅ Use appropriate retry strategies'
  ];
  
  console.log('=== Performance Optimization Checklist ===');
  checklist.forEach(item => console.log(item));
};
```

### 3. Performance Monitoring Alerts

```javascript
// Set up performance monitoring alerts
const setupPerformanceAlerts = () => {
  setInterval(() => {
    const metrics = sqs.getMetrics();
    
    // Throughput alert
    if (metrics.system.throughput < 100) {
      console.warn('🚨 ALERT: Low throughput detected');
      // Send alert notification
    }
    
    // Success rate alert
    if (metrics.system.successRate < 99) {
      console.warn('🚨 ALERT: Low success rate detected');
      // Send alert notification
    }
    
    // Processing time alert
    if (metrics.system.averageProcessingTime > 1000) {
      console.warn('🚨 ALERT: High processing time detected');
      // Send alert notification
    }
    
    // Circuit breaker alert
    if (metrics.circuitBreaker.state === 'OPEN') {
      console.error('🚨 ALERT: Circuit breaker is open');
      // Send critical alert
    }
  }, 30000); // Check every 30 seconds
};
```

---

## 🎯 Summary

Following this performance guide will ensure:

- **High Throughput** - Optimized batch processing and parallel execution
- **Low Latency** - Fast message processing and minimal delays
- **Efficient Memory Usage** - Proper memory management and cleanup
- **Scalable Architecture** - Horizontal scaling and load balancing
- **Comprehensive Monitoring** - Real-time performance tracking
- **Proactive Optimization** - Performance testing and benchmarking

**Ready to optimize?** Check out our [Best Practices](best-practices.md) guide for production deployment!
