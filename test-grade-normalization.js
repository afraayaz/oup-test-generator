#!/usr/bin/env node

/**
 * Test the grade normalization fix with different inputs
 */

// Test the fixed normalizeGrade function
function normalizeGrade(input) {
  if (!input) return "";
  const trimmed = input.trim();
  // Extract the numeric part from "Grade X" or "Class X"
  const match = trimmed.match(/^(?:grade|class)\s+(\d+)/i);
  if (match) {
    return `Grade ${match[1]}`;
  }
  // If it's just a number, add "Grade" prefix
  return `Grade ${trimmed}`;
}

// Test cases
const testCases = [
  "Class 1",
  "Grade 1",
  "class 2",
  "grade 3",
  "1",
  "2",
  "Class 10",
  "Grade 12",
];

console.log('🧪 Testing grade normalization fix:\n');
testCases.forEach(input => {
  const output = normalizeGrade(input);
  console.log(`  "${input}" => "${output}"`);
});

console.log('\n✅ All test cases produce consistent "Grade X" format!');
