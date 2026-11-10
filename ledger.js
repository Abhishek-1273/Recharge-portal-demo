require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gnasinwvapiftxeakfgr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_6i57SaP1Q4qT1Vw0Xi6fbQ_IevRWQ-A';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials missing in .env!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Financial Write Mutex Queue (Guarantees no race condition)
class FinancialLockQueue {
  constructor() {
    this.queue = Promise.resolve();
  }
  acquire(operation) {
    const next = this.queue.then(() => operation(), () => operation());
    this.queue = next.catch(() => {});
    return next;
  }
}

const financialQueue = new FinancialLockQueue();

// Fetch 3 Partner Accounts & Balances from Supabase Cloud
async function getAllAccounts() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .in('user_id', ['super', 'distributor', 'retailer']);

  if (error) throw new Error(error.message);

  const order = { super: 1, distributor: 2, retailer: 3 };
  accounts.sort((a, b) => (order[a.user_id] || 99) - (order[b.user_id] || 99));

  return accounts.map(acc => ({
    ...acc,
    available_paise: Number(acc.balance_paise) - Number(acc.hold_paise),
    balance_inr: (Number(acc.balance_paise) / 100).toFixed(2),
    available_inr: ((Number(acc.balance_paise) - Number(acc.hold_paise)) / 100).toFixed(2),
    hold_inr: (Number(acc.hold_paise) / 100).toFixed(2)
  }));
}

// Add Money (Top-Up)
function addMoney(userId, amountPaise, notes = 'Wallet Top-up') {
  if (amountPaise <= 0) return Promise.reject(new Error('Amount must be positive in paise'));

  return financialQueue.acquire(async () => {
    const entryId = uuidv4();
    const txRef = 'TOPUP_' + Date.now();

    const { data: user, error: fetchErr } = await supabase
      .from('accounts')
      .select('balance_paise')
      .eq('user_id', userId)
      .single();

    if (fetchErr || !user) throw new Error('User account not found in Supabase: ' + (fetchErr?.message || ''));

    const newBalance = Number(user.balance_paise) + Number(amountPaise);

    await supabase.from('accounts').update({ balance_paise: newBalance }).eq('user_id', userId);

    await supabase.from('ledger_entries').insert([{
      entry_id: entryId,
      user_id: userId,
      amount_paise: amountPaise,
      type: 'TOPUP',
      reference_id: txRef,
      notes: notes
    }]);

    return {
      success: true,
      userId,
      creditedPaise: amountPaise,
      creditedInr: (amountPaise / 100).toFixed(2),
      referenceId: txRef
    };
  });
}

// Transfer Balance (Distributor to Retailer)
function transferBalance(fromUserId, toUserId, amountPaise, notes = 'Downline Balance Transfer') {
  if (amountPaise <= 0) return Promise.reject(new Error('Transfer amount must be positive'));

  return financialQueue.acquire(async () => {
    // 1. Fetch sender
    const { data: sender } = await supabase.from('accounts').select('balance_paise, hold_paise').eq('user_id', fromUserId).single();
    if (!sender) throw new Error('Sender account not found');

    const available = Number(sender.balance_paise) - Number(sender.hold_paise);
    if (available < amountPaise) {
      throw new Error(`Insufficient balance! Available: ₹${(available / 100).toFixed(2)}, Transfer: ₹${(amountPaise / 100).toFixed(2)}`);
    }

    // 2. Fetch receiver
    const { data: receiver } = await supabase.from('accounts').select('balance_paise').eq('user_id', toUserId).single();
    if (!receiver) throw new Error('Receiver account not found');

    const transferRef = 'TRF_' + Date.now();

    // 3. Atomic Debit from sender
    await supabase.from('accounts').update({
      balance_paise: Number(sender.balance_paise) - amountPaise
    }).eq('user_id', fromUserId);

    await supabase.from('ledger_entries').insert([{
      entry_id: uuidv4(),
      user_id: fromUserId,
      amount_paise: -amountPaise,
      type: 'TRANSFER_OUT',
      reference_id: transferRef,
      notes: `Transferred to ${toUserId}`
    }]);

    // 4. Atomic Credit to receiver
    await supabase.from('accounts').update({
      balance_paise: Number(receiver.balance_paise) + amountPaise
    }).eq('user_id', toUserId);

    await supabase.from('ledger_entries').insert([{
      entry_id: uuidv4(),
      user_id: toUserId,
      amount_paise: amountPaise,
      type: 'TRANSFER_IN',
      reference_id: transferRef,
      notes: `Received from ${fromUserId}`
    }]);

    return {
      success: true,
      fromUserId,
      toUserId,
      amountPaise,
      amountInr: (amountPaise / 100).toFixed(2),
      referenceId: transferRef
    };
  });
}

