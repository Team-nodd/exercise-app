// Comprehensive API Speed Test with Supabase Authentication
// Tests both health endpoint (no auth) and notifications endpoint (with service role auth)

const HEALTH_URL = 'http://localhost:3000/api/health';
const NOTIFICATIONS_URL = 'http://localhost:3000/api/notifications/send';
const TEST_COUNT = 5;
const DELAY_BETWEEN_TESTS = 1000; // 1 second

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file and ensure these variables are set.');
  process.exit(1);
}

// Test data for notifications (using real user IDs from your database)
const testPayload = {
  recipientId: "test-recipient-id", // This will be updated with a real user ID
  title: "Test Notification",
  message: "This is a test notification for speed testing",
  type: "test",
  relatedId: "test-workout-id"
};

// Function to get a real user ID from the database
async function getTestUserIds() {
  try {
    console.log('🔍 Fetching test user IDs from database...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=2`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const users = await response.json();
    
    if (users.length < 2) {
      console.warn('⚠️  Not enough users found for testing. Using fallback IDs.');
      return {
        senderId: 'test-sender-id',
        recipientId: 'test-recipient-id'
      };
    }

    console.log(`✅ Found ${users.length} users for testing`);
    return {
      senderId: users[0].id,
      recipientId: users[1].id
    };
  } catch (error) {
    console.error('❌ Error fetching test users:', error.message);
    console.log('⚠️  Using fallback test IDs');
    return {
      senderId: 'test-sender-id',
      recipientId: 'test-recipient-id'
    };
  }
}

// Function to create a test program relationship
async function createTestRelationship(senderId, recipientId) {
  try {
    console.log('🔗 Creating test program relationship...');
    console.log(`   Sender ID: ${senderId}`);
    console.log(`   Recipient ID: ${recipientId}`);
    
    const programData = {
      name: 'Test Program for API Testing',
      description: 'Temporary program for API speed testing',
      user_id: senderId,
      coach_id: recipientId,
      created_at: new Date().toISOString()
    };

    console.log('   Program data:', programData);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/programs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(programData)
    });

    console.log(`   Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️  Could not create test relationship: ${response.status} - ${errorText}`);
      return false;
    }

    console.log('✅ Test program relationship created successfully');
    return true;
  } catch (error) {
    console.warn('⚠️  Error creating test relationship:', error.message);
    return false;
  }
}

// Function to verify the relationship was created
async function verifyRelationship(senderId, recipientId) {
  try {
    console.log('🔍 Verifying relationship...');
    
    // Check if sender has recipient as coach
    const senderProgramsResponse = await fetch(`${SUPABASE_URL}/rest/v1/programs?user_id=eq.${senderId}&coach_id=eq.${recipientId}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (senderProgramsResponse.ok) {
      const senderPrograms = await senderProgramsResponse.json();
      console.log(`   Sender programs with recipient as coach: ${senderPrograms.length}`);
    }

    // Check if recipient has sender as coach
    const recipientProgramsResponse = await fetch(`${SUPABASE_URL}/rest/v1/programs?user_id=eq.${recipientId}&coach_id=eq.${senderId}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (recipientProgramsResponse.ok) {
      const recipientPrograms = await recipientProgramsResponse.json();
      console.log(`   Recipient programs with sender as coach: ${recipientPrograms.length}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error verifying relationship:', error.message);
    return false;
  }
}

async function testEndpoint(url, method = 'GET', payload = null, name = 'API', authHeaders = null) {
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
          ...authHeaders
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
  console.log('🔍 COMPREHENSIVE API SPEED TEST WITH AUTHENTICATION');
  console.log('==================================================');
  console.log(`⏱️  Testing ${TEST_COUNT} requests per endpoint`);
  console.log(`⏳ Delay between tests: 1 second\n`);

  // Get test user IDs
  const { senderId, recipientId } = await getTestUserIds();
  
  // Update test payload with real user IDs
  testPayload.recipientId = recipientId;
  
  console.log('\n📋 Test Configuration:');
  console.log(`   Sender ID: ${senderId}`);
  console.log(`   Recipient ID: ${recipientId}`);
  console.log(`   Test Payload:`, testPayload);
  
  // Create test relationships in both directions
  console.log('\n🔗 Setting up test relationships...');
  
  // Create relationship where sender is user and recipient is coach
  const relationship1 = await createTestRelationship(senderId, recipientId);
  
  // Create relationship where recipient is user and sender is coach
  const relationship2 = await createTestRelationship(recipientId, senderId);
  
  // Verify relationships
  await verifyRelationship(senderId, recipientId);
  await verifyRelationship(recipientId, senderId);
  
  if (!relationship1 && !relationship2) {
    console.log('⚠️  Could not create any test relationships. Tests may fail.');
  }

  // Test health endpoint (should succeed)
  const healthResults = await testEndpoint(HEALTH_URL, 'GET', null, 'Health Check');

  // Test notifications endpoint with service role authentication
  const authHeaders = {
    'X-Supabase-Auth': SUPABASE_SERVICE_ROLE_KEY,
    'X-Test-User-Id': senderId
  };
  
  const notificationsResults = await testEndpoint(NOTIFICATIONS_URL, 'POST', testPayload, 'Notifications', authHeaders);

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

  if (notificationsResults.successCount === TEST_COUNT) {
    console.log('🎉 All notification requests succeeded!');
    console.log('✅ Authentication and authorization working perfectly');
  } else if (notificationsResults.successCount > 0) {
    console.log('⚠️  Some notification requests succeeded, some failed');
    console.log('   This might be due to relationship validation issues');
  } else {
    console.log('❌ All notification requests failed');
    console.log('   Check authentication setup and relationship validation');
    console.log('   Relationship setup status:');
    console.log(`   - Sender → Recipient: ${relationship1 ? '✅ Created' : '❌ Failed'}`);
    console.log(`   - Recipient → Sender: ${relationship2 ? '✅ Created' : '❌ Failed'}`);
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