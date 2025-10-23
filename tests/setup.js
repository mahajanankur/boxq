/**
 * @fileoverview Test setup for BoxQ
 * @author Ankur Mahajan
 * @version 1.0.0
 */

// Mock AWS SDK
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  SendMessageCommand: jest.fn(),
  SendMessageBatchCommand: jest.fn(),
  ReceiveMessageCommand: jest.fn(),
  DeleteMessageCommand: jest.fn(),
  GetQueueAttributesCommand: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash-1234567890abcdef')
  }))
}));

// Global test timeout
jest.setTimeout(30000);