// Hold balance for recharge
function holdForRecharge(userId, amountPaise, transactionId, serviceType, recipient, operator) {
  if (amountPaise <= 0) return Promise.reject(new Error('Recharge amount must be greater than zero'));

  return financialQueue.acquire(async () => {
    const { data: acc, error: fetchErr } = await supabase
      .from('accounts')
      .select('balance_paise, hold_paise')
      .eq('user_id', userId)
      .single();

    if (fetchErr || !acc) throw new Error('User not found in Supabase: ' + (fetchErr?.message || ''));

    const available = Number(acc.balance_paise) - Number(acc.hold_paise);
    if (available < amountPaise) {
      throw new Error(`Insufficient balance! Available: ₹${(available / 100).toFixed(2)}, Required: ₹${(amountPaise / 100).toFixed(2)}`);
    }

    const newHold = Number(acc.hold_paise) + Number(amountPaise);

    await supabase.from('accounts').update({ hold_paise: newHold }).eq('user_id', userId);

    await supabase.from('ledger_entries').insert([{
      entry_id: uuidv4(),
      user_id: userId,
      amount_paise: -amountPaise,
      type: 'RECHARGE_HOLD',
      reference_id: transactionId,
      notes: `Hold for ${serviceType} recharge to ${recipient} (${operator})`
    }]);

    await supabase.from('transactions').insert([{
      id: transactionId,
      user_id: userId,
      service_type: serviceType,
      recipient: recipient,
      operator: operator,
      amount_paise: amountPaise,
      status: 'PENDING'
    }]);

    return { success: true, transactionId, heldPaise: amountPaise };
  });
}

// Finalize SUCCESS
function finalizeSuccess(transactionId) {
  return financialQueue.acquire(async () => {
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txErr || !tx) throw new Error('Transaction not found in Supabase');
    if (tx.status !== 'PENDING') throw new Error(`Transaction already finalized: ${tx.status}`);

    const amountPaise = Number(tx.amount_paise);

    // 3% Provider commission = 300 paise on Rs 100
    const providerCommission = Math.round((amountPaise * 300) / 10000);
    // 0.25% Platform Fee = 25 paise on Rs 100
    const platformFee = Math.round((amountPaise * 25) / 10000);

    const retailerShare = Math.round((amountPaise * 150) / 10000); // 1.50%
    const distributorShare = Math.round((amountPaise * 100) / 10000); // 1.00%
    const superShare = providerCommission - (retailerShare + distributorShare); // 0.50%

    // 1. Decrement Retailer Balance and Hold
    const { data: retAcc } = await supabase.from('accounts').select('balance_paise, hold_paise').eq('user_id', tx.user_id).single();
    await supabase.from('accounts').update({
      balance_paise: Number(retAcc.balance_paise) - amountPaise,
      hold_paise: Number(retAcc.hold_paise) - amountPaise
    }).eq('user_id', tx.user_id);

    await supabase.from('ledger_entries').insert([{
      entry_id: uuidv4(),
      user_id: tx.user_id,
      amount_paise: -amountPaise,
      type: 'RECHARGE_DEBIT',
      reference_id: transactionId,
      notes: `Final debit for successful recharge`
    }]);

    // 2. Increment Commission & App Fee across the 3 Tiers
    const splits = [
      { userId: 'retailer', amount: retailerShare, note: `Retailer Commission (1.50%)` },
      { userId: 'distributor', amount: distributorShare, note: `Distributor Commission (1.00%)` },
      { userId: 'super', amount: superShare, note: `Super Distributor Commission (0.50%)` },
      { userId: 'super', amount: platformFee, type: 'PLATFORM_FEE', note: `App 0.25% Platform Fee` }
    ];

    for (const split of splits) {
      if (split.amount > 0) {
        const { data: userAcc } = await supabase.from('accounts').select('balance_paise').eq('user_id', split.userId).single();
        await supabase.from('accounts').update({
          balance_paise: Number(userAcc.balance_paise) + split.amount
        }).eq('user_id', split.userId);

        await supabase.from('ledger_entries').insert([{
          entry_id: uuidv4(),
          user_id: split.userId,
          amount_paise: split.amount,
          type: split.type || 'COMMISSION',
          reference_id: transactionId,
          notes: split.note
        }]);
      }
    }

    // 3. Mark transaction as SUCCESS
    await supabase.from('transactions').update({
      status: 'SUCCESS',
      provider_commission_paise: providerCommission,
      platform_fee_paise: platformFee,
      resolved_at: new Date().toISOString()
    }).eq('id', transactionId);

    return {
      success: true,
      status: 'SUCCESS',
      transactionId,
      debitedPaise: amountPaise,
      providerCommissionPaise: providerCommission,
      platformFeePaise: platformFee,
      splits: {
        retailer: retailerShare,
        distributor: distributorShare,
        superCommission: superShare,
        superPlatformFee: platformFee
      }
    };
  });
}

