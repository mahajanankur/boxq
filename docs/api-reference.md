# API Reference

Complete API documentation for Enterprise SQS. 📚

## Table of Contents

- [EnterpriseSQS](#enterprisesqs)
- [MessagePublisher](#messagepublisher)
- [BatchPublisher](#batchpublisher)
- [MessageConsumer](#messageconsumer)
- [HealthMonitor](#healthmonitor)
- [CircuitBreaker](#circuitbreaker)
- [RetryManager](#retrymanager)
- [Types & Enums](#types--enums)

---

## EnterpriseSQS

The main class for Enterprise SQS operations.

### Constructor

```javascript
new EnterpriseSQS(config)
```

**Parameters:**
- `config` (Object) - Configuration object
  - `region` (string) - AWS region
  - `credentials` (Object) - AWS credentials
  - `circuitBreaker` (Object) - Circuit breaker configuration
  - `retry` (Object) - Retry configuration
  - `logging` (Object) - Logging configuration

**Example:**
```javascript
const sqs = new EnterpriseSQS({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key'
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
```

### Methods

#### createPublisher(queueUrl, options)

Creates a message publisher for a specific queue.

**Parameters:**
- `queueUrl` (string) - Queue URL
- `options` (Object) - Publisher options
  - `messageGroupId` (string) - Default message group ID
  - `enableDeduplication` (boolean) - Enable content-based deduplication
  - `deduplicationStrategy` (string) - Deduplication strategy

**Returns:** `MessagePublisher` instance

**Example:**
```javascript
const publisher = sqs.createPublisher('my-queue.fifo', {
  messageGroupId: 'group-1',
  enableDeduplication: true
});
```

#### createBatchPublisher(queueUrl, options)

Creates a batch publisher for a specific queue.

**Parameters:**
- `queueUrl` (string) - Queue URL
- `options` (Object) - Batch publisher options
  - `messageGroupId` (string) - Default message group ID
  - `enableDeduplication` (boolean) - Enable content-based deduplication
  - `batchSize` (number) - Batch size

**Returns:** `BatchPublisher` instance

**Example:**
```javascript
const batchPublisher = sqs.createBatchPublisher('my-queue.fifo', {
  messageGroupId: 'group-1',
  batchSize: 10
});
```

#### createConsumer(queueUrl, options)

Creates a message consumer for a specific queue.

**Parameters:**
- `queueUrl` (string) - Queue URL
- `options` (Object) - Consumer options
  - `processingMode` (string) - Processing mode ('parallel' or 'sequential')
  - `batchSize` (number) - Batch size for parallel processing
  - `throttleDelayMs` (number) - Throttle delay between batches
  - `maxMessages` (number) - Maximum messages to receive
  - `waitTimeSeconds` (number) - Long polling wait time
  - `visibilityTimeoutSeconds` (number) - Message visibility timeout
  - `autoStart` (boolean) - Start consuming immediately
  - `pollingInterval` (number) - Polling interval

**Returns:** `MessageConsumer` instance

**Example:**
```javascript
const consumer = sqs.createConsumer('my-queue.fifo', {
  processingMode: 'parallel',
  batchSize: 5
});
```

#### getHealthStatus()

Gets the health status of the SQS system.

**Returns:** `Promise<Object>` - Health status object

**Example:**
```javascript
const health = await sqs.getHealthStatus();
console.log('Status:', health.status);
console.log('Uptime:', health.uptime);
```

#### getMetrics()

Gets comprehensive metrics for the SQS system.

**Returns:** `Object` - Metrics object

**Example:**
```javascript
const metrics = sqs.getMetrics();
console.log('Messages processed:', metrics.system.totalMessages);
console.log('Success rate:', metrics.system.successRate);
```

#### resetMetrics()

Resets all system metrics.

**Example:**
```javascript
sqs.resetMetrics();
```

#### stopAllConsumers()

Stops all registered consumers.

**Example:**
```javascript
sqs.stopAllConsumers();
```

---

## MessagePublisher

Handles single message publishing to SQS queues.

### Methods

#### publish(messageBody, options)

Publishes a single message to the queue.

**Parameters:**
- `messageBody` (Object) - Message body
- `options` (Object) - Publishing options
  - `messageGroupId` (string) - Message group ID for FIFO queues
  - `messageDeduplicationId` (string) - Custom deduplication ID
  - `delaySeconds` (number) - Delay in seconds before message becomes available
  - `messageAttributes` (Object) - Additional message attributes

**Returns:** `Promise<Object>` - Publishing result

**Example:**
```javascript
const result = await publisher.publish({
  type: 'user-registration',
  userId: 12345,
  data: { name: 'John Doe' }
}, {
  messageGroupId: 'user-events',
  messageAttributes: {
    priority: 'high',
    source: 'web-app'
  }
});

if (result.success) {
  console.log('Message published:', result.messageId);
} else {
  console.error('Publishing failed:', result.error);
}
```

#### publishBatch(messages, options)

Publishes multiple messages in batch.

**Parameters:**
- `messages` (Array) - Array of message objects
- `options` (Object) - Batch options
  - `batchSize` (number) - Batch size for processing

**Returns:** `Promise<Array>` - Array of publishing results

**Example:**
```javascript
const messages = [
  { body: { type: 'event1' }, options: {} },
  { body: { type: 'event2' }, options: {} }
];

const results = await publisher.publishBatch(messages);
```

#### getQueueUrl()

Gets the queue URL.

**Returns:** `string` - Queue URL

#### getConfig()

Gets the publisher configuration.

**Returns:** `Object` - Publisher configuration

---

## BatchPublisher

Handles batch message publishing to SQS queues.

### Methods

#### publishBatch(messages, options)

Publishes multiple messages in optimized batches.

**Parameters:**
- `messages` (Array) - Array of message objects
- `options` (Object) - Batch options
  - `batchSize` (number) - Override default batch size
  - `continueOnError` (boolean) - Continue processing on errors

**Returns:** `Promise<Object>` - Batch publishing results

**Example:**
```javascript
const messages = [
  { body: { type: 'event1' }, options: {} },
  { body: { type: 'event2' }, options: {} }
];

const result = await batchPublisher.publishBatch(messages, {
  batchSize: 10,
  continueOnError: true
});

console.log('Total messages:', result.totalMessages);
console.log('Successful:', result.successfulMessages);
console.log('Failed:', result.failedMessages);
```

#### getQueueUrl()

Gets the queue URL.

**Returns:** `string` - Queue URL

#### getConfig()

Gets the batch publisher configuration.

**Returns:** `Object` - Batch publisher configuration

---

## MessageConsumer

Handles message consumption from SQS queues.

### Methods

#### start(messageHandler, options)

Starts consuming messages from the queue.

**Parameters:**
- `messageHandler` (Function) - Message handler function
- `options` (Object) - Additional options

**Example:**
```javascript
consumer.start(async (message, context) => {
  console.log('Processing message:', message);
  console.log('Message ID:', context.messageId);
  console.log('Group ID:', context.messageGroupId);
  
  // Process message
  await processMessage(message);
});
```

#### stop()

Stops consuming messages.

**Example:**
```javascript
consumer.stop();
```

#### getProcessingMode()

Gets the current processing mode.

**Returns:** `string` - Processing mode

#### setProcessingMode(mode)

Sets the processing mode.

**Parameters:**
- `mode` (string) - Processing mode ('parallel' or 'sequential')

#### getStats()

Gets processing statistics.

**Returns:** `Object` - Processing statistics

**Example:**
```javascript
const stats = consumer.getStats();
console.log('Total processed:', stats.totalProcessed);
console.log('Total failed:', stats.totalFailed);
console.log('Average processing time:', stats.averageProcessingTime);
```

#### resetStats()

Resets processing statistics.

#### getConfig()

Gets the consumer configuration.

**Returns:** `Object` - Consumer configuration

#### updateConfig(config)

Updates the consumer configuration.

**Parameters:**
- `config` (Object) - New configuration

#### isConsumerRunning()

Checks if the consumer is running.

**Returns:** `boolean` - True if consumer is running

---

## HealthMonitor

Handles health monitoring and metrics collection.

### Methods

#### recordSuccess(processingTime)

Records a successful message processing.

**Parameters:**
- `processingTime` (number) - Processing time in milliseconds

#### recordFailure(error)

Records a failed message processing.

**Parameters:**
- `error` (string) - Error message

#### updateCircuitBreakerState(state)

Updates circuit breaker state.

**Parameters:**
- `state` (string) - Circuit breaker state

#### registerHealthCheck(name, checkFn)

Registers a health check function.

**Parameters:**
- `name` (string) - Health check name
- `checkFn` (Function) - Health check function

#### unregisterHealthCheck(name)

Removes a health check function.

**Parameters:**
- `name` (string) - Health check name

#### performHealthChecks()

Performs all registered health checks.

**Returns:** `Promise<Object>` - Health check results

#### getHealthStatus()

Gets current health status.

**Returns:** `Object` - Health status

#### getMetrics()

Gets detailed metrics.

**Returns:** `Object` - Metrics object

#### clearMetrics()

Clears all metrics.

#### getAlerts()

Gets alerts.

**Returns:** `Array` - Array of alerts

#### clearAlerts()

Clears alerts.

---

## CircuitBreaker

Handles circuit breaker functionality.

### Methods

#### canExecute()

Checks if the circuit breaker allows execution.

**Returns:** `boolean` - True if execution is allowed

#### recordSuccess()

Records a successful operation.

#### recordFailure()

Records a failed operation.

#### reset()

Resets the circuit breaker to closed state.

#### getState()

Gets the current circuit breaker state.

**Returns:** `string` - Current state

#### getFailureCount()

Gets the current failure count.

**Returns:** `number` - Failure count

#### getSuccessCount()

Gets the current success count.

**Returns:** `number` - Success count

#### getTimeSinceLastFailure()

Gets the time since last failure.

**Returns:** `number` - Time in milliseconds

#### getStatus()

Gets comprehensive circuit breaker status.

**Returns:** `Object` - Circuit breaker status

---

## RetryManager

Handles retry logic with exponential backoff.

### Methods

#### calculateDelay(attempt)

Calculates the delay for a given attempt.

**Parameters:**
- `attempt` (number) - Current attempt number

**Returns:** `number` - Delay in milliseconds

#### sleep(ms)

Sleeps for the specified number of milliseconds.

**Parameters:**
- `ms` (number) - Milliseconds to sleep

**Returns:** `Promise<void>` - Promise that resolves after the delay

#### executeWithRetry(fn, options)

Executes a function with retry logic.

**Parameters:**
- `fn` (Function) - Function to execute
- `options` (Object) - Retry options
  - `shouldRetry` (Function) - Function to determine if error should be retried
  - `onRetry` (Function) - Callback called before each retry
  - `onFailure` (Function) - Callback called when all retries are exhausted

**Returns:** `Promise<any>` - Result of the function execution

#### executeWithRetryDetailed(fn, options)

Executes a function with retry logic and returns detailed results.

**Parameters:**
- `fn` (Function) - Function to execute
- `options` (Object) - Retry options

**Returns:** `Promise<Object>` - Detailed execution results

#### getConfig()

Gets the retry configuration.

**Returns:** `Object` - Retry configuration

#### updateConfig(config)

Updates the retry configuration.

**Parameters:**
- `config` (Object) - New retry configuration

---

## Types & Enums

### ProcessingMode

```javascript
const { ProcessingMode } = require('enterprise-sqs');

ProcessingMode.SEQUENTIAL // 'sequential'
ProcessingMode.PARALLEL   // 'parallel'
```

### HealthStatus

```javascript
const { HealthStatus } = require('enterprise-sqs');

HealthStatus.HEALTHY   // 'healthy'
HealthStatus.UNHEALTHY // 'unhealthy'
HealthStatus.DEGRADED // 'degraded'
```

### CircuitBreakerState

```javascript
const { CircuitBreakerState } = require('enterprise-sqs');

CircuitBreakerState.CLOSED    // 'CLOSED'
CircuitBreakerState.OPEN      // 'OPEN'
CircuitBreakerState.HALF_OPEN // 'HALF_OPEN'
```

### LogLevel

```javascript
const { LogLevel } = require('enterprise-sqs');

LogLevel.DEBUG // 'debug'
LogLevel.INFO  // 'info'
LogLevel.WARN  // 'warn'
LogLevel.ERROR // 'error'
```

---

## Error Handling

Enterprise SQS provides comprehensive error handling:

### Common Errors

- **Circuit Breaker Open** - Circuit breaker is preventing execution
- **Retry Exhausted** - All retry attempts have been exhausted
- **Invalid Configuration** - Invalid configuration parameters
- **AWS Errors** - AWS SQS service errors
- **Network Errors** - Network connectivity issues

### Error Response Format

```javascript
{
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE',
  timestamp: '2024-01-01T00:00:00.000Z',
  details: {
    // Additional error details
  }
}
```

### Error Handling Best Practices

```javascript
try {
  const result = await publisher.publish(message);
  
  if (result.success) {
    console.log('Message published:', result.messageId);
  } else {
    console.error('Publishing failed:', result.error);
    // Handle publishing failure
  }
} catch (error) {
  console.error('Unexpected error:', error.message);
  // Handle unexpected errors
}
```

---

## Performance Considerations

### Throughput Optimization

- Use **parallel processing** for high-throughput scenarios
- Configure appropriate **batch sizes** for your workload
- Implement **throttling** to prevent overwhelming downstream services
- Monitor **circuit breaker** status to detect issues early

### Memory Management

- Clear metrics periodically to prevent memory leaks
- Use appropriate **polling intervals** to balance performance and resource usage
- Monitor **message visibility timeouts** to prevent message loss

### Monitoring

- Implement **health checks** for all critical components
- Monitor **circuit breaker** status and failure rates
- Track **processing statistics** to identify bottlenecks
- Set up **alerting** for critical failures

---

**Need more details?** Check out our [Examples & Tutorials](examples.md) for real-world usage patterns!
