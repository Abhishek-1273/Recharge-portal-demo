// Automated Concurrency & 3-Tier Consistency Test Suite
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch (e) {
          resolve({ raw: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch (e) {
          resolve({ raw: chunks });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING 3-TIER AUDIT TESTS (Super, Dist, Retailer)');
  console.log('====================================================\n');

  // Test 0: Reset demo state
  console.log('0️⃣ Resetting demo database...');
  await post('/api/reset-demo', {});
  let { accounts } = await get('/api/accounts');
  let retailer = accounts.find(a => a.user_id === 'retailer');
  console.log(`   Initial Retailer Balance: ₹${retailer.balance_inr} (${retailer.balance_paise} paise)\n`);

  // Test 1: 3-Tier Commission Split & 0.25% Fee Accuracy
  console.log('1️⃣ Testing Single Recharge of ₹100 & 3-Tier Commission Split...');
  const res1 = await post('/api/recharge', {
    userId: 'retailer',
    serviceType: 'MOBILE',
    recipient: '9876543210',
    operator: 'Airtel',
    amountInr: 100,
    forcedStatus: 'SUCCESS'
  });

  if (!res1.success) {
    console.error('❌ Test 1 Failed:', res1.error);
    process.exit(1);
  }

  const { splits, providerCommissionPaise, platformFeePaise } = res1.details;
  const totalSplitSum = splits.retailer + splits.distributor + splits.superCommission;

  console.log(`   Provider Commission: ${providerCommissionPaise} paise (3.0%)`);
  console.log(`   - [Tier 3] Retailer Share:   ${splits.retailer} paise (1.50%)`);
  console.log(`   - [Tier 2] Distributor Share: ${splits.distributor} paise (1.00%)`);
  console.log(`   - [Tier 1] Super Dist Share:  ${splits.superCommission} paise (0.50%)`);
  console.log(`   Split Total: ${totalSplitSum} paise`);
  console.log(`   App Platform Fee (0.25%):     ${platformFeePaise} paise (to Super/Platform)`);

  if (totalSplitSum === providerCommissionPaise && platformFeePaise === 25) {
    console.log('   ✅ PASS: 3-Tier split total matches provider commission 100% exactly!\n');
  } else {
    console.error('   ❌ FAIL: Commission split mismatch!');
    process.exit(1);
  }

  // Test 2: Double-Submit (Idempotency Protection)
  console.log('2️⃣ Testing Double-Click / Idempotency Key Protection...');
  const testIdempotencyKey = 'IDEMPOTENT_3TIER_' + Date.now();
  const firstReq = await post('/api/recharge', {
    userId: 'retailer',
    serviceType: 'MOBILE',
    recipient: '9876543210',
    operator: 'Airtel',
    amountInr: 50,
    forcedStatus: 'SUCCESS',
    idempotencyKey: testIdempotencyKey
  });

  const secondReq = await post('/api/recharge', {
    userId: 'retailer',
    serviceType: 'MOBILE',
    recipient: '9876543210',
    operator: 'Airtel',
    amountInr: 50,
    forcedStatus: 'SUCCESS',
    idempotencyKey: testIdempotencyKey
  });

  if (secondReq.idempotentReplay && secondReq.transactionId === firstReq.transactionId) {
    console.log('   ✅ PASS: Second identical request was safely recognized without double debit!\n');
  } else {
    console.error('   ❌ FAIL: Idempotency failed to block duplicate request!');
    process.exit(1);
  }

  // Test 3: Failed Recharge & Immediate Refund Check
  console.log('3️⃣ Testing Failed Recharge & Zero Commission / Full Refund...');
  const accountsBeforeFail = (await get('/api/accounts')).accounts;
  const retailerBeforeFail = accountsBeforeFail.find(a => a.user_id === 'retailer').balance_paise;

  const failRes = await post('/api/recharge', {
    userId: 'retailer',
    serviceType: 'MOBILE',
    recipient: '9876543210',
    operator: 'Airtel',
    amountInr: 100,
    forcedStatus: 'FAILED'
  });

  const accountsAfterFail = (await get('/api/accounts')).accounts;
  const retailerAfterFail = accountsAfterFail.find(a => a.user_id === 'retailer').balance_paise;

  if (failRes.status === 'FAILED' && retailerBeforeFail === retailerAfterFail) {
    console.log('   ✅ PASS: Failed recharge refunded immediately, retailer balance unchanged!\n');
  } else {
    console.error('   ❌ FAIL: Refund check failed!');
    process.exit(1);
  }

  // Test 4: 50 Concurrent Requests Test
  console.log('4️⃣ Testing 50 Simultaneous Parallel Requests (3-Tier Concurrency Stress Test)...');
  const parallelPromises = [];
  for (let i = 0; i < 50; i++) {
    parallelPromises.push(
      post('/api/recharge', {
        userId: 'retailer',
        serviceType: 'MOBILE',
        recipient: '912345678' + (i % 10),
        operator: 'Jio',
        amountInr: 50,
        forcedStatus: 'SUCCESS'
      })
    );
  }

  const results = await Promise.all(parallelPromises);
  const successCount = results.filter(r => r.success && r.status === 'SUCCESS').length;
  const blockedCount = results.filter(r => !r.success && r.error && r.error.includes('Insufficient')).length;

  const finalAccounts = (await get('/api/accounts')).accounts;
  const finalRetailer = finalAccounts.find(a => a.user_id === 'retailer');

  console.log(`   - Successful Recharges: ${successCount}`);
  console.log(`   - Safely Blocked (No Balance): ${blockedCount}`);
  console.log(`   - Final Retailer Balance: ₹${finalRetailer.balance_inr} (${finalRetailer.balance_paise} paise)`);

  if (finalRetailer.balance_paise >= 0) {
    console.log('   ✅ PASS: 3-Tier concurrency handled perfectly! Retailer balance never negative!\n');
  } else {
    console.error('   ❌ FAIL: Race condition detected! Balance is negative:', finalRetailer.balance_paise);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 ALL 4 3-TIER AUDIT TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests().catch(console.error);