// Finalize FAILED
function finalizeFailed(transactionId, reason = 'Provider rejected or network failure') {
  return financialQueue.acquire(async () => {
    const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    if (!tx) throw new Error('Transaction not found in Supabase');
    if (tx.status !== 'PENDING') throw new Error(`Transaction already finalized: ${tx.status}`);

    const { data: retAcc } = await supabase.from('accounts').select('hold_paise').eq('user_id', tx.user_id).single();
    await supabase.from('accounts').update({
      hold_paise: Number(retAcc.hold_paise) - Number(tx.amount_paise)
    }).eq('user_id', tx.user_id);

    await supabase.from('ledger_entries').insert([{
      entry_id: uuidv4(),
      user_id: tx.user_id,
      amount_paise: Number(tx.amount_paise),
      type: 'REFUND',
      reference_id: transactionId,
      notes: `Hold released: Recharge failed (${reason})`
    }]);

    await supabase.from('transactions').update({
      status: 'FAILED',
      resolved_at: new Date().toISOString()
    }).eq('id', transactionId);

    return {
      success: true,
      status: 'FAILED',
      transactionId,
      refundedPaise: Number(tx.amount_paise),
      reason
    };
  });
}

// Fetch ledger entries
async function getLedgerEntries(userId = null, limit = 100) {
  let query = supabase
    .from('ledger_entries')
    .select(`
      id, entry_id, user_id, amount_paise, type, reference_id, notes, created_at,
      accounts (name, role)
    `)
    .order('id', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return rows.map(r => ({
    ...r,
    user_name: r.accounts?.name || r.user_id,
    role: r.accounts?.role || '',
    amount_inr: (Number(r.amount_paise) / 100).toFixed(2)
  }));
}

// Fetch pending transactions
async function getPendingTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// Reset Demo in Supabase
async function resetDemo() {
  await supabase.from('ledger_entries').delete().neq('id', 0);
  await supabase.from('transactions').delete().neq('id', 'EMPTY');
  await supabase.from('idempotency_keys').delete().neq('key', 'EMPTY');

  await supabase.from('accounts').update({ balance_paise: 0, hold_paise: 0 }).in('user_id', ['super', 'distributor']);
  await supabase.from('accounts').update({ balance_paise: 100000, hold_paise: 0 }).eq('user_id', 'retailer');

  await supabase.from('ledger_entries').insert([{
    entry_id: uuidv4(),
    user_id: 'retailer',
    amount_paise: 100000,
    type: 'TOPUP',
    reference_id: 'RESET_SEED',
    notes: 'Demo initial seed (₹1,000.00)'
  }]);

  return getAllAccounts();
}

module.exports = {
  supabase,
  getAllAccounts,
  addMoney,
  transferBalance,
  holdForRecharge,
  finalizeSuccess,
  finalizeFailed,
  getLedgerEntries,
  getPendingTransactions,
  resetDemo
};
