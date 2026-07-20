#!/usr/bin/env node

/**
 * Diagnostic script for GEPA optimization.
 *
 * Demonstrates how to use the onEvaluation callback to log component values,
 * advice, and rewards during optimization.
 */

import { runGEPAOptimization } from '../cli/src/optimization/runner.js';
import { readFileSync } from 'node:fs';

// Load sample training data
const sampleData = JSON.parse(readFileSync(new URL('../test/fixtures/optimization-training.json', import.meta.url)));

// Configure the optimization run with onEvaluation callback
const result = await runGEPAOptimization(
  sampleData.training,
  sampleData.validation,
  {
    studentProvider: 'openai',
    studentModel: 'gpt-4o-mini',
    verbose: true,
    onEvaluation: (round, components, advice, reward) => {
      console.log(`\n=== Round ${round} Evaluation ===`);
      console.log(`Reward: ${reward.toFixed(4)}`);
      
      console.log('\nCurrent Components:');
      for (const [key, value] of Object.entries(components)) {
        console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      }
      
      console.log('\nAdvice:');
      for (const [key, value] of Object.entries(advice)) {
        console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
  }
);

console.log('Optimization complete!');
console.log('Best score:', result.paretoResult.bestScore);
console.log('Selected point:', result.selectedPoint.scores);