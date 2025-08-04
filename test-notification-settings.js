// Test script for notification settings performance
// This script tests the speed of updating notification settings in the database
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load environment variables



if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Test data
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id';

async function testNotificationSettingsUpdate() {
  console.log('🚀 Testing Notification Settings Update Performance');
  console.log('==================================================');
  console.log(`User ID: ${TEST_USER_ID}`);
  console.log('');

  const testCases = [
    { setting: 'workout_completed_email', value: true },
    { setting: 'workout_completed_email', value: false },
    { setting: 'program_assigned_email', value: true },
    { setting: 'program_assigned_email', value: false },
    { setting: 'weekly_progress_email', value: true },
    { setting: 'weekly_progress_email', value: false }
  ];

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const startTime = Date.now();

    try {
      console.log(`📡 Test ${i + 1}/${testCases.length} - Updating ${testCase.setting} to ${testCase.value}...`);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${TEST_USER_ID}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          [testCase.setting]: testCase.value
        })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        console.log(`✅ Test ${i + 1} - SUCCESS (${duration}ms)`);
        successCount++;
        results.push({ test: i + 1, setting: testCase.setting, value: testCase.value, duration, status: 'success' });
      } else {
        const errorText = await response.text();
        console.log(`❌ Test ${i + 1} - FAILED (${duration}ms) - Status: ${response.status}`);
        console.log(`   Error: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`);
        errorCount++;
        results.push({ test: i + 1, setting: testCase.setting, value: testCase.value, duration, status: 'error', error: errorText });
      }

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`💥 Test ${i + 1} - EXCEPTION (${duration}ms) - ${error.message}`);
      errorCount++;
      results.push({ test: i + 1, setting: testCase.setting, value: testCase.value, duration, status: 'exception', error: error.message });
    }

    // Wait between tests
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 500ms before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Calculate statistics
  const allDurations = results.map(r => r.duration);
  const avgDuration = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
  const minDuration = allDurations.length > 0 ? Math.min(...allDurations) : 0;
  const maxDuration = allDurations.length > 0 ? Math.max(...allDurations) : 0;

  // Print summary
  console.log('\n📈 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Success Rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`);

  console.log('\n⏱️  RESPONSE TIMES');
  console.log('=================');
  console.log(`Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`Minimum: ${minDuration}ms`);
  console.log(`Maximum: ${maxDuration}ms`);

  console.log('\n📋 DETAILED RESULTS');
  console.log('==================');
  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '💥';
    console.log(`${statusIcon} Test ${result.test}: ${result.setting}=${result.value} - ${result.duration}ms - ${result.status}`);
  });

  // Performance rating
  console.log('\n🏆 PERFORMANCE RATING');
  console.log('====================');
  if (avgDuration < 100) {
    console.log('🚀 EXCELLENT - Very fast updates (< 100ms average)');
  } else if (avgDuration < 300) {
    console.log('✅ GOOD - Fast updates (< 300ms average)');
  } else if (avgDuration < 1000) {
    console.log('⚠️  ACCEPTABLE - Moderate speed (< 1s average)');
  } else {
    console.log('🐌 SLOW - Updates are taking too long (> 1s average)');
  }

  return { results, avgDuration, successCount, errorCount };
}

// Run the test
testNotificationSettingsUpdate().catch(console.error); 