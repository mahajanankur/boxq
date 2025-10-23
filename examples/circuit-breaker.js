/**
 * @fileoverview Circuit breaker example for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

const { BoxQ } = require('../src/index');

/**
 * Circuit breaker example demonstrating fault tolerance and recovery
 */
const circuitBreakerExample = async () => {
  console.log('🛡️ BoxQ - Circuit Breaker Example');
  
  // Create SQS instance with aggressive circuit breaker settings
  const sqs = new BoxQ({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    circuitBreaker: {
      failureThreshold: 3, // Open circuit after 3 failures
      timeout: 5000,       // 5 second timeout
      monitoringPeriod: 2000 // 2 second monitoring period
    },
    retry: {
      maxRetries: 2,
      backoffMultiplier: 2,
      maxBackoffMs: 1000
    }
  });

  try {
    // Create publisher
    const publisher = sqs.createPublisher('test-queue.fifo', {
      messageGroupId: 'circuit-breaker-test',
      enableDeduplication: true
    });

    // Function to simulate SQS failures
    const simulateFailures = async (count) => {
      console.log(`🔥 Simulating ${count} failures...`);
      
      for (let i = 1; i <= count; i++) {
        try {
          // This will fail if SQS is not available or credentials are invalid
          await publisher.publish({
            type: 'test-message',
            messageId: i,
            timestamp: new Date().toISOString(),
            data: { test: true }
          });
          
          console.log(`✅ Message ${i} published successfully`);
        } catch (error) {
          console.log(`❌ Message ${i} failed: ${error.message}`);
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    // Monitor circuit breaker status
    const monitorCircuitBreaker = () => {
      const status = sqs.getSQSClient().getCircuitBreakerStatus();
      console.log('🔍 Circuit Breaker Status:');
      console.log(`State: ${status.state}`);
      console.log(`Failure count: ${status.failureCount}`);
      console.log(`Success count: ${status.successCount}`);
      console.log(`Can execute: ${status.canExecute}`);
      console.log(`Time since last failure: ${status.timeSinceLastFailure}ms`);
      console.log('---');
    };

    // Initial status
    console.log('📊 Initial circuit breaker status:');
    monitorCircuitBreaker();

    // Simulate failures to trigger circuit breaker
    console.log('🚨 Phase 1: Triggering circuit breaker...');
    await simulateFailures(5);
    
    // Check circuit breaker status after failures
    console.log('📊 Circuit breaker status after failures:');
    monitorCircuitBreaker();

    // Wait for circuit breaker to attempt recovery
    console.log('⏳ Waiting for circuit breaker recovery...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Check status after timeout
    console.log('📊 Circuit breaker status after timeout:');
    monitorCircuitBreaker();

    // Attempt to publish messages during circuit breaker recovery
    console.log('🔄 Phase 2: Attempting recovery...');
    await simulateFailures(3);

    // Check final status
    console.log('📊 Final circuit breaker status:');
    monitorCircuitBreaker();

    // Reset circuit breaker
    console.log('🔄 Resetting circuit breaker...');
    sqs.getSQSClient().resetCircuitBreaker();
    
    console.log('📊 Circuit breaker status after reset:');
    monitorCircuitBreaker();

    // Test successful operations after reset
    console.log('✅ Phase 3: Testing after reset...');
    await simulateFailures(2);

    // Get comprehensive health status
    console.log('🏥 Getting comprehensive health status...');
    const health = await sqs.getHealthStatus();
    console.log('Overall health:', health.status);
    console.log('Uptime:', health.uptime, 'ms');
    console.log('SQS client health:', health.details.sqsClient);

    // Get detailed metrics
    console.log('📈 Getting detailed metrics...');
    const metrics = sqs.getMetrics();
    console.log('System metrics:');
    console.log(`Total messages: ${metrics.system.totalMessages}`);
    console.log(`Success rate: ${metrics.system.successRate}%`);
    console.log(`Average processing time: ${metrics.system.averageProcessingTime}ms`);
    console.log(`Throughput: ${metrics.system.throughput.toFixed(2)} messages/second`);
    
    console.log('Circuit breaker metrics:');
    console.log(`State: ${metrics.circuitBreaker.state}`);
    console.log(`Failure count: ${metrics.circuitBreaker.failureCount}`);
    console.log(`Success count: ${metrics.circuitBreaker.successCount}`);
    console.log(`Can execute: ${metrics.circuitBreaker.canExecute}`);

    // Display alerts if any
    if (metrics.alerts.length > 0) {
      console.log('🚨 Alerts:');
      metrics.alerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.type}: ${alert.message} (${new Date(alert.timestamp).toISOString()})`);
      });
    }

    console.log('✅ Circuit breaker example completed');

  } catch (error) {
    console.error('❌ Error in circuit breaker example:', error.message);
  }
};

// Run example if called directly
if (require.main === module) {
  circuitBreakerExample().catch(console.error);
}

module.exports = circuitBreakerExample;
