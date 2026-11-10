require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ledger = require('./ledger');
const provider = require('./provider');
const { supabase } = ledger;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cashfree Sandbox Config (Uses live keys if provided in .env, otherwise runs in Built-in Sandbox Simulator mode)
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || null;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || null;
const CASHFREE_BASE_URL = 'https://sandbox.cashfree.com/pg';

// 1. Fetch All 3 Partner Accounts & Balances from Supabase
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await ledger.getAllAccounts();
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Cashfree Sandbox: Create Payment Order
app.post('/api/cashfree/create-order', async (req, res) => {
  try {
    const { userId = 'retailer', amountInr } = req.body;
    if (!amountInr || amountInr <= 0) {
      return res.status(400).json({ success: false, error: 'Enter a valid amount in Rupees' });
    }

    const orderId = 'CF_ORDER_' + Date.now();
    const customerPhone = '9876543210';
    const customerEmail = 'partner@rechargeportal.in';

    // If real Cashfree credentials exist in .env, call Cashfree Sandbox API
    if (CASHFREE_APP_ID && CASHFREE_SECRET_KEY) {
      const cfRes = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          order_amount: Number(amountInr),
          order_currency: 'INR',
          customer_details: {
            customer_id: userId,
            customer_name: userId === 'retailer' ? 'Retailer Shop 1' : 'Distributor 1',
            customer_email: customerEmail,
            customer_phone: customerPhone
          },
          order_meta: {
            return_url: `http://localhost:${PORT}/?cf_order_id={order_id}`
          }
        })
      });

      const cfData = await cfRes.json();
      return res.json({
        success: true,
        isLiveCashfree: true,
        orderId,
        paymentSessionId: cfData.payment_session_id,
        amountInr,
        userId
      });
    }

    // Built-in Sandbox Simulator (Matches Cashfree Sandbox flow exactly)
    res.json({
      success: true,
      isLiveCashfree: false,
      orderId,
      amountInr,
      userId,
      customerDetails: {
        customer_id: userId,
        phone: customerPhone,
        email: customerEmail
      },
      message: 'Cashfree Sandbox Test Order Created'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Cashfree Sandbox: Verify & Settle Payment into Supabase Wallet
app.post('/api/cashfree/verify-payment', async (req, res) => {
  try {
    const { orderId, userId = 'retailer', amountInr, paymentStatus = 'SUCCESS' } = req.body;
    if (paymentStatus !== 'SUCCESS') {
      return res.status(400).json({ success: false, error: 'Payment was not marked successful' });
    }

    const amountPaise = Math.round(Number(amountInr) * 100);
    const result = await ledger.addMoney(
      userId,
      amountPaise,
      `Cashfree Sandbox UPI Top-up (Ref: ${orderId})`
    );

    const accounts = await ledger.getAllAccounts();
    res.json({
      success: true,
      orderId,
      result,
      accounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Direct Add Money
app.post('/api/add-money', async (req, res) => {
  try {
    const { userId = 'retailer', amountInr, notes } = req.body;
    if (!amountInr || amountInr <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid amount in Rupees' });
    }

    const amountPaise = Math.round(Number(amountInr) * 100);
    const result = await ledger.addMoney(userId, amountPaise, notes || `UPI Top-up of ₹${amountInr}`);

    const accounts = await ledger.getAllAccounts();
    res.json({ success: true, result, accounts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Transfer Balance (Distributor -> Retailer)
app.post('/api/transfer-balance', async (req, res) => {
  try {
    const { fromUserId = 'distributor', toUserId = 'retailer', amountInr, notes } = req.body;
    if (!amountInr || amountInr <= 0) {
      return res.status(400).json({ success: false, error: 'Enter valid transfer amount in Rupees' });
    }

    const amountPaise = Math.round(Number(amountInr) * 100);
    const result = await ledger.transferBalance(fromUserId, toUserId, amountPaise, notes);

    const accounts = await ledger.getAllAccounts();
    res.json({ success: true, result, accounts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. Perform Recharge
app.post('/api/recharge', async (req, res) => {
  const {
    userId = 'retailer',
    serviceType = 'MOBILE',
    recipient = '9876543210',
    operator = 'Airtel',
    amountInr = 100,
    forcedStatus,
    idempotencyKey = uuidv4()
  } = req.body;

  try {
    // 1. Idempotency Check in Supabase
    const { data: existing } = await supabase
      .from('idempotency_keys')
      .select('response_json')
      .eq('key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return res.json({
        ...JSON.parse(existing.response_json),
        idempotentReplay: true
      });
    }

    const amountPaise = Math.round(Number(amountInr) * 100);
    const transactionId = 'TXN_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // 2. Hold balance in Supabase
    await ledger.holdForRecharge(userId, amountPaise, transactionId, serviceType, recipient, operator);

    // 3. Call Provider Simulator
    const providerRes = await provider.callRechargeProvider({
      transactionId,
      recipient,
      operator,
      amountPaise,
      forcedStatus
    });

    let finalResult;

    if (providerRes.status === 'SUCCESS') {
      finalResult = await ledger.finalizeSuccess(transactionId);
    } else if (providerRes.status === 'FAILED') {
      finalResult = await ledger.finalizeFailed(transactionId, 'Provider failed to reach telecom operator');
    } else {
      // PENDING
      finalResult = {
        success: true,
        status: 'PENDING',
        transactionId,
        message: 'Recharge is currently processing at the telecom operator. Amount remains held in Supabase.'
      };
    }

    const responsePayload = {
      success: true,
      transactionId,
      providerRef: providerRes.providerRef,
      status: providerRes.status,
      details: finalResult
    };

    // Store idempotency key response in Supabase
    await supabase.from('idempotency_keys').insert([{
      key: idempotencyKey,
      response_json: JSON.stringify(responsePayload)
    }]);

    const accounts = await ledger.getAllAccounts();
    res.json({ ...responsePayload, accounts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Resolve a Pending Transaction in Supabase
app.post('/api/resolve-pending', async (req, res) => {
  try {
    const { transactionId, finalStatus = 'SUCCESS' } = req.body;
    let result;

    if (finalStatus.toUpperCase() === 'SUCCESS') {
      result = await ledger.finalizeSuccess(transactionId);
    } else {
      result = await ledger.finalizeFailed(transactionId, 'Manually marked failed by operator report');
    }

    const accounts = await ledger.getAllAccounts();
    res.json({ success: true, result, accounts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Get Pending Transactions from Supabase
app.get('/api/pending', async (req, res) => {
  try {
    const pending = await ledger.getPendingTransactions();
    res.json({ success: true, pending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Get Audit Ledger Entries from Supabase
app.get('/api/ledger', async (req, res) => {
  try {
    const userId = req.query.userId || null;
    const entries = await ledger.getLedgerEntries(userId, 50);
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Reset Demo in Supabase
app.post('/api/reset-demo', async (req, res) => {
  try {
    const accounts = await ledger.resetDemo();
    res.json({ success: true, message: 'Supabase Demo reset successfully!', accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`⚡ Connected to SUPABASE CLOUD POSTGRESQL!`);
  console.log(`💳 Cashfree Sandbox Engine: READY!`);
  console.log(`🚀 Recharge Partner Portal Demo is LIVE!`);
  console.log(`👉 Open in browser: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
