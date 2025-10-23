# Examples & Tutorials

Real-world examples and tutorials for BoxQ. 🎯

## 📚 Table of Contents

- [E-commerce Order Processing](#e-commerce-order-processing)
- [Event-Driven Microservices](#event-driven-microservices)
- [Real-time Data Pipeline](#real-time-data-pipeline)
- [High-Volume Analytics](#high-volume-analytics)
- [Multi-Tenant SaaS Platform](#multi-tenant-saas-platform)
- [IoT Data Processing](#iot-data-processing)
- [Financial Transactions](#financial-transactions)
- [Content Management System](#content-management-system)

---

## E-commerce Order Processing

Complete order processing system with inventory management and payment processing.

### 1. Order Creation Flow

```javascript
const { BoxQ } = require('boxq');

// Initialize SQS
const sqs = new BoxQ({
  region: 'us-east-1',
  credentials: { accessKeyId: '...', secretAccessKey: '...' }
});

// Order processing publisher
const orderPublisher = sqs.createPublisher('orders.fifo', {
  messageGroupId: 'order-processing',
  enableDeduplication: true
});

// Create order
const createOrder = async (orderData) => {
  const order = {
    orderId: generateOrderId(),
    customerId: orderData.customerId,
    items: orderData.items,
    totalAmount: orderData.totalAmount,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  // Publish order creation event
  const result = await orderPublisher.publish({
    type: 'order-created',
    orderId: order.orderId,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
    status: order.status,
    timestamp: order.timestamp
  }, {
    messageGroupId: `customer-${order.customerId}`,
    messageAttributes: {
      priority: order.totalAmount > 1000 ? 'high' : 'normal',
      orderType: 'standard'
    }
  });
  
  if (result.success) {
    console.log(`Order ${order.orderId} created successfully`);
    return order;
  } else {
    throw new Error(`Failed to create order: ${result.error}`);
  }
};
```

### 2. Order Processing Consumer

```javascript
// Order processing consumer
const orderConsumer = sqs.createConsumer('orders.fifo', {
  processingMode: 'sequential', // Sequential for order integrity
  batchSize: 1,
  maxMessages: 1,
  waitTimeSeconds: 20,
  visibilityTimeoutSeconds: 300 // 5 minutes for complex processing
});

orderConsumer.start(async (message, context) => {
  console.log(`Processing order ${message.orderId} for customer ${message.customerId}`);
  
  try {
    // Step 1: Validate inventory
    await validateInventory(message.items);
    
    // Step 2: Reserve inventory
    await reserveInventory(message.items);
    
    // Step 3: Process payment
    const paymentResult = await processPayment(message.customerId, message.totalAmount);
    
    if (paymentResult.success) {
      // Step 4: Update order status
      await updateOrderStatus(message.orderId, 'confirmed');
      
      // Step 5: Send confirmation email
      await sendOrderConfirmation(message.customerId, message.orderId);
      
      console.log(`Order ${message.orderId} processed successfully`);
    } else {
      // Step 6: Handle payment failure
      await handlePaymentFailure(message.orderId, paymentResult.error);
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }
    
  } catch (error) {
    console.error(`Order processing failed for ${message.orderId}:`, error.message);
    
    // Rollback inventory reservation
    await rollbackInventoryReservation(message.items);
    
    // Update order status
    await updateOrderStatus(message.orderId, 'failed');
    
    // Send failure notification
    await sendOrderFailureNotification(message.customerId, message.orderId, error.message);
    
    throw error; // Re-throw to trigger SQS retry
  }
});
```

### 3. Inventory Management

```javascript
// Inventory management consumer
const inventoryConsumer = sqs.createConsumer('inventory-events.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

inventoryConsumer.start(async (message, context) => {
  switch (message.type) {
    case 'inventory-reserved':
      await updateInventoryLevels(message.items, 'reserved');
      break;
      
    case 'inventory-released':
      await updateInventoryLevels(message.items, 'available');
      break;
      
    case 'inventory-sold':
      await updateInventoryLevels(message.items, 'sold');
      break;
      
    default:
      console.warn('Unknown inventory event type:', message.type);
  }
});
```

---

## Event-Driven Microservices

Microservices communication using BoxQ for event-driven architecture.

### 1. User Service Events

```javascript
// User service publisher
const userServicePublisher = sqs.createPublisher('user-events.fifo', {
  messageGroupId: 'user-service',
  enableDeduplication: true
});

// User registration
const registerUser = async (userData) => {
  const user = {
    userId: generateUserId(),
    email: userData.email,
    name: userData.name,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
  
  // Publish user registration event
  await userServicePublisher.publish({
    type: 'user-registered',
    userId: user.userId,
    email: user.email,
    name: user.name,
    status: user.status,
    timestamp: user.timestamp
  }, {
    messageGroupId: `user-${user.userId}`,
    messageAttributes: {
      service: 'user-service',
      eventType: 'user-lifecycle'
    }
  });
  
  return user;
};
```

### 2. Notification Service Consumer

```javascript
// Notification service consumer
const notificationConsumer = sqs.createConsumer('user-events.fifo', {
  processingMode: 'parallel',
  batchSize: 5,
  throttleDelayMs: 100
});

notificationConsumer.start(async (message, context) => {
  console.log(`Processing notification for user ${message.userId}`);
  
  switch (message.type) {
    case 'user-registered':
      await sendWelcomeEmail(message.email, message.name);
      await sendWelcomeSMS(message.phone);
      break;
      
    case 'user-verified':
      await sendVerificationConfirmation(message.email);
      break;
      
    case 'user-login':
      await sendLoginNotification(message.email, message.ipAddress);
      break;
      
    default:
      console.warn('Unknown user event type:', message.type);
  }
});
```

### 3. Analytics Service Consumer

```javascript
// Analytics service consumer
const analyticsConsumer = sqs.createConsumer('user-events.fifo', {
  processingMode: 'parallel',
  batchSize: 10,
  throttleDelayMs: 50
});

analyticsConsumer.start(async (message, context) => {
  // Track user events for analytics
  await trackUserEvent({
    userId: message.userId,
    eventType: message.type,
    timestamp: message.timestamp,
    metadata: {
      messageId: context.messageId,
      groupId: context.messageGroupId
    }
  });
  
  // Update user metrics
  await updateUserMetrics(message.userId, message.type);
  
  // Send to data warehouse
  await sendToDataWarehouse(message);
});
```

---

## Real-time Data Pipeline

High-throughput data processing pipeline for real-time analytics.

### 1. Data Ingestion

```javascript
// Data ingestion publisher
const dataPublisher = sqs.createBatchPublisher('data-pipeline.fifo', {
  messageGroupId: 'data-ingestion',
  batchSize: 100,
  enableDeduplication: true
});

// Ingest data from multiple sources
const ingestData = async (dataSource, records) => {
  const messages = records.map(record => ({
    body: {
      type: 'data-record',
      source: dataSource,
      recordId: record.id,
      data: record.data,
      timestamp: record.timestamp,
      metadata: {
        source: dataSource,
        version: '1.0'
      }
    },
    options: {
      messageGroupId: `source-${dataSource}`,
      messageAttributes: {
        dataSource: dataSource,
        recordType: record.type,
        priority: record.priority || 'normal'
      }
    }
  }));
  
  const result = await dataPublisher.publishBatch(messages, {
    batchSize: 50,
    continueOnError: true
  });
  
  console.log(`Ingested ${result.successfulMessages} records from ${dataSource}`);
  return result;
};
```

### 2. Data Processing Consumer

```javascript
// Data processing consumer
const dataConsumer = sqs.createConsumer('data-pipeline.fifo', {
  processingMode: 'parallel',
  batchSize: 20,
  throttleDelayMs: 10,
  maxMessages: 20
});

dataConsumer.start(async (message, context) => {
  console.log(`Processing data record ${message.recordId} from ${message.source}`);
  
  try {
    // Step 1: Validate data
    await validateDataRecord(message.data);
    
    // Step 2: Transform data
    const transformedData = await transformData(message.data, message.source);
    
    // Step 3: Enrich data
    const enrichedData = await enrichData(transformedData);
    
    // Step 4: Store in database
    await storeDataRecord(enrichedData);
    
    // Step 5: Update metrics
    await updateProcessingMetrics(message.source, message.recordId);
    
    console.log(`Data record ${message.recordId} processed successfully`);
    
  } catch (error) {
    console.error(`Data processing failed for record ${message.recordId}:`, error.message);
    
    // Send to dead letter queue
    await sendToDeadLetterQueue(message, error);
    
    throw error;
  }
});
```

### 3. Real-time Analytics

```javascript
// Analytics consumer
const analyticsConsumer = sqs.createConsumer('analytics-events.fifo', {
  processingMode: 'parallel',
  batchSize: 15,
  throttleDelayMs: 5
});

analyticsConsumer.start(async (message, context) => {
  // Process analytics events
  await processAnalyticsEvent({
    eventType: message.type,
    userId: message.userId,
    timestamp: message.timestamp,
    data: message.data
  });
  
  // Update real-time dashboards
  await updateRealTimeDashboard(message);
  
  // Trigger alerts if needed
  await checkAndTriggerAlerts(message);
});
```

---

## High-Volume Analytics

Processing millions of events per day for analytics and reporting.

### 1. Event Collection

```javascript
// High-volume event publisher
const eventPublisher = sqs.createBatchPublisher('analytics-events.fifo', {
  messageGroupId: 'analytics-collection',
  batchSize: 1000,
  enableDeduplication: true
});

// Collect user events
const collectUserEvent = async (userId, eventType, eventData) => {
  const event = {
    type: 'user-event',
    userId: userId,
    eventType: eventType,
    data: eventData,
    timestamp: new Date().toISOString(),
    sessionId: generateSessionId(),
    metadata: {
      userAgent: eventData.userAgent,
      ipAddress: eventData.ipAddress,
      referrer: eventData.referrer
    }
  };
  
  const result = await eventPublisher.publish({
    body: event,
    options: {
      messageGroupId: `user-${userId}`,
      messageAttributes: {
        eventType: eventType,
        userId: userId.toString(),
        priority: eventType === 'purchase' ? 'high' : 'normal'
      }
    }
  });
  
  return result;
};
```

### 2. Event Processing

```javascript
// Event processing consumer
const eventConsumer = sqs.createConsumer('analytics-events.fifo', {
  processingMode: 'parallel',
  batchSize: 50,
  throttleDelayMs: 5,
  maxMessages: 50
});

eventConsumer.start(async (message, context) => {
  console.log(`Processing ${message.eventType} event for user ${message.userId}`);
  
  try {
    // Step 1: Validate event
    await validateEvent(message);
    
    // Step 2: Process event
    await processEvent(message);
    
    // Step 3: Update user profile
    await updateUserProfile(message.userId, message.eventType, message.data);
    
    // Step 4: Update analytics
    await updateAnalytics(message);
    
    // Step 5: Check for triggers
    await checkTriggers(message);
    
    console.log(`Event processed successfully for user ${message.userId}`);
    
  } catch (error) {
    console.error(`Event processing failed for user ${message.userId}:`, error.message);
    
    // Send to error queue
    await sendToErrorQueue(message, error);
    
    throw error;
  }
});
```

### 3. Analytics Aggregation

```javascript
// Analytics aggregation consumer
const aggregationConsumer = sqs.createConsumer('analytics-aggregation.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

aggregationConsumer.start(async (message, context) => {
  console.log(`Aggregating analytics for ${message.aggregationType}`);
  
  switch (message.aggregationType) {
    case 'daily-summary':
      await generateDailySummary(message.date);
      break;
      
    case 'user-segment':
      await updateUserSegment(message.segmentId);
      break;
      
    case 'revenue-report':
      await generateRevenueReport(message.period);
      break;
      
    default:
      console.warn('Unknown aggregation type:', message.aggregationType);
  }
});
```

---

## Multi-Tenant SaaS Platform

SaaS platform with tenant isolation and multi-tenant message processing.

### 1. Tenant-Aware Publishing

```javascript
// Tenant-aware publisher
const createTenantPublisher = (tenantId) => {
  return sqs.createPublisher(`tenant-${tenantId}-events.fifo`, {
    messageGroupId: `tenant-${tenantId}`,
    enableDeduplication: true
  });
};

// Publish tenant event
const publishTenantEvent = async (tenantId, eventType, eventData) => {
  const publisher = createTenantPublisher(tenantId);
  
  const result = await publisher.publish({
    type: eventType,
    tenantId: tenantId,
    data: eventData,
    timestamp: new Date().toISOString()
  }, {
    messageGroupId: `tenant-${tenantId}`,
    messageAttributes: {
      tenantId: tenantId,
      eventType: eventType,
      priority: eventData.priority || 'normal'
    }
  });
  
  return result;
};
```

### 2. Tenant-Specific Consumer

```javascript
// Tenant-specific consumer
const createTenantConsumer = (tenantId) => {
  return sqs.createConsumer(`tenant-${tenantId}-events.fifo`, {
    processingMode: 'sequential',
    batchSize: 1,
    maxMessages: 1
  });
};

// Process tenant events
const processTenantEvents = (tenantId) => {
  const consumer = createTenantConsumer(tenantId);
  
  consumer.start(async (message, context) => {
    console.log(`Processing event for tenant ${tenantId}: ${message.type}`);
    
    try {
      // Load tenant configuration
      const tenantConfig = await loadTenantConfig(tenantId);
      
      // Process event based on tenant configuration
      await processEventForTenant(message, tenantConfig);
      
      console.log(`Event processed for tenant ${tenantId}`);
      
    } catch (error) {
      console.error(`Event processing failed for tenant ${tenantId}:`, error.message);
      throw error;
    }
  });
  
  return consumer;
};
```

### 3. Multi-Tenant Analytics

```javascript
// Multi-tenant analytics consumer
const analyticsConsumer = sqs.createConsumer('tenant-analytics.fifo', {
  processingMode: 'parallel',
  batchSize: 10,
  throttleDelayMs: 100
});

analyticsConsumer.start(async (message, context) => {
  console.log(`Processing analytics for tenant ${message.tenantId}`);
  
  try {
    // Process tenant-specific analytics
    await processTenantAnalytics({
      tenantId: message.tenantId,
      eventType: message.type,
      data: message.data,
      timestamp: message.timestamp
    });
    
    // Update tenant metrics
    await updateTenantMetrics(message.tenantId, message.type);
    
    // Check tenant limits
    await checkTenantLimits(message.tenantId);
    
  } catch (error) {
    console.error(`Analytics processing failed for tenant ${message.tenantId}:`, error.message);
    throw error;
  }
});
```

---

## IoT Data Processing

Processing IoT sensor data with real-time analytics and alerting.

### 1. IoT Data Ingestion

```javascript
// IoT data publisher
const iotPublisher = sqs.createBatchPublisher('iot-data.fifo', {
  messageGroupId: 'iot-ingestion',
  batchSize: 500,
  enableDeduplication: true
});

// Ingest IoT data
const ingestIoTData = async (deviceId, sensorData) => {
  const messages = sensorData.map(data => ({
    body: {
      type: 'sensor-data',
      deviceId: deviceId,
      sensorType: data.sensorType,
      value: data.value,
      unit: data.unit,
      timestamp: data.timestamp,
      location: data.location,
      metadata: {
        deviceId: deviceId,
        sensorType: data.sensorType,
        quality: data.quality || 'good'
      }
    },
    options: {
      messageGroupId: `device-${deviceId}`,
      messageAttributes: {
        deviceId: deviceId,
        sensorType: data.sensorType,
        priority: data.priority || 'normal'
      }
    }
  }));
  
  const result = await iotPublisher.publishBatch(messages, {
    batchSize: 100,
    continueOnError: true
  });
  
  console.log(`Ingested ${result.successfulMessages} sensor readings from device ${deviceId}`);
  return result;
};
```

### 2. IoT Data Processing

```javascript
// IoT data processing consumer
const iotConsumer = sqs.createConsumer('iot-data.fifo', {
  processingMode: 'parallel',
  batchSize: 20,
  throttleDelayMs: 10
});

iotConsumer.start(async (message, context) => {
  console.log(`Processing sensor data from device ${message.deviceId}`);
  
  try {
    // Step 1: Validate sensor data
    await validateSensorData(message);
    
    // Step 2: Process sensor reading
    await processSensorReading(message);
    
    // Step 3: Check for alerts
    await checkSensorAlerts(message);
    
    // Step 4: Update device status
    await updateDeviceStatus(message.deviceId, message.sensorType, message.value);
    
    // Step 5: Store in time series database
    await storeTimeSeriesData(message);
    
    console.log(`Sensor data processed for device ${message.deviceId}`);
    
  } catch (error) {
    console.error(`IoT data processing failed for device ${message.deviceId}:`, error.message);
    throw error;
  }
});
```

### 3. Real-time Alerting

```javascript
// Alert processing consumer
const alertConsumer = sqs.createConsumer('iot-alerts.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

alertConsumer.start(async (message, context) => {
  console.log(`Processing alert for device ${message.deviceId}`);
  
  try {
    // Send alert notification
    await sendAlertNotification({
      deviceId: message.deviceId,
      alertType: message.alertType,
      severity: message.severity,
      value: message.value,
      threshold: message.threshold,
      timestamp: message.timestamp
    });
    
    // Update alert history
    await updateAlertHistory(message);
    
    // Trigger automated responses
    await triggerAutomatedResponse(message);
    
    console.log(`Alert processed for device ${message.deviceId}`);
    
  } catch (error) {
    console.error(`Alert processing failed for device ${message.deviceId}:`, error.message);
    throw error;
  }
});
```

---

## Financial Transactions

High-security financial transaction processing with audit trails.

### 1. Transaction Publishing

```javascript
// Financial transaction publisher
const transactionPublisher = sqs.createPublisher('financial-transactions.fifo', {
  messageGroupId: 'transaction-processing',
  enableDeduplication: true
});

// Create financial transaction
const createTransaction = async (transactionData) => {
  const transaction = {
    transactionId: generateTransactionId(),
    fromAccount: transactionData.fromAccount,
    toAccount: transactionData.toAccount,
    amount: transactionData.amount,
    currency: transactionData.currency,
    type: transactionData.type,
    status: 'pending',
    timestamp: new Date().toISOString(),
    metadata: {
      userId: transactionData.userId,
      sessionId: transactionData.sessionId,
      ipAddress: transactionData.ipAddress
    }
  };
  
  const result = await transactionPublisher.publish(transaction, {
    messageGroupId: `account-${transaction.fromAccount}`,
    messageAttributes: {
      transactionType: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      priority: transaction.amount > 10000 ? 'high' : 'normal'
    }
  });
  
  if (result.success) {
    console.log(`Transaction ${transaction.transactionId} created successfully`);
    return transaction;
  } else {
    throw new Error(`Failed to create transaction: ${result.error}`);
  }
};
```

### 2. Transaction Processing

```javascript
// Transaction processing consumer
const transactionConsumer = sqs.createConsumer('financial-transactions.fifo', {
  processingMode: 'sequential', // Sequential for financial integrity
  batchSize: 1,
  maxMessages: 1,
  visibilityTimeoutSeconds: 600 // 10 minutes for complex processing
});

transactionConsumer.start(async (message, context) => {
  console.log(`Processing transaction ${message.transactionId}`);
  
  try {
    // Step 1: Validate transaction
    await validateTransaction(message);
    
    // Step 2: Check account balances
    await checkAccountBalances(message.fromAccount, message.amount);
    
    // Step 3: Perform fraud detection
    const fraudCheck = await performFraudDetection(message);
    if (!fraudCheck.passed) {
      throw new Error(`Fraud detection failed: ${fraudCheck.reason}`);
    }
    
    // Step 4: Execute transaction
    const executionResult = await executeTransaction(message);
    
    if (executionResult.success) {
      // Step 5: Update account balances
      await updateAccountBalances(message.fromAccount, message.toAccount, message.amount);
      
      // Step 6: Create audit trail
      await createAuditTrail(message, 'completed');
      
      // Step 7: Send notifications
      await sendTransactionNotifications(message);
      
      console.log(`Transaction ${message.transactionId} completed successfully`);
    } else {
      throw new Error(`Transaction execution failed: ${executionResult.error}`);
    }
    
  } catch (error) {
    console.error(`Transaction processing failed for ${message.transactionId}:`, error.message);
    
    // Create audit trail for failure
    await createAuditTrail(message, 'failed', error.message);
    
    // Send failure notification
    await sendTransactionFailureNotification(message, error.message);
    
    throw error;
  }
});
```

### 3. Audit Trail Processing

```javascript
// Audit trail consumer
const auditConsumer = sqs.createConsumer('audit-trail.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

auditConsumer.start(async (message, context) => {
  console.log(`Processing audit trail for transaction ${message.transactionId}`);
  
  try {
    // Store audit record
    await storeAuditRecord({
      transactionId: message.transactionId,
      action: message.action,
      status: message.status,
      timestamp: message.timestamp,
      details: message.details,
      userId: message.userId,
      ipAddress: message.ipAddress
    });
    
    // Update compliance records
    await updateComplianceRecords(message);
    
    // Check for suspicious activity
    await checkSuspiciousActivity(message);
    
    console.log(`Audit trail processed for transaction ${message.transactionId}`);
    
  } catch (error) {
    console.error(`Audit trail processing failed for transaction ${message.transactionId}:`, error.message);
    throw error;
  }
});
```

---

## Content Management System

Content management system with real-time updates and collaboration features.

### 1. Content Publishing

```javascript
// Content publisher
const contentPublisher = sqs.createPublisher('content-events.fifo', {
  messageGroupId: 'content-management',
  enableDeduplication: true
});

// Publish content event
const publishContentEvent = async (contentId, eventType, eventData) => {
  const event = {
    type: eventType,
    contentId: contentId,
    authorId: eventData.authorId,
    data: eventData,
    timestamp: new Date().toISOString(),
    metadata: {
      contentType: eventData.contentType,
      version: eventData.version,
      status: eventData.status
    }
  };
  
  const result = await contentPublisher.publish(event, {
    messageGroupId: `content-${contentId}`,
    messageAttributes: {
      contentType: eventData.contentType,
      authorId: eventData.authorId.toString(),
      priority: eventType === 'publish' ? 'high' : 'normal'
    }
  });
  
  return result;
};
```

### 2. Content Processing

```javascript
// Content processing consumer
const contentConsumer = sqs.createConsumer('content-events.fifo', {
  processingMode: 'sequential',
  batchSize: 1
});

contentConsumer.start(async (message, context) => {
  console.log(`Processing content event: ${message.type} for content ${message.contentId}`);
  
  try {
    switch (message.type) {
      case 'content-created':
        await processContentCreation(message);
        break;
        
      case 'content-updated':
        await processContentUpdate(message);
        break;
        
      case 'content-published':
        await processContentPublishing(message);
        break;
        
      case 'content-deleted':
        await processContentDeletion(message);
        break;
        
      default:
        console.warn('Unknown content event type:', message.type);
    }
    
    console.log(`Content event processed for content ${message.contentId}`);
    
  } catch (error) {
    console.error(`Content processing failed for content ${message.contentId}:`, error.message);
    throw error;
  }
});
```

### 3. Real-time Collaboration

```javascript
// Collaboration consumer
const collaborationConsumer = sqs.createConsumer('collaboration-events.fifo', {
  processingMode: 'parallel',
  batchSize: 5,
  throttleDelayMs: 50
});

collaborationConsumer.start(async (message, context) => {
  console.log(`Processing collaboration event for content ${message.contentId}`);
  
  try {
    // Update real-time collaboration
    await updateCollaborationState({
      contentId: message.contentId,
      userId: message.userId,
      action: message.action,
      timestamp: message.timestamp,
      data: message.data
    });
    
    // Notify collaborators
    await notifyCollaborators(message.contentId, message.userId, message.action);
    
    // Update presence
    await updateUserPresence(message.userId, message.contentId);
    
    console.log(`Collaboration event processed for content ${message.contentId}`);
    
  } catch (error) {
    console.error(`Collaboration processing failed for content ${message.contentId}:`, error.message);
    throw error;
  }
});
```

---

## 🎯 Summary

These examples demonstrate BoxQ's versatility across different industries and use cases:

- **E-commerce** - Order processing with inventory management
- **Microservices** - Event-driven architecture communication
- **Data Pipelines** - High-throughput data processing
- **Analytics** - Real-time event processing and aggregation
- **SaaS Platforms** - Multi-tenant message processing
- **IoT Systems** - Sensor data processing and alerting
- **Financial Services** - Secure transaction processing
- **Content Management** - Real-time collaboration and updates

**Ready to implement?** Check out our [Best Practices](best-practices.md) guide for production deployment!
