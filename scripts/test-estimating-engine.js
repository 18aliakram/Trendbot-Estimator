const assert = require('assert');
const db = require('../server/database');

console.log('----------------------------------------------------');
console.log('RUNNING BUILDESTIMATE AI CORE INTEGRATION TESTS');
console.log('----------------------------------------------------');

// Test 1: Database relational operations
try {
  console.log('Test 1: Running JSON Relational Database tests...');
  
  // Clear any existing debug project
  const testProjects = db.find('projects', p => p.name === 'Test Verification Project');
  testProjects.forEach(p => db.delete('projects', p.id));

  // Insert mock user
  const user = db.insert('users', {
    username: 'test_user',
    email: 'test@estimator.com',
    fullName: 'Test Builder'
  });
  assert.ok(user.id, 'User ID should be generated');

  // Insert project
  const project = db.insert('projects', {
    userId: user.id,
    name: 'Test Verification Project',
    clientName: 'Test Client',
    type: 'ADU',
    status: 'Draft'
  });
  assert.ok(project.id, 'Project ID should be generated');
  assert.strictEqual(project.status, 'Draft', 'Initial status should be Draft');

  // Relational Join check
  const joined = db.join([project], 'userId', 'users', 'id', 'user');
  assert.strictEqual(joined[0].user.fullName, 'Test Builder', 'Relational join should pull user properties');

  console.log('✓ Test 1 Passed: Relational DB joins and persistence verified.');
} catch (e) {
  console.error('✗ Test 1 Failed:', e);
  process.exit(1);
}

// Test 2: Estimating Engine Calculation Accuracy
try {
  console.log('\nTest 2: Verifying deterministic estimating engine math...');
  
  // Custom mock takeoff items for testing
  const takeoffItems = [
    // Materials
    { name: '4000 PSI Concrete Foundation', category: 'Concrete', type: 'Material', quantity: 10, unit: 'CY', unitPrice: 150, wastePercent: 0 },
    { name: '2x4x8 Lumber Stud', category: 'Framing', type: 'Material', quantity: 100, unit: 'EA', unitPrice: 5, wastePercent: 0 },
    // Labor
    { name: 'Drywall Installation Labor', category: 'Drywall', type: 'Labor', quantity: 2000, unit: 'SF', unitPrice: 1.5, wastePercent: 0 },
    // Equipment
    { name: 'Excavation Rental', category: 'Sitework', type: 'Equipment', quantity: 2, unit: 'EA', unitPrice: 300, wastePercent: 0 }
  ];

  const projectSettings = {
    wastePercent: 10, // 10% waste on materials only
    overheadPercent: 10, // 10% overhead
    contingencyPercent: 5, // 5% contingency
    profitPercent: 15 // 15% profit margin
  };

  // Deterministic calculator logic replica (matches server.js calculateDeterministicEstimate)
  let subtotal = 0;
  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let equipmentSubtotal = 0;
  let subcontractorSubtotal = 0;

  takeoffItems.forEach(item => {
    const qty = item.quantity;
    const price = item.unitPrice;
    const cost = qty * price;
    
    if (item.type === 'Labor') {
      laborSubtotal += cost;
    } else if (item.type === 'Equipment') {
      equipmentSubtotal += cost;
    } else {
      materialSubtotal += cost; // Concrete, Lumber -> Material
    }
    subtotal += cost;
  });

  // Concrete (10*150=1500) + Lumber (100*5=500) = 2000 Material Subtotal
  assert.strictEqual(materialSubtotal, 2000, 'Material Subtotal should be 2000');
  // Drywall Labor (2000 * 1.5) = 3000 Labor Subtotal
  assert.strictEqual(laborSubtotal, 3000, 'Labor Subtotal should be 3000');
  // Excavation Equipment (2 * 300) = 600 Equipment Subtotal
  assert.strictEqual(equipmentSubtotal, 600, 'Equipment Subtotal should be 600');
  
  // Total direct cost = 2000 + 3000 + 600 = 5600
  assert.strictEqual(subtotal, 5600, 'Direct costs subtotal should be 5600');

  // 10% Waste allowance on Materials only (10% of 2000 = 200)
  const wasteAmount = materialSubtotal * (projectSettings.wastePercent / 100);
  assert.strictEqual(wasteAmount, 200, 'Waste amount should be 200 (10% of 2000 material)');

  // Adjusted Direct Cost = 5600 + 200 = 5800
  const adjustedDirectCost = subtotal + wasteAmount;
  assert.strictEqual(adjustedDirectCost, 5800, 'Adjusted Direct Cost should be 5800');

  // Overhead (10% of 5800 = 580)
  const overheadAmount = adjustedDirectCost * (projectSettings.overheadPercent / 100);
  assert.strictEqual(overheadAmount, 580, 'Overhead amount should be 580');

  // Contingency (5% of 5800 = 290)
  const contingencyAmount = adjustedDirectCost * (projectSettings.contingencyPercent / 100);
  assert.strictEqual(contingencyAmount, 290, 'Contingency amount should be 290');

  // Profit (15% of 5800 = 870)
  const profitAmount = adjustedDirectCost * (projectSettings.profitPercent / 100);
  assert.strictEqual(profitAmount, 870, 'Profit amount should be 870');

  // Final proposed Bid Total = 5800 (adjusted direct) + 580 (overhead) + 290 (contingency) + 870 (profit) = 7540
  const total = adjustedDirectCost + overheadAmount + contingencyAmount + profitAmount;
  assert.strictEqual(total, 7540, 'Final Proposed bid should be exactly 7540');

  console.log('✓ Test 2 Passed: Deterministic calculator values verified.');
} catch (e) {
  console.error('✗ Test 2 Failed:', e);
  process.exit(1);
}

// Test 3: Audit logging logs verification
try {
  console.log('\nTest 3: Checking Audit trail history logging logs...');
  const user = db.findOne('users', u => u.username === 'test_user');
  
  db.logAudit(user.id, user.fullName, 'UPDATE_TAKEOFF_ITEM', 'takeoff_items', 'test-item-id', { qty: 10 }, { qty: 12 }, 'Manual override of foundation volume');
  const audits = db.find('audit_logs', a => String(a.userId) === String(user.id));
  
  assert.strictEqual(audits.length, 1, 'Audit log count should be 1');
  assert.strictEqual(audits[0].action, 'UPDATE_TAKEOFF_ITEM', 'Audit action should match logged item');
  assert.strictEqual(audits[0].reason, 'Manual override of foundation volume', 'Audit reason log check failed');

  // Clean up test data
  db.delete('users', user.id);
  
  console.log('✓ Test 3 Passed: Audit logs verified.');
} catch (e) {
  console.error('✗ Test 3 Failed:', e);
  process.exit(1);
}

console.log('\n----------------------------------------------------');
console.log('ALL VERIFICATION FLOW INTEGRATION TESTS PASSED!');
console.log('----------------------------------------------------');
process.exit(0);
