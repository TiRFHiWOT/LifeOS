import { runDemoScenarios } from './scenarios';

async function main() {
  try {
    console.log('Running LifeOS AI & Action Orchestration Demo Scenarios...');
    const results = await runDemoScenarios();
    console.log('\n--- SCENARIO RESULTS ---');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Execution error:', err);
  }
}

main();
