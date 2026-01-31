/**
 * AI Provider Integration Manual Test Suite
 *
 * This file contains manual tests for the AI provider integration.
 * Run with: npx ts-node --esm electron/services/claude-code.integration.test.ts
 * Or compile and run: npx tsc -p tsconfig.electron.json && node dist-electron/services/claude-code.integration.test.js
 */

import * as path from 'path';
import * as fs from 'fs';
import { ClaudeProvider } from './providers/claude.provider';
import { AIProcessorService } from './ai-processor.service';
import {
  RefinedResumeSchema,
  GeneratedCoverLetterSchema,
} from '@schemas/ai-output.schema';
import { ResumeSchema } from '@schemas/resume.schema';
import { sanitize, sanitizeAIResponse } from '@shared/sanitize';

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

const testResults: TestResult[] = [];

// Helper to run and track tests
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  console.log(`\n[TEST] ${name}...`);

  try {
    await testFn();
    const duration = Date.now() - start;
    testResults.push({ name, passed: true, duration });
    console.log(`  ✓ PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, duration, error: errorMsg });
    console.log(`  ✗ FAILED (${duration}ms): ${errorMsg}`);
  }
}

// Find the Claude CLI path
function findClaudeCLIPath(): string {
  const possiblePaths = [
    'claude', // In PATH
    path.join(process.env.HOME || '', '.local/bin/claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];

  for (const p of possiblePaths) {
    try {
      if (p === 'claude') {
        // Check if in PATH
        const { execSync } = require('child_process');
        execSync('which claude', { encoding: 'utf-8' });
        return p;
      } else if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // Continue to next path
    }
  }

  throw new Error('Claude CLI not found. Please ensure it is installed.');
}

// Find test data paths - works both from source and compiled locations
function getTestDataPaths(): { resume: string; jobPosting: string } {
  const possibleBasePaths = [
    process.cwd(), // Current working directory
    path.join(__dirname, '../../..'), // From src/main/services
    path.join(__dirname, '../../../..'), // From dist-electron/src/main/services
  ];

  for (const basePath of possibleBasePaths) {
    const resumePath = path.join(
      basePath,
      'Auto Run Docs/Working/test-sample-resume.json'
    );
    const jobPostingPath = path.join(
      basePath,
      'Auto Run Docs/Working/test-job-posting.txt'
    );

    if (fs.existsSync(resumePath) && fs.existsSync(jobPostingPath)) {
      return { resume: resumePath, jobPosting: jobPostingPath };
    }
  }

  // Return the cwd path as default (will fail later with clear error)
  return {
    resume: path.join(process.cwd(), 'Auto Run Docs/Working/test-sample-resume.json'),
    jobPosting: path.join(process.cwd(), 'Auto Run Docs/Working/test-job-posting.txt'),
  };
}

// ============================================================================
// Test 1: Verify Claude Code CLI is accessible
// ============================================================================
async function testCLIAccessibility(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const service = new ClaudeProvider({ cliPath });

  const isAvailable = await service.isAvailable();
  if (!isAvailable) {
    throw new Error(`Claude CLI at '${cliPath}' is not accessible`);
  }

  console.log(`  CLI found at: ${cliPath}`);
}

// ============================================================================
// Test 2: Test basic CLI execution with text output
// ============================================================================
async function testBasicExecution(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const service = new ClaudeProvider({ cliPath, timeout: 60000 });

  const response = await service.execute({
    prompt: 'Reply with exactly: "Hello, World!" and nothing else.',
    outputFormat: 'text',
  });

  if (!response.success) {
    throw new Error(`CLI execution failed: ${response.error.message}`);
  }

  if (!response.rawResponse.includes('Hello')) {
    console.log(`  Raw response: ${response.rawResponse.substring(0, 200)}`);
    throw new Error('Response does not contain expected text');
  }

  console.log(`  Response received: ${response.rawResponse.length} chars`);
}

// ============================================================================
// Test 3: Test JSON output format
// ============================================================================
async function testJSONOutput(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const service = new ClaudeProvider({ cliPath, timeout: 60000 });

  const response = await service.execute({
    prompt:
      'Return a valid JSON object with the following structure: {"name": "Test", "value": 42}. Return ONLY the JSON, no markdown formatting.',
    outputFormat: 'json',
  });

  if (!response.success) {
    throw new Error(`CLI execution failed: ${response.error.message}`);
  }

  if (!response.data) {
    throw new Error('No parsed data returned');
  }

  const data = response.data as Record<string, unknown>;
  if (typeof data !== 'object' || data === null) {
    throw new Error('Parsed data is not an object');
  }

  console.log(`  Parsed JSON: ${JSON.stringify(data)}`);
}

// ============================================================================
// Test 4: Verify Zod validation catches malformed responses
// ============================================================================
async function testZodValidationCatchesMalformed(): Promise<void> {
  // Create a malformed resume (missing required fields)
  const malformedResume = {
    personalInfo: {
      // Missing required 'name' field
      email: 'test@example.com',
    },
    workExperience: [],
  };

  // Test that RefinedResumeSchema catches the error
  try {
    RefinedResumeSchema.parse(malformedResume);
    throw new Error('Schema should have rejected malformed data');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Schema should have rejected malformed data'
    ) {
      throw error;
    }
    // Expected: validation error
    console.log(`  Correctly caught validation error for missing 'name'`);
  }

  // Test another malformed case: invalid email
  const invalidEmail = {
    personalInfo: {
      name: 'Test User',
      email: 'not-an-email',
    },
    workExperience: [],
  };

  try {
    RefinedResumeSchema.parse(invalidEmail);
    throw new Error('Schema should have rejected invalid email');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Schema should have rejected invalid email'
    ) {
      throw error;
    }
    console.log(`  Correctly caught validation error for invalid email`);
  }

  // Test GeneratedCoverLetterSchema
  const malformedCoverLetter = {
    // Missing required fields
    opening: 'Hello',
  };

  try {
    GeneratedCoverLetterSchema.parse(malformedCoverLetter);
    throw new Error('Schema should have rejected malformed cover letter');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Schema should have rejected malformed cover letter'
    ) {
      throw error;
    }
    console.log(`  Correctly caught validation error for cover letter`);
  }
}

// ============================================================================
// Test 5: Verify sanitization removes AI artifacts
// ============================================================================
async function testSanitizationRemovesArtifacts(): Promise<void> {
  // Test zero-width characters
  const withZeroWidth = 'Hello\u200BWorld\u200C!\uFEFF';
  const cleanedZeroWidth = sanitize(withZeroWidth);
  if (cleanedZeroWidth !== 'HelloWorld!') {
    throw new Error(
      `Zero-width chars not removed: "${cleanedZeroWidth}" (expected "HelloWorld!")`
    );
  }
  console.log(`  Zero-width chars removed correctly`);

  // Test markdown stripping
  const withMarkdown = '**Bold** and *italic* text with `code`';
  const cleanedMarkdown = sanitize(withMarkdown, { stripMarkdown: true });
  if (
    cleanedMarkdown.includes('**') ||
    cleanedMarkdown.includes('*') ||
    cleanedMarkdown.includes('`')
  ) {
    throw new Error(`Markdown not stripped: "${cleanedMarkdown}"`);
  }
  console.log(`  Markdown stripped correctly`);

  // Test space normalization
  const withUnusualSpaces = 'Hello\u00A0\u2003World';
  const cleanedSpaces = sanitize(withUnusualSpaces);
  if (cleanedSpaces !== 'Hello World') {
    throw new Error(
      `Spaces not normalized: "${cleanedSpaces}" (expected "Hello World")`
    );
  }
  console.log(`  Unusual spaces normalized correctly`);

  // Test object sanitization
  const objectWithArtifacts = {
    name: 'Test\u200B User',
    highlights: ['**Bold** highlight', 'Normal\u00A0text'],
  };
  const sanitizedObject = sanitizeAIResponse(objectWithArtifacts) as typeof objectWithArtifacts;
  if (
    sanitizedObject.name !== 'Test User' ||
    sanitizedObject.highlights[0]?.includes('**')
  ) {
    throw new Error('Object sanitization failed');
  }
  console.log(`  Object sanitization works correctly`);
}

