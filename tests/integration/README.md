# BoxQ Integration Tests

This directory contains integration tests for the BoxQ library that test real AWS SQS functionality.

## Prerequisites

1. **AWS Credentials**: Set up your AWS credentials in the `.env` file
2. **SQS Queue**: Ensure the SQS queue exists in your AWS account
3. **Node.js**: Version 18+ recommended (16+ minimum)
4. **Dependencies**: Run `npm install` to install required packages

## Environment Setup

Copy the `.env` file from the root directory and update with your AWS credentials:

```bash
cp .env .env.local
# Edit .env.local with your actual AWS credentials
```

## Running Integration Tests

### Option 1: Run the complete integration test
```bash
node run-integration-test.js
```

### Option 2: Run the Jest integration test
```bash
npm test -- tests/integration/message-flow.test.js
```

### Option 3: Run the complete message flow example
```bash
node examples/complete-message-flow.js
```

## Test Coverage

The integration tests cover:

- ✅ **Message Publishing**: Single and batch message publishing
- ✅ **Message Consumption**: Real-time message consumption
- ✅ **Health Monitoring**: System health status and metrics
- ✅ **Error Handling**: Network errors and invalid inputs
- ✅ **Performance**: High-throughput message processing
- ✅ **Deduplication**: Message deduplication functionality
- ✅ **Circuit Breaker**: Fault tolerance and recovery
- ✅ **Retry Logic**: Automatic retry with exponential backoff

## Expected Results

### Successful Test Run
```
🧪 Running BoxQ Integration Test
==================================================
✅ BoxQ initialized
📊 Health Status: healthy
📈 Circuit Breaker State: CLOSED
✅ Publisher created
📤 Publishing test message...
✅ Message published successfully
   Message ID: 12345678-1234-1234-1234-123456789012
   Processing Time: 45ms
📤 Testing batch publishing...
✅ Batch publishing: 2/2 successful
✅ Consumer created
🔄 Starting consumer for 10 seconds...
📨 Received message 1: 12345678-1234-1234-1234-123456789012
   Body: {
     "type": "integration-test",
     "data": "Hello from BoxQ Integration Test!",
     "timestamp": "2024-01-15T10:30:00.000Z"
   }
⏹️  Consumer stopped
📋 Test Summary:
   Messages Published: 3 (1 single + 2 batch)
   Messages Received: 3
   Success Rate: 100%
🎉 Integration test PASSED!
✅ BoxQ is working correctly with real AWS SQS
==================================================
🏁 Integration test completed
```

### Partial Test Run (No Messages Consumed)
```
⚠️  Integration test PARTIAL - No messages consumed
   This might be due to:
   - Queue not existing in AWS account
   - Network connectivity issues
   - AWS credentials permissions
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   ```
   Error: AWS credentials not configured
   ```
   **Solution**: Ensure `.env` file exists with valid AWS credentials

2. **Queue Not Found**
   ```
   Error: Queue does not exist
   ```
   **Solution**: Create the SQS queue in your AWS account or update the queue URL

3. **Permission Denied**
   ```
   Error: Access denied
   ```
   **Solution**: Ensure your AWS credentials have SQS permissions

4. **Network Timeout**
   ```
   Error: Request timeout
   ```
   **Solution**: Check network connectivity and AWS region settings

### Debug Mode

Enable debug logging by setting the log level in your `.env` file:
```
LOG_LEVEL=debug
```

## Test Configuration

The integration tests use the following configuration from `.env`:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=123456789012

# SQS Configuration
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/your-queue.fifo
SQS_MESSAGE_GROUP_ID=your-message-group
SQS_MAX_MESSAGES=10
SQS_WAIT_TIME_SECONDS=20
SQS_VISIBILITY_TIMEOUT_SECONDS=300

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000

# Retry Configuration
RETRY_MAX_RETRIES=3
RETRY_BACKOFF_MULTIPLIER=2
RETRY_MAX_BACKOFF_MS=30000
```

## Performance Benchmarks

Expected performance metrics for the integration tests:

- **Message Publishing**: < 100ms per message
- **Batch Publishing**: < 200ms for 10 messages
- **Message Consumption**: < 500ms per message
- **Health Check**: < 50ms
- **Metrics Retrieval**: < 10ms

## Security Notes

- Never commit actual AWS credentials to version control
- Use environment variables for sensitive configuration
- Rotate AWS credentials regularly
- Use IAM roles when possible instead of access keys
- Monitor AWS CloudTrail for API usage

## Support

For issues with integration tests:

1. Check the troubleshooting section above
2. Verify AWS credentials and permissions
3. Ensure the SQS queue exists and is accessible
4. Review the test logs for specific error messages
5. Contact the development team for assistance
