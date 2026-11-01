/**
 * Where a user's personal data lives. "Download my data" and "Delete my account" are driven by
 * this list, so anyone adding a new per-user collection or table MUST add it here.
 */
module.exports = {
  // Collections with one document per attempt, each carrying a `userId` field.
  docsByField: ['oir_results', 'ppdt_results', 'tat_results', 'wat_results', 'srt_results'],
  // Collections where the document id is the user id.
  docsById: ['piqs', 'users'],
  // Supabase tables keyed by `user_id`. `export` is the column list returned to the user.
  supabaseTables: [
    { table: 'profiles', export: 'user_id, email, username, is_premium, plan_type, subscription_status, premium_expires_at, updated_at', onDelete: 'delete' },
    { table: 'premium_members', export: 'user_id, email, username, plan_type, subscription_status, premium_expires_at, order_id, payment_id, amount_inr, updated_at', onDelete: 'delete' },
    // Payment records must be kept for accounting: strip identity and gateway payload instead of deleting.
    { table: 'payment_transactions', export: 'txnid, amount, status, provider_reference_id, created_at', onDelete: 'anonymise' }
  ]
};