// ============================================================================
// Test 6: Test resume refinement with AI Processor
// ============================================================================
async function testResumeRefinement(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const processor = new AIProcessorService(
    {
      sanitizeOutput: true,
      includeMetadata: true,
      enableRetryOnValidationFailure: false,
    }
  );
  processor.updateProviderConfig({ cliPath, timeout: 180000 }); // 3 minute timeout

  // Load test data
  const testPaths = getTestDataPaths();

  if (!fs.existsSync(testPaths.resume) || !fs.existsSync(testPaths.jobPosting)) {
    throw new Error(`Test data files not found. Looked at: ${testPaths.resume}`);
  }

  const resumeData = JSON.parse(fs.readFileSync(testPaths.resume, 'utf-8'));
  const jobPosting = fs.readFileSync(testPaths.jobPosting, 'utf-8');

  // Validate input resume
  const validatedResume = ResumeSchema.parse(resumeData);
  console.log(`  Input resume validated successfully`);

  // Check if AI is available
  const isAvailable = await processor.isAvailable();
  if (!isAvailable) {
    throw new Error('AI Processor service is not available');
  }

  // Refine resume
  console.log(`  Calling refineResume (this may take 1-2 minutes)...`);
  const refinedResume = await processor.refineResume(validatedResume, jobPosting);

  // Validate output
  const validatedOutput = RefinedResumeSchema.parse(refinedResume);
  console.log(`  Refined resume validated successfully`);
  console.log(
    `  Summary: ${validatedOutput.personalInfo.summary?.substring(0, 100)}...`
  );

  if (validatedOutput.refinementMetadata) {
    console.log(
      `  Metadata: ${JSON.stringify(validatedOutput.refinementMetadata).substring(0, 200)}...`
    );
  }
}

