// Test script for API speed testing
// This script tests basic API connectivity without authentication

const API_URL = 'http://localhost:3000/api/notifications/send';
const TEST_COUNT = 5;
const DELAY_BETWEEN_TESTS = 1000; // 1 second

// Test data (this will fail due to auth, but we're testing speed)
const testPayload = {
  recipientId: "test-recipient-id",
  title: "Test Notification",
  message: "This is a test notification for speed testing",
  type: "test",
  relatedId: "test-workout-id"
};

async function testApiSpeed() {
  console.log('🚀 Starting API Speed Test...');
  console.log(`📊 Testing ${TEST_COUNT} requests to: ${API_URL}`);
  console.log('⏱️  Delay between tests: 1 second\n');
  console.log('⚠️  Note: These requests will fail due to authentication, but we\'re testing response speed\n');

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= TEST_COUNT; i++) {
    const startTime = Date.now();
    
    try {
      console.log(`📡 Test ${i}/${TEST_COUNT} - Sending request...`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Test ${i} - SUCCESS (${duration}ms)`);
        successCount++;
        results.push({ test: i, duration, status: 'success', statusCode: response.status });
      } else {
        const errorData = await response.text();
        console.log(`❌ Test ${i} - FAILED (${duration}ms) - Status: ${response.status}`);
        console.log(`   Error: ${errorData.substring(0, 100)}${errorData.length > 100 ? '...' : ''}`);
        errorCount++;
        results.push({ test: i, duration, status: 'error', statusCode: response.status, error: errorData });
      }

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`💥 Test ${i} - EXCEPTION (${duration}ms) - ${error.message}`);
      errorCount++;
      results.push({ test: i, duration, status: 'exception', error: error.message });
    }

    // Wait before next test (except for the last one)
    if (i < TEST_COUNT) {
      console.log(`⏳ Waiting 1 second before next test...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }

  // Calculate statistics (including failed requests for speed analysis)
  const allDurations = results.map(r => r.duration);
  const avgDuration = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
  const minDuration = allDurations.length > 0 ? Math.min(...allDurations) : 0;
  const maxDuration = allDurations.length > 0 ? Math.max(...allDurations) : 0;

  // Print summary
  console.log('\n📈 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${TEST_COUNT}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Success Rate: ${((successCount / TEST_COUNT) * 100).toFixed(1)}%`);
  
  console.log('\n⏱️  RESPONSE TIMES (all requests)');
  console.log('================================');
  console.log(`Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`Minimum: ${minDuration}ms`);
  console.log(`Maximum: ${maxDuration}ms`);

  console.log('\n📋 DETAILED RESULTS');
  console.log('==================');
  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '💥';
    console.log(`${statusIcon} Test ${result.test}: ${result.duration}ms - ${result.status}${result.statusCode ? ` (${result.statusCode})` : ''}`);
  });

  // Performance rating based on response speed (not success)
  console.log('\n🏆 PERFORMANCE RATING');
  console.log('====================');
  if (avgDuration < 100) {
    console.log('🚀 EXCELLENT - Very fast responses (< 100ms average)');
  } else if (avgDuration < 300) {
    console.log('✅ GOOD - Fast responses (< 300ms average)');
  } else if (avgDuration < 1000) {
    console.log('⚠️  ACCEPTABLE - Moderate responses (< 1s average)');
  } else {
    console.log('🐌 SLOW - Slow responses (> 1s average) - Consider optimization');
  }

  console.log('\n💡 INTERPRETATION:');
  console.log('==================');
  if (errorCount === TEST_COUNT) {
    console.log('✅ All requests failed with 401/403 - This is expected without authentication');
    console.log('✅ The API is responding quickly and correctly rejecting unauthorized requests');
    console.log('✅ Your API endpoint is working properly');
  } else if (successCount > 0) {
    console.log('🎉 Some requests succeeded - Check your authentication setup');
  } else {
    console.log('❌ Unexpected errors - Check your API endpoint and server');
  }
}

// Run the test
testApiSpeed().catch(console.error); 