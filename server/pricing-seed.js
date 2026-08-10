const db = require('./database');

const STARTER_WARNING = 'Starter Pricing — Verify Before Use. Values are regional estimates for San Jose/Northern California area.';

const starterPricingItems = [
  // Concrete
  { name: 'Standard 4000 PSI Concrete Mix', category: 'Concrete', type: 'Material', unit: 'CY', price: 185.00, notes: STARTER_WARNING },
  { name: 'Rebar #4 Grade 60', category: 'Concrete', type: 'Material', unit: 'LF', price: 1.45, notes: STARTER_WARNING },
  { name: 'Concrete Placement Labor', category: 'Concrete', type: 'Labor', unit: 'CY', price: 95.00, notes: STARTER_WARNING },
  
  // Framing & Lumber
  { name: '2x4x8 Stud Lumber (Doug Fir)', category: 'Framing', type: 'Material', unit: 'EA', price: 4.82, notes: STARTER_WARNING },
  { name: '2x6x10 Stud Lumber (Doug Fir)', category: 'Framing', type: 'Material', unit: 'EA', price: 8.95, notes: STARTER_WARNING },
  { name: '15/32" CDX Plywood Sheathing', category: 'Framing', type: 'Material', unit: 'EA', price: 28.50, notes: STARTER_WARNING },
  { name: 'Wood Framing Labor (General)', category: 'Framing', type: 'Labor', unit: 'SF', price: 8.50, notes: STARTER_WARNING },

  // Drywall
  { name: '5/8" Fire-Rated Drywall 4x8 Sheet', category: 'Drywall', type: 'Material', unit: 'SF', price: 0.72, notes: STARTER_WARNING },
  { name: 'Drywall Joint Compound (5 Gal)', category: 'Drywall', type: 'Material', unit: 'EA', price: 24.50, notes: STARTER_WARNING },
  { name: 'Drywall Installation Labor (Hang & Tape)', category: 'Drywall', type: 'Labor', unit: 'SF', price: 1.14, notes: STARTER_WARNING },

  // Insulation
  { name: 'R-15 Fiberglass Batt Insulation (Walls)', category: 'Insulation', type: 'Material', unit: 'SF', price: 0.65, notes: STARTER_WARNING },
  { name: 'R-30 Fiberglass Batt Insulation (Ceilings)', category: 'Insulation', type: 'Material', unit: 'SF', price: 1.20, notes: STARTER_WARNING },
  { name: 'Insulation Installation Labor', category: 'Insulation', type: 'Labor', unit: 'SF', price: 0.45, notes: STARTER_WARNING },

  // Roofing
  { name: '30-Year Architectural Asphalt Shingles', category: 'Roofing', type: 'Material', unit: 'SF', price: 1.50, notes: STARTER_WARNING },
  { name: 'Synthetic Roof Underlayment (1000 SF Roll)', category: 'Roofing', type: 'Material', unit: 'EA', price: 85.00, notes: STARTER_WARNING },
  { name: 'Roofing Installation Labor', category: 'Roofing', type: 'Labor', unit: 'SF', price: 2.25, notes: STARTER_WARNING },

  // Flooring
  { name: 'Engineered Oak Hardwood Flooring', category: 'Flooring', type: 'Material', unit: 'SF', price: 6.50, notes: STARTER_WARNING },
  { name: 'Luxury Vinyl Plank (LVP) Flooring', category: 'Flooring', type: 'Material', unit: 'SF', price: 3.20, notes: STARTER_WARNING },
  { name: 'Flooring Installation Labor', category: 'Flooring', type: 'Labor', unit: 'SF', price: 4.50, notes: STARTER_WARNING },

  // Painting
  { name: 'Premium Interior Latex Paint (Flat/Eggshell)', category: 'Painting', type: 'Material', unit: 'GAL', price: 48.00, notes: STARTER_WARNING },
  { name: 'Interior Painting Labor (2 Coats)', category: 'Painting', type: 'Labor', unit: 'SF', price: 1.85, notes: STARTER_WARNING },

  // Doors & Windows
  { name: 'Standard Pre-hung Interior Door (Molded Wood)', category: 'Doors & Windows', type: 'Material', unit: 'EA', price: 185.00, notes: STARTER_WARNING },
  { name: 'Double-Hung Vinyl Window (3ft x 5ft)', category: 'Doors & Windows', type: 'Material', unit: 'EA', price: 380.00, notes: STARTER_WARNING },
  { name: 'Window / Door Installation Labor', category: 'Doors & Windows', type: 'Labor', unit: 'EA', price: 150.00, notes: STARTER_WARNING },

  // Cabinets & Countertops
  { name: 'Shaker Style Kitchen Wall Cabinet (30"x30")', category: 'Cabinets', type: 'Material', unit: 'EA', price: 245.00, notes: STARTER_WARNING },
  { name: 'Quartz Countertop Slab (Prefab)', category: 'Cabinets', type: 'Material', unit: 'SF', price: 65.00, notes: STARTER_WARNING },
  { name: 'Cabinet Installation Labor', category: 'Cabinets', type: 'Labor', unit: 'EA', price: 85.00, notes: STARTER_WARNING },

  // Electrical
  { name: '14/2 Romex Electrical Cable (250 ft)', category: 'Electrical', type: 'Material', unit: 'EA', price: 95.00, notes: STARTER_WARNING },
  { name: 'Standard Recessed LED Can Light', category: 'Electrical', type: 'Material', unit: 'EA', price: 22.00, notes: STARTER_WARNING },
  { name: 'Electrical Subcontractor Rough-In (Per Box)', category: 'Electrical', type: 'Subcontractor', unit: 'EA', price: 150.00, notes: STARTER_WARNING },

  // Plumbing
  { name: 'PEX Tubing 1/2" (100 ft Roll)', category: 'Plumbing', type: 'Material', unit: 'EA', price: 42.00, notes: STARTER_WARNING },
  { name: 'Standard Undermount Kitchen Sink', category: 'Plumbing', type: 'Material', unit: 'EA', price: 195.00, notes: STARTER_WARNING },
  { name: 'Plumbing Subcontractor Fixture Install', category: 'Plumbing', type: 'Subcontractor', unit: 'EA', price: 250.00, notes: STARTER_WARNING },

  // HVAC
  { name: 'Single-Zone Mini-Split Heat Pump (12k BTU)', category: 'HVAC', type: 'Material', unit: 'EA', price: 1450.00, notes: STARTER_WARNING },
  { name: 'HVAC Complete Rough-In (Ductless system)', category: 'HVAC', type: 'Subcontractor', unit: 'EA', price: 4500.00, notes: STARTER_WARNING },

  // Sitework / Excavation
  { name: 'Trenching / Excavation Equipment Rental (Day)', category: 'Sitework', type: 'Equipment', unit: 'EA', price: 350.00, notes: STARTER_WARNING },
  { name: 'Site Clearing & Grading Labor', category: 'Sitework', type: 'Labor', unit: 'SF', price: 0.95, notes: STARTER_WARNING }
];