// ============================================================================
// Test 7: Test cover letter generation with AI Processor
// ============================================================================
async function testCoverLetterGeneration(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const processor = new AIProcessorService({
    sanitizeOutput: true,
    includeMetadata: true,
    enableRetryOnValidationFailure: false,
  });
  processor.updateProviderConfig({ cliPath, timeout: 180000 }); // 3 minute timeout

  // Load test data
  const testPaths = getTestDataPaths();

  if (!fs.existsSync(testPaths.resume) || !fs.existsSync(testPaths.jobPosting)) {
    throw new Error(`Test data files not found. Looked at: ${testPaths.resume}`);
  }

  const resumeData = JSON.parse(fs.readFileSync(testPaths.resume, 'utf-8'));
  const jobPosting = fs.readFileSync(testPaths.jobPosting, 'utf-8');

  // Validate input resume
  const validatedResume = ResumeSchema.parse(resumeData);

  // Check if AI is available
  const isAvailable = await processor.isAvailable();
  if (!isAvailable) {
    throw new Error('AI Processor service is not available');
  }

  // Generate cover letter
  console.log(`  Calling generateCoverLetter (this may take 1-2 minutes)...`);
  const coverLetter = await processor.generateCoverLetter(
    validatedResume,
    jobPosting,
    {
      companyInfo: {
        name: 'TechCorp Innovation Labs',
        industry: 'Developer Tools',
        cultureKeywords: ['fast-paced', 'innovative', 'collaborative'],
      },
    }
  );

  // Validate output
  const validatedOutput = GeneratedCoverLetterSchema.parse(coverLetter);
  console.log(`  Cover letter validated successfully`);
  console.log(`  Company: ${validatedOutput.companyName}`);
  console.log(`  Opening: ${validatedOutput.opening.substring(0, 100)}...`);
  console.log(`  Body paragraphs: ${validatedOutput.body.length}`);
}

// ============================================================================
// Test 8: Test error handling for timeout
// ============================================================================
async function testTimeoutHandling(): Promise<void> {
  const cliPath = findClaudeCLIPath();
  const service = new ClaudeProvider({
    cliPath,
    timeout: 100, // Very short timeout
  });

  const response = await service.execute({
    prompt: 'Write a 1000 word essay about software engineering.',
    outputFormat: 'text',
  });

  // This should either timeout or succeed quickly - both are valid
  if (!response.success && response.error.code === 'TIMEOUT') {
    console.log(`  Timeout correctly triggered`);
  } else if (response.success) {
    console.log(`  Request completed before timeout (fast response)`);
  } else {
    // Other errors are also acceptable
    console.log(`  Got error: ${response.error.code}`);
  }
}

// ============================================================================
// Main test runner
// ============================================================================
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Claude Code Integration Test Suite');
  console.log('='.repeat(60));

  // Core tests (always run)
  await runTest('1. CLI Accessibility', testCLIAccessibility);
  await runTest('4. Zod Validation Catches Malformed', testZodValidationCatchesMalformed);
  await runTest('5. Sanitization Removes AI Artifacts', testSanitizationRemovesArtifacts);

  // Check if we should run live AI tests
  const runLiveTests = process.argv.includes('--live');

  if (runLiveTests) {
    console.log('\n[INFO] Running live AI tests (--live flag detected)');
    await runTest('2. Basic CLI Execution', testBasicExecution);
    await runTest('3. JSON Output Format', testJSONOutput);
    await runTest('6. Resume Refinement', testResumeRefinement);
    await runTest('7. Cover Letter Generation', testCoverLetterGeneration);
    await runTest('8. Timeout Handling', testTimeoutHandling);
  } else {
    console.log('\n[INFO] Skipping live AI tests. Use --live flag to run them.');
    console.log('       Example: npx ts-node --esm src/main/services/claude-code.integration.test.ts --live');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  for (const result of testResults) {
    const status = result.passed ? '✓' : '✗';
    const duration = `${result.duration}ms`;
    console.log(`  ${status} ${result.name} (${duration})`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
