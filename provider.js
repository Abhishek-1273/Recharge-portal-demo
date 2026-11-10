// Fake Recharge Provider Simulator
// Simulates live provider responses (KwikAPI, Pay2All, BBPS)

function callRechargeProvider({ transactionId, recipient, operator, amountPaise, forcedStatus }) {
  return new Promise((resolve) => {
    // Simulate real network delay (300ms)
    setTimeout(() => {
      let status;

      if (forcedStatus && ['SUCCESS', 'FAILED', 'PENDING'].includes(forcedStatus.toUpperCase())) {
        status = forcedStatus.toUpperCase();
      } else {
        // Realistic distribution: 70% Success, 15% Failed, 15% Pending
        const rand = Math.random();
        if (rand < 0.70) {
          status = 'SUCCESS';
        } else if (rand < 0.85) {
          status = 'PENDING';
        } else {
          status = 'FAILED';
        }
      }

      const providerRef = 'REF_' + Math.random().toString(36).substring(2, 10).toUpperCase();

      resolve({
        providerRef,
        status,
        timestamp: new Date().toISOString()
      });
    }, 300);
  });
}

module.exports = {
  callRechargeProvider
};

