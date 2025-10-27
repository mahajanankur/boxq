#!/usr/bin/env node

/**
 * BoxQ Express Microservice Example
 * Demonstrates how to integrate BoxQ with Express.js microservices
 * 
 * This example shows:
 * 1. Express.js server setup with BoxQ consumer
 * 2. Event-driven architecture with SQS
 * 3. Graceful shutdown handling
 * 4. Health monitoring and metrics
 * 5. Production-ready error handling
 * 
 * Usage: node examples/express-microservice.js
 */

require('dotenv').config();
const express = require('express');
const { BoxQ } = require('../src/index');

class ExpressMicroservice {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.boxq = null;
    this.publisher = null;
    this.consumer = null;
    this.isShuttingDown = false;
    this.stats = {
      messagesProcessed: 0,
      messagesFailed: 0,
      startTime: Date.now(),
      lastMessageTime: null
    };
  }

  /**
   * Initialize the microservice
   */
  async initialize() {
    console.log('🚀 Initializing Express Microservice with BoxQ...\n');

    // Initialize BoxQ with production configuration
    this.boxq = new BoxQ({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      circuitBreaker: {
        failureThreshold: 10,
        timeout: 120000
      },
      retry: {
        maxRetries: 5,
        backoffMultiplier: 2,
        maxBackoffMs: 60000
      }
    });

    // Create publisher for this microservice
    this.publisher = this.boxq.createPublisher(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      enableDeduplication: true
    });

    // Create consumer for this microservice
    this.consumer = this.boxq.createConsumer(process.env.SQS_QUEUE_URL, {
      messageGroupId: process.env.SQS_MESSAGE_GROUP_ID,
      processingMode: 'parallel',  // Use parallel processing for better performance
      batchSize: 5,                // Process up to 5 messages at once
      maxMessages: 10,             // Receive up to 10 messages per poll
      waitTimeSeconds: 20,         // Long polling for efficiency
      visibilityTimeoutSeconds: 60, // 1 minute visibility timeout
      pollingInterval: 1000,       // Poll every second
      autoStart: false             // Don't start automatically
    });

    this.setupExpress();
    this.setupConsumer();
    this.setupGracefulShutdown();
  }

  /**
   * Setup Express.js routes and middleware
   */
  setupExpress() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const healthStatus = await this.boxq.getHealthStatus();
        const metrics = this.boxq.getMetrics();
        
        res.json({
          status: 'healthy',
          microservice: 'user-service',
          uptime: Date.now() - this.stats.startTime,
          boxq: {
            status: healthStatus.status,
            uptime: healthStatus.uptime,
            circuitBreaker: metrics.circuitBreaker.state
          },
          stats: this.stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      try {
        const metrics = this.boxq.getMetrics();
        res.json({
          microservice: 'user-service',
          stats: this.stats,
          boxq: metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Publish event endpoint (for testing)
    this.app.post('/events', async (req, res) => {
      try {
        const { type, data } = req.body;
        
        if (!type || !data) {
          return res.status(400).json({
            error: 'Type and data are required',
            timestamp: new Date().toISOString()
          });
        }

        const event = {
          type,
          data,
          microservice: 'user-service',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown'
        };

        const result = await this.publisher.publish(event);
        
        res.json({
          success: true,
          messageId: result.messageId,
          processingTime: result.processingTime,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to publish event:', error);
        res.status(500).json({
          error: 'Failed to publish event',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Consumer status endpoint
    this.app.get('/consumer/status', (req, res) => {
      try {
        const isRunning = this.consumer.isConsumerRunning();
        const config = this.consumer.getConfig();
        
        res.json({
          running: isRunning,
          config: config,
          stats: this.stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Start/stop consumer endpoints
    this.app.post('/consumer/start', (req, res) => {
      try {
        if (this.consumer.isConsumerRunning()) {
          return res.json({
            message: 'Consumer is already running',
            timestamp: new Date().toISOString()
          });
        }

        this.consumer.start(this.messageHandler);
        res.json({
          message: 'Consumer started successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to start consumer',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.post('/consumer/stop', (req, res) => {
      try {
        if (!this.consumer.isConsumerRunning()) {
          return res.json({
            message: 'Consumer is not running',
            timestamp: new Date().toISOString()
          });
        }

        this.consumer.stop();
        res.json({
          message: 'Consumer stopped successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to stop consumer',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'BoxQ Express Microservice',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          events: 'POST /events',
          consumer: {
            status: 'GET /consumer/status',
            start: 'POST /consumer/start',
            stop: 'POST /consumer/stop'
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      console.error('Express error:', error);
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup message consumer
   */
  setupConsumer() {
    // Message handler for processing events
    this.messageHandler = async (message, context) => {
      try {
        console.log(`📨 Processing event: ${context.messageId}`);
        console.log(`   Type: ${message.type}`);
        console.log(`   Source: ${message.microservice}`);
        console.log(`   Data:`, message.data);

        // Simulate microservice business logic
        await this.processEvent(message, context);

        this.stats.messagesProcessed++;
        this.stats.lastMessageTime = new Date().toISOString();

        console.log(`   ✅ Event processed successfully`);
        return { success: true };
      } catch (error) {
        this.stats.messagesFailed++;
        console.error(`   ❌ Event processing failed: ${error.message}`);
        throw error; // Re-throw to trigger retry
      }
    };

    // Start consumer automatically
    this.consumer.start(this.messageHandler);
    console.log('✅ Consumer started and ready to process events');
  }

  /**
   * Process business event
   */
  async processEvent(message, context) {
    // Simulate different types of event processing
    switch (message.type) {
      case 'user-created':
        await this.handleUserCreated(message.data);
        break;
      case 'user-updated':
        await this.handleUserUpdated(message.data);
        break;
      case 'user-deleted':
        await this.handleUserDeleted(message.data);
        break;
      case 'order-created':
        await this.handleOrderCreated(message.data);
        break;
      case 'payment-processed':
        await this.handlePaymentProcessed(message.data);
        break;
      default:
        console.log(`   ℹ️  Unknown event type: ${message.type}`);
        await this.handleGenericEvent(message);
    }
  }

  /**
   * Event handlers
   */
  async handleUserCreated(data) {
    console.log(`   👤 Creating user: ${data.email}`);
    // Simulate database operation
    await this.sleep(200);
    console.log(`   ✅ User created with ID: ${data.userId}`);
  }

  async handleUserUpdated(data) {
    console.log(`   👤 Updating user: ${data.userId}`);
    // Simulate database operation
    await this.sleep(150);
    console.log(`   ✅ User updated successfully`);
  }

  async handleUserDeleted(data) {
    console.log(`   👤 Deleting user: ${data.userId}`);
    // Simulate database operation
    await this.sleep(100);
    console.log(`   ✅ User deleted successfully`);
  }

  async handleOrderCreated(data) {
    console.log(`   🛒 Processing order: ${data.orderId}`);
    // Simulate order processing
    await this.sleep(300);
    console.log(`   ✅ Order processed successfully`);
  }

  async handlePaymentProcessed(data) {
    console.log(`   💳 Processing payment: ${data.paymentId}`);
    // Simulate payment processing
    await this.sleep(250);
    console.log(`   ✅ Payment processed successfully`);
  }

  async handleGenericEvent(message) {
    console.log(`   📋 Processing generic event`);
    // Simulate generic processing
    await this.sleep(100);
    console.log(`   ✅ Generic event processed`);
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) {
        console.log('⚠️  Shutdown already in progress...');
        return;
      }

      this.isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop accepting new requests
        console.log('   📝 Stopping HTTP server...');
        this.server.close(() => {
          console.log('   ✅ HTTP server stopped');
        });

        // Stop consumer gracefully
        if (this.consumer && this.consumer.isConsumerRunning()) {
          console.log('   📨 Stopping message consumer...');
          this.consumer.stop();
          console.log('   ✅ Message consumer stopped');
        }

        // Wait for ongoing operations to complete
        console.log('   ⏳ Waiting for ongoing operations to complete...');
        await this.sleep(5000);

        console.log('   ✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('   ❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
  }

  /**
   * Start the microservice
   */
  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Express Microservice running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
        console.log(`🎯 Consumer status: http://localhost:${this.port}/consumer/status`);
        console.log(`\n💡 Test the microservice:`);
        console.log(`   curl -X POST http://localhost:${this.port}/events \\`);
        console.log(`     -H "Content-Type: application/json" \\`);
        console.log(`     -d '{"type": "user-created", "data": {"userId": "123", "email": "test@example.com"}}'`);
        console.log(`\n⏹️  Press Ctrl+C to stop gracefully\n`);
      });

    } catch (error) {
      console.error('💥 Failed to start microservice:', error);
      process.exit(1);
    }
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the microservice if this file is executed directly
if (require.main === module) {
  const microservice = new ExpressMicroservice();
  microservice.start();
}

module.exports = ExpressMicroservice;
