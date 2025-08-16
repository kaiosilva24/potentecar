// Test script to check debt values in database
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

async function testDebtValues() {
  try {
    console.log('🔍 Testing debt values in database...');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch all debts
    const { data: debts, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching debts:', error);
      return;
    }
    
    console.log(`📊 Found ${debts.length} debts in database:`);
    
    debts.forEach((debt, index) => {
      console.log(`\n--- Debt ${index + 1} ---`);
      console.log(`ID: ${debt.id}`);
      console.log(`Description: ${debt.description}`);
      console.log(`Total Amount: ${debt.total_amount} (type: ${typeof debt.total_amount})`);
      console.log(`Paid Amount: ${debt.paid_amount} (type: ${typeof debt.paid_amount})`);
      console.log(`Remaining Amount: ${debt.remaining_amount} (type: ${typeof debt.remaining_amount})`);
      console.log(`Status: ${debt.status}`);
      console.log(`Creditor: ${debt.creditor}`);
      console.log(`Created: ${debt.created_at}`);
      console.log(`Updated: ${debt.updated_at}`);
    });
    
    // Test updating a debt's paid_amount
    if (debts.length > 0) {
      const firstDebt = debts[0];
      const testPaidAmount = 100.50;
      
      console.log(`\n🧪 Testing update of debt ${firstDebt.id} with paid_amount: ${testPaidAmount}`);
      
      const { data: updatedDebt, error: updateError } = await supabase
        .from('debts')
        .update({ 
          paid_amount: testPaidAmount,
          remaining_amount: firstDebt.total_amount - testPaidAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', firstDebt.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating debt:', updateError);
      } else {
        console.log('✅ Debt updated successfully:');
        console.log(`New Paid Amount: ${updatedDebt.paid_amount} (type: ${typeof updatedDebt.paid_amount})`);
        console.log(`New Remaining Amount: ${updatedDebt.remaining_amount} (type: ${typeof updatedDebt.remaining_amount})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDebtValues();
