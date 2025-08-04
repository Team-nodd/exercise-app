// Comprehensive API Speed Test
// Tests both health endpoint (no auth) and notifications endpoint (with auth)

const HEALTH_URL = 'http://localhost:3000/api/health';
const NOTIFICATIONS_URL = 'http://localhost:3000/api/notifications/send';
const TEST_COUNT = 5;
const DELAY_BETWEEN_TESTS = 1000; // 1 second

// Test data for notifications
const testPayload = {
  recipientId: "test-recipient-id",
  title: "Test Notification",
  message: "This is a test notification for speed testing",
  type: "test",
  relatedId: "test-workout-id"
};

async function testEndpoint(url, method = 'GET', payload = null, name = 'API') {
  console.log(`\n🚀 Testing ${name} endpoint: ${url}`);
  console.log(`📊 Method: ${method}`);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= TEST_COUNT; i++) {
    const startTime = Date.now();
    
    try {
      console.log(`📡 Test ${i}/${TEST_COUNT} - Sending request...`);
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (payload) {
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);
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
      console.log(`⏳ Waiting 1 second before next test...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }

  // Calculate statistics
  const allDurations = results.map(r => r.duration);
  const avgDuration = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
  const minDuration = allDurations.length > 0 ? Math.min(...allDurations) : 0;
  const maxDuration = allDurations.length > 0 ? Math.max(...allDurations) : 0;

  // Print summary for this endpoint
  console.log(`\n📈 ${name.toUpperCase()} RESULTS SUMMARY`);
  console.log('='.repeat(50));
  console.log(`Total Tests: ${TEST_COUNT}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Success Rate: ${((successCount / TEST_COUNT) * 100).toFixed(1)}%`);
  console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`Min Response Time: ${minDuration}ms`);
  console.log(`Max Response Time: ${maxDuration}ms`);

  // Performance rating
  let rating = '';
  if (avgDuration < 100) {
    rating = '🚀 EXCELLENT (< 100ms)';
  } else if (avgDuration < 300) {
    rating = '✅ GOOD (< 300ms)';
  } else if (avgDuration < 1000) {
    rating = '⚠️  ACCEPTABLE (< 1s)';
  } else {
    rating = '🐌 SLOW (> 1s)';
  }
  console.log(`Performance Rating: ${rating}`);

  return {
    name,
    url,
    successCount,
    errorCount,
    avgDuration,
    minDuration,
    maxDuration,
    results
  };
}

async function runComprehensiveTest() {
  console.log('🔍 COMPREHENSIVE API SPEED TEST');
  console.log('================================');
  console.log(`⏱️  Testing ${TEST_COUNT} requests per endpoint`);
  console.log(`⏳ Delay between tests: 1 second\n`);

  // Test health endpoint (should succeed)
  const healthResults = await testEndpoint(HEALTH_URL, 'GET', null, 'Health Check');

  // Test notifications endpoint (should fail due to auth)
  const notificationsResults = await testEndpoint(NOTIFICATIONS_URL, 'POST', testPayload, 'Notifications');

  // Overall summary
  console.log('\n🎯 OVERALL TEST SUMMARY');
  console.log('=======================');
  console.log(`Health Check: ${healthResults.successCount}/${TEST_COUNT} successful (${healthResults.avgDuration.toFixed(2)}ms avg)`);
  console.log(`Notifications: ${notificationsResults.successCount}/${TEST_COUNT} successful (${notificationsResults.avgDuration.toFixed(2)}ms avg)`);

  // Interpretation
  console.log('\n💡 INTERPRETATION:');
  console.log('==================');
  
  if (healthResults.successCount === TEST_COUNT) {
    console.log('✅ Health endpoint working perfectly');
  } else {
    console.log('❌ Health endpoint has issues');
  }

  if (notificationsResults.errorCount === TEST_COUNT) {
    console.log('✅ Notifications endpoint correctly rejecting unauthorized requests');
    console.log('✅ Authentication is working as expected');
  } else if (notificationsResults.successCount > 0) {
    console.log('🎉 Some notification requests succeeded - Check authentication setup');
  } else {
    console.log('❌ Unexpected errors with notifications endpoint');
  }

  // Performance comparison
  const healthAvg = healthResults.avgDuration;
  const notificationsAvg = notificationsResults.avgDuration;
  
  console.log('\n⚡ PERFORMANCE COMPARISON:');
  console.log('==========================');
  console.log(`Health Check: ${healthAvg.toFixed(2)}ms average`);
  console.log(`Notifications: ${notificationsAvg.toFixed(2)}ms average`);
  
  if (Math.abs(healthAvg - notificationsAvg) < 50) {
    console.log('✅ Both endpoints have similar performance');
  } else if (notificationsAvg > healthAvg + 100) {
    console.log('⚠️  Notifications endpoint is significantly slower');
    console.log('   This might be due to authentication overhead or database queries');
  } else {
    console.log('✅ Notifications endpoint performance is acceptable');
  }

  return { healthResults, notificationsResults };
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error); 