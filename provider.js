// Pay2All Sandbox Engine & Operator Commission Calculator
// Simulates live Pay2All API v1 responses & Webhooks

const PAY2ALL_MARGINS = {
  'Airtel': 0.0210, // 2.10% Pay2All Gross Commission
  'Jio': 0.0260,    // 2.60% Pay2All Gross Commission
  'Vi': 0.0340,     // 3.40% Pay2All Gross Commission
  'BSNL': 0.0450,   // 4.50% Pay2All Gross Commission
  'DTH': 0.0320,    // 3.20% Pay2All Gross Commission
  'Default': 0.0250 // 2.50% Standard
};

function getPay2AllMargin(operator) {
  return PAY2ALL_MARGINS[operator] || PAY2ALL_MARGINS['Default'];
}

function callRechargeProvider({ transactionId, recipient, operator, amountPaise, forcedStatus }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let status;

      if (forcedStatus && ['SUCCESS', 'FAILED', 'PENDING'].includes(forcedStatus.toUpperCase())) {
        status = forcedStatus.toUpperCase();
      } else {
        // Realistic distribution: 75% Success, 15% Pending, 10% Failed
        const rand = Math.random();
        if (rand < 0.75) {
          status = 'SUCCESS';
        } else if (rand < 0.90) {
          status = 'PENDING';
        } else {
          status = 'FAILED';
        }
      }

      const marginRate = getPay2AllMargin(operator);
      // Actual gross commission returned by Pay2All from telecom operator
      const operatorCommissionPaise = Math.round(amountPaise * marginRate);
      const operatorCommissionInr = (operatorCommissionPaise / 100).toFixed(2);

      const pay2allOrderId = 'P2A_' + Date.now();
      const operatorRef = 'BRN' + Math.floor(10000000 + Math.random() * 90000000);

      resolve({
        provider: 'Pay2All Sandbox',
        pay2allOrderId,
        providerRef: operatorRef,
        operatorRef,
        status,
        marginPercent: (marginRate * 100).toFixed(2) + '%',
        operatorCommissionPaise,
        operatorCommissionInr,
        amountInr: (amountPaise / 100).toFixed(2),
        timestamp: new Date().toISOString()
      });
    }, 350);
  });
}

module.exports = {
  callRechargeProvider,
  getPay2AllMargin,
  PAY2ALL_MARGINS
};