const starterLaborRates = [
  { role: 'Carpenter', rate: 65.00, notes: STARTER_WARNING },
  { role: 'Framer', rate: 60.00, notes: STARTER_WARNING },
  { role: 'Drywall Installer', rate: 55.00, notes: STARTER_WARNING },
  { role: 'Painter', rate: 48.00, notes: STARTER_WARNING },
  { role: 'Electrician', rate: 85.00, notes: STARTER_WARNING },
  { role: 'Plumber', rate: 90.00, notes: STARTER_WARNING },
  { role: 'HVAC Technician', rate: 95.00, notes: STARTER_WARNING },
  { role: 'General Laborer', rate: 35.00, notes: STARTER_WARNING }
];

function seed() {
  const currentPricing = db.getCollection('pricing_items');
  const currentLabor = db.getCollection('labor_rates');

  if (currentPricing.length === 0) {
    console.log('Seeding starter pricing database...');
    starterPricingItems.forEach(item => {
      const inserted = db.insert('pricing_items', {
        ...item,
        lastUpdated: new Date().toISOString().split('T')[0],
        effectiveDate: new Date().toISOString().split('T')[0]
      });

      // Populate initial pricing history
      db.insert('pricing_history', {
        pricingItemId: inserted.id,
        itemName: inserted.name,
        oldPrice: null,
        newPrice: inserted.price,
        changedAt: new Date().toISOString(),
        username: 'System Seed',
        note: 'Initial Seed Starter Pricing'
      });
    });
  }

  if (currentLabor.length === 0) {
    console.log('Seeding starter labor rates...');
    starterLaborRates.forEach(rate => {
      db.insert('labor_rates', {
        ...rate,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    });
  }
}

module.exports = { seed };
