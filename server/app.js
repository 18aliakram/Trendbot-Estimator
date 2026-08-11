require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./database');
const pricingSeed = require('./pricing-seed');
const aiService = require('./ai-service');
const { generateEstimatePDF } = require('./pdf-generator');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_buildestimate_token_key_12345';

const isNetlify = () => {
  return !!process.env.NETLIFY || !!process.env.LAMBDA_TASK_ROOT || !!process.env.CONTEXT || !!process.env.NETLIFY_IMAGES_CDN_DOMAIN;
};

// Database Loading and Seeding Middleware for Serverless / Local Environment
let isSeeded = false;
const databaseMiddleware = async (req, res, next) => {
  try {
    await db.load();
    if (!isSeeded) {
      pricingSeed.seed();
      const users = db.getCollection('users');
      if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.insert('users', {
          username: 'sanjose_builder',
          email: 'contractor@sanjosebuild.com',
          password: hashedPassword,
          fullName: 'Juan Rodriguez',
          companyName: 'Rodriguez & Sons Construction',
          companyPhone: '(408) 555-0199',
          companyAddress: '100 W Santa Clara St, San Jose, CA 95113',
          companyLicense: 'CSLB #1098765'
        });
        console.log('Seeded default user account on first request');
      }
      isSeeded = true;
    }
  } catch (err) {
    console.error('Failed to load or seed database:', err);
  }

  // Intercept response send to save state in-memory database to Netlify Blobs / Local JSON file
  const originalSend = res.send;
  res.send = async function (body) {
    try {
      await db.persist();
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
    return originalSend.apply(this, arguments);
  };

  next();
};

app.use(cors());
app.use(express.json());
app.use(databaseMiddleware);

// Multer Upload configuration (Uses ephemeral /tmp on serverless Netlify Functions)
let uploadDir;
try {
  if (isNetlify()) {
    uploadDir = '/tmp';
  } else {
    uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }
} catch (e) {
  console.warn('Failed to create local uploads directory, falling back to /tmp:', e);
  uploadDir = '/tmp';
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF documents are supported for plan uploads.'), false);
  }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Missing token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// --- HEALTH ENDPOINT ---
app.get('/api/health', (req, res) => {
  res.json({ ok: true, environment: isNetlify() ? 'netlify' : 'local' });
});

// --- AUTH ROUTES ---
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, fullName, companyName, companyPhone, companyAddress, companyLicense } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Full Name, Email and Password are required.' });
  }

  const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'A user with this email already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = db.insert('users', {
    username: username || email.split('@')[0],
    email: email.toLowerCase(),
    password: hashedPassword,
    fullName,
    companyName: companyName || 'New Contractor LLC',
    companyPhone: companyPhone || '',
    companyAddress: companyAddress || '',
    companyLicense: companyLicense || ''
  });

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      companyName: newUser.companyName
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      companyName: user.companyName
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.findById('users', req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    companyName: user.companyName,
    companyPhone: user.companyPhone,
    companyAddress: user.companyAddress,
    companyLicense: user.companyLicense
  });
});

app.put('/api/auth/settings', authenticateToken, (req, res) => {
  const user = db.findById('users', req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const updated = db.update('users', user.id, {
    fullName: req.body.fullName || user.fullName,
    companyName: req.body.companyName || user.companyName,
    companyPhone: req.body.companyPhone || user.companyPhone,
    companyAddress: req.body.companyAddress || user.companyAddress,
    companyLicense: req.body.companyLicense || user.companyLicense
  });

  db.logAudit(user.id, user.fullName, 'UPDATE_SETTINGS', 'users', user.id, user, updated, 'Updated company profile details');
  res.json(updated);
});

// --- PROJECT ROUTES ---
app.get('/api/projects', authenticateToken, (req, res) => {
  const projects = db.find('projects', p => String(p.userId) === String(req.user.id));
  
  // Attach latest estimate total if exists
  const estimates = db.getCollection('estimates');
  const projectsWithEstimate = projects.map(p => {
    const est = estimates.find(e => String(e.projectId) === String(p.id));
    return {
      ...p,
      estimateTotal: est ? est.total : 0,
      estimateStatus: est ? est.status : 'Draft'
    };
  });

  // Sort by last updated
  projectsWithEstimate.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(projectsWithEstimate);
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, clientName, clientCompany, address, city, state, zipCode, type, notes } = req.body;
  if (!name || !clientName) {
    return res.status(400).json({ message: 'Project Name and Client Name are required.' });
  }

  const user = db.findById('users', req.user.id);

  const newProject = db.insert('projects', {
    userId: req.user.id,
    name,
    clientName,
    clientCompany: clientCompany || '',
    address: address || '',
    city: city || '',
    state: state || 'CA',
    zipCode: zipCode || '',
    type: type || 'ADU',
    notes: notes || '',
    status: 'Draft' // Status flow: Draft -> Analyzing -> Review Required -> Ready for Approval -> Approved -> Exported
  });

  // Initialize Project Estimate Settings
  db.insert('project_settings', {
    projectId: newProject.id,
    wastePercent: 8, // Default 8% waste
    overheadPercent: 10, // Default 10% overhead
    contingencyPercent: 5, // Default 5% contingency
    profitPercent: 12 // Default 12% profit markup
  });

  db.logAudit(req.user.id, user.fullName, 'CREATE_PROJECT', 'projects', newProject.id, null, newProject, 'Created project');
  res.status(201).json(newProject);
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  res.json({ ...project, settings });
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const old = { ...project };
  const updated = db.update('projects', project.id, {
    name: req.body.name || project.name,
    clientName: req.body.clientName || project.clientName,
    clientCompany: req.body.clientCompany !== undefined ? req.body.clientCompany : project.clientCompany,
    address: req.body.address || project.address,
    city: req.body.city || project.city,
    state: req.body.state || project.state,
    zipCode: req.body.zipCode || project.zipCode,
    type: req.body.type || project.type,
    notes: req.body.notes !== undefined ? req.body.notes : project.notes,
    status: req.body.status || project.status
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'UPDATE_PROJECT', 'projects', project.id, old, updated, 'Updated project properties');
  res.json(updated);
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  // Delete project, takeoff items, estimates
  db.delete('projects', project.id);
  
  // Cleanup dependents
  const takeoffs = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  takeoffs.forEach(t => db.delete('takeoff_items', t.id));

  const estimates = db.find('estimates', e => String(e.projectId) === String(project.id));
  estimates.forEach(e => db.delete('estimates', e.id));

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'DELETE_PROJECT', 'projects', project.id, project, null, 'Deleted project & related data');
  res.json({ message: 'Project deleted successfully.' });
});

app.post('/api/projects/:id/duplicate', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const newProject = db.insert('projects', {
    userId: req.user.id,
    name: `${project.name} (Copy)`,
    clientName: project.clientName,
    clientCompany: project.clientCompany,
    address: project.address,
    city: project.city,
    state: project.state,
    zipCode: project.zipCode,
    type: project.type,
    notes: project.notes,
    status: 'Draft'
  });

  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  db.insert('project_settings', {
    projectId: newProject.id,
    wastePercent: settings ? settings.wastePercent : 8,
    overheadPercent: settings ? settings.overheadPercent : 10,
    contingencyPercent: settings ? settings.contingencyPercent : 5,
    profitPercent: settings ? settings.profitPercent : 12
  });

  const takeoffItems = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  takeoffItems.forEach(item => {
    db.insert('takeoff_items', {
      projectId: newProject.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      sheet: item.sheet,
      confidence: item.confidence,
      notes: item.notes,
      status: 'AI Detected',
      unitPrice: item.unitPrice,
      priceSource: item.priceSource
    });
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'DUPLICATE_PROJECT', 'projects', newProject.id, null, newProject, `Duplicated project from: ${project.name}`);
  res.status(201).json(newProject);
});

// --- PLAN UPLOAD & AI TAKEOFF ---
app.post('/api/projects/:id/upload', authenticateToken, upload.single('plan'), async (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a valid drawing file (PDF).' });
  }

  // Update project status to "Analyzing"
  db.update('projects', project.id, { status: 'Analyzing' });

  try {
    const user = db.findById('users', req.user.id);
    
    // Call AI Service
    const result = await aiService.analyzeDocument(
      req.file.path, 
      { name: project.name, type: project.type },
      (stage) => {
        console.log(`[AI Status Project ${project.id}]: ${stage}`);
      }
    );

    // Save PDF sheet document path
    db.insert('estimate_versions', {
      projectId: project.id,
      version: 'AI Takeoff Upload',
      note: `Analyzed document: ${req.file.originalname}`,
      createdAt: new Date().toISOString()
    });

    // Remove any previous takeoff items to start fresh
    const previous = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
    previous.forEach(p => db.delete('takeoff_items', p.id));

    const pricingItems = db.getCollection('pricing_items');

    // Insert detected takeoff items
    result.items.forEach(item => {
      // Find matching item in pricing database to attach cost
      const matchedPrice = pricingItems.find(p => p.name.toLowerCase() === item.name.toLowerCase() || 
        (p.category.toLowerCase() === item.category.toLowerCase() && p.unit === item.unit));

      db.insert('takeoff_items', {
        projectId: project.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        sheet: item.sheet || 'A-101',
        confidence: item.confidence || 0.90,
        notes: item.notes || '',
        status: item.confidence < 0.90 ? 'Review Required' : 'AI Detected',
        unitPrice: matchedPrice ? matchedPrice.price : 0,
        priceSource: matchedPrice ? 'Database' : 'Pricing Missing'
      });
    });

    // Update project status to "Review Required"
    db.update('projects', project.id, { status: 'Review Required' });

    // Clean up local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}

    db.logAudit(req.user.id, user.fullName, 'AI_ANALYSIS_COMPLETE', 'projects', project.id, null, result, `AI analysis successfully processed plan: ${req.file.originalname}`);

    res.json({
      success: true,
      warnings: result.warnings || [],
      missingInformation: result.missingInformation || []
    });
  } catch (err) {
    db.update('projects', project.id, { status: 'Draft' });
    console.error('Plan analysis failed:', err);
    res.status(500).json({ 
      message: 'Plan analysis failed. Please try again.' 
    });
  }
});

app.get('/api/projects/:id/takeoff', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const items = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  res.json(items);
});

// Update single takeoff item
app.put('/api/projects/:id/takeoff/items/:itemId', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const item = db.findOne('takeoff_items', t => String(t.id) === String(req.params.itemId) && String(t.projectId) === String(project.id));
  if (!item) return res.status(404).json({ message: 'Takeoff item not found.' });

  const old = { ...item };
  const quantityChanged = Number(req.body.quantity) !== item.quantity;
  const unitPriceChanged = req.body.unitPrice !== undefined && Number(req.body.unitPrice) !== item.unitPrice;

  let newStatus = item.status;
  if (quantityChanged || unitPriceChanged) {
    newStatus = 'Contractor Edited';
  } else if (req.body.status) {
    newStatus = req.body.status;
  }

  const updated = db.update('takeoff_items', item.id, {
    name: req.body.name || item.name,
    category: req.body.category || item.category,
    quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : item.quantity,
    unit: req.body.unit || item.unit,
    sheet: req.body.sheet || item.sheet,
    unitPrice: req.body.unitPrice !== undefined ? Number(req.body.unitPrice) : item.unitPrice,
    priceSource: req.body.priceSource || (unitPriceChanged ? 'Contractor Override' : item.priceSource),
    notes: req.body.notes !== undefined ? req.body.notes : item.notes,
    status: newStatus
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'UPDATE_TAKEOFF_ITEM', 'takeoff_items', item.id, old, updated, `Modified takeoff item: ${item.name}`);
  res.json(updated);
});

// Manually add takeoff item
app.post('/api/projects/:id/takeoff/items', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const { name, category, quantity, unit, sheet, unitPrice, notes } = req.body;
  if (!name || quantity === undefined || !unit) {
    return res.status(400).json({ message: 'Name, quantity and unit are required.' });
  }

  const newItem = db.insert('takeoff_items', {
    projectId: project.id,
    name,
    category,
    quantity: Number(quantity),
    unit,
    sheet: sheet || 'Manual Entry',
    confidence: 1.0,
    notes: notes || '',
    status: 'Contractor Approved',
    unitPrice: unitPrice !== undefined ? Number(unitPrice) : 0,
    priceSource: unitPrice !== undefined ? 'Contractor Override' : 'Pricing Missing'
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'ADD_TAKEOFF_ITEM', 'takeoff_items', newItem.id, null, newItem, `Added takeoff item: ${name}`);
  res.status(201).json(newItem);
});

// Delete takeoff item
app.delete('/api/projects/:id/takeoff/items/:itemId', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const item = db.findOne('takeoff_items', t => String(t.id) === String(req.params.itemId) && String(t.projectId) === String(project.id));
  if (!item) return res.status(404).json({ message: 'Takeoff item not found.' });

  db.delete('takeoff_items', item.id);

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'DELETE_TAKEOFF_ITEM', 'takeoff_items', item.id, item, null, `Removed takeoff item: ${item.name}`);
  res.json({ message: 'Item deleted.' });
});

// --- ESTIMATOR ENGINE & REVIEW ---
function calculateDeterministicEstimate(takeoffItems, settings) {
  let subtotal = 0;
  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let equipmentSubtotal = 0;
  let subcontractorSubtotal = 0;
  let pricingMissingCount = 0;

  takeoffItems.forEach(item => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unitPrice || 0);
    const cost = qty * price;
    
    if (price === 0) {
      pricingMissingCount++;
    }

    const categoryType = (item.type || 'Material').toLowerCase();
    if (categoryType === 'labor') {
      laborSubtotal += cost;
    } else if (categoryType === 'equipment') {
      equipmentSubtotal += cost;
    } else if (categoryType === 'subcontractor') {
      subcontractorSubtotal += cost;
    } else {
      materialSubtotal += cost;
    }
    
    subtotal += cost;
  });

  const wastePercent = Number(settings.wastePercent || 8);
  const wasteAmount = materialSubtotal * (wastePercent / 100);
  const adjustedDirectCost = subtotal + wasteAmount;

  const overheadPercent = Number(settings.overheadPercent || 10);
  const overheadAmount = adjustedDirectCost * (overheadPercent / 100);

  const contingencyPercent = Number(settings.contingencyPercent || 5);
  const contingencyAmount = adjustedDirectCost * (contingencyPercent / 100);

  const profitPercent = Number(settings.profitPercent || 12);
  const profitAmount = adjustedDirectCost * (profitPercent / 100);

  const total = adjustedDirectCost + overheadAmount + contingencyAmount + profitAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    materialSubtotal: Math.round(materialSubtotal * 100) / 100,
    laborSubtotal: Math.round(laborSubtotal * 100) / 100,
    equipmentSubtotal: Math.round(equipmentSubtotal * 100) / 100,
    subcontractorSubtotal: Math.round(subcontractorSubtotal * 100) / 100,
    wastePercent,
    wasteAmount: Math.round(wasteAmount * 100) / 100,
    adjustedDirectCost: Math.round(adjustedDirectCost * 100) / 100,
    overheadAmount: Math.round(overheadAmount * 100) / 100,
    contingencyAmount: Math.round(contingencyAmount * 100) / 100,
    profitAmount: Math.round(profitAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    pricingMissingCount,
    settings: {
      wastePercent,
      overheadPercent,
      contingencyPercent,
      profitPercent
    }
  };
}

app.get('/api/projects/:id/estimate', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const takeoffItems = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));

  const calculations = calculateDeterministicEstimate(takeoffItems, settings);

  let estimate = db.findOne('estimates', e => String(e.projectId) === String(project.id));
  if (!estimate) {
    estimate = db.insert('estimates', {
      projectId: project.id,
      subtotal: calculations.subtotal,
      total: calculations.total,
      status: 'Draft',
      updatedAt: new Date().toISOString()
    });
  } else {
    estimate = db.update('estimates', estimate.id, {
      subtotal: calculations.subtotal,
      total: calculations.total,
      updatedAt: new Date().toISOString()
    });
  }

  res.json({
    ...calculations,
    status: estimate.status,
    id: estimate.id,
    updatedAt: estimate.updatedAt
  });
});

app.put('/api/projects/:id/estimate/settings', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  if (!settings) return res.status(404).json({ message: 'Settings not found.' });

  const old = { ...settings };
  const updated = db.update('project_settings', settings.id, {
    wastePercent: req.body.wastePercent !== undefined ? Number(req.body.wastePercent) : settings.wastePercent,
    overheadPercent: req.body.overheadPercent !== undefined ? Number(req.body.overheadPercent) : settings.overheadPercent,
    contingencyPercent: req.body.contingencyPercent !== undefined ? Number(req.body.contingencyPercent) : settings.contingencyPercent,
    profitPercent: req.body.profitPercent !== undefined ? Number(req.body.profitPercent) : settings.profitPercent
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'UPDATE_ESTIMATE_SETTINGS', 'project_settings', settings.id, old, updated, 'Adjusted estimate margin parameters');
  res.json(updated);
});

app.post('/api/projects/:id/estimate/approve', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  let estimate = db.findOne('estimates', e => String(e.projectId) === String(project.id));
  if (!estimate) return res.status(404).json({ message: 'Estimate not found.' });

  db.update('estimates', estimate.id, { status: 'Approved' });
  db.update('projects', project.id, { status: 'Approved' });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'APPROVE_ESTIMATE', 'estimates', estimate.id, null, null, `Contractor approved estimate of $${estimate.total.toFixed(2)}`);

  res.json({ message: 'Estimate approved.', status: 'Approved' });
});

app.get('/api/projects/:id/explain', authenticateToken, async (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const takeoffItems = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  const calc = calculateDeterministicEstimate(takeoffItems, settings);

  const explanation = await aiService.explainEstimate(project, takeoffItems, calc);
  res.json({ explanation });
});

app.get('/api/projects/:id/pdf', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const takeoffItems = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  const calc = calculateDeterministicEstimate(takeoffItems, settings);

  const user = db.findById('users', req.user.id);
  const estimate = db.findOne('estimates', e => String(e.projectId) === String(project.id)) || { status: 'Draft' };
  
  const fullEstimate = { ...calc, status: estimate.status, updatedAt: estimate.updatedAt };

  const filename = `estimate-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const companySettings = {
    name: user.companyName,
    address: user.companyAddress,
    phone: user.companyPhone,
    email: user.email,
    license: user.companyLicense
  };

  generateEstimatePDF(project, fullEstimate, takeoffItems, companySettings, res);
});

app.post('/api/projects/:id/estimate/save-version', authenticateToken, (req, res) => {
  const project = db.findOne('projects', p => String(p.id) === String(req.params.id) && String(p.userId) === String(req.user.id));
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const takeoffItems = db.find('takeoff_items', t => String(t.projectId) === String(project.id));
  const settings = db.findOne('project_settings', s => String(s.projectId) === String(project.id));
  const calc = calculateDeterministicEstimate(takeoffItems, settings);

  const versions = db.find('estimate_versions', v => String(v.projectId) === String(project.id));
  const nextVerNum = versions.filter(v => v.version.startsWith('v')).length + 1;

  const version = db.insert('estimate_versions', {
    projectId: project.id,
    version: `v${nextVerNum}`,
    total: calc.total,
    note: req.body.note || `Estimate saved revision v${nextVerNum}`,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(version);
});

app.get('/api/projects/:id/estimate/versions', authenticateToken, (req, res) => {
  const versions = db.find('estimate_versions', v => String(v.projectId) === String(req.params.id));
  res.json(versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// --- PRICING ENDPOINTS ---
app.get('/api/pricing', authenticateToken, (req, res) => {
  const pricing = db.getCollection('pricing_items');
  res.json(pricing);
});

app.post('/api/pricing', authenticateToken, (req, res) => {
  const { name, category, type, unit, price, notes } = req.body;
  if (!name || !category || !unit || price === undefined) {
    return res.status(400).json({ message: 'Name, Category, Unit, and Price are required.' });
  }

  const newItem = db.insert('pricing_items', {
    name,
    category,
    type: type || 'Material',
    unit,
    price: Number(price),
    notes: notes || '',
    lastUpdated: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0]
  });

  const user = db.findById('users', req.user.id);
  
  db.insert('pricing_history', {
    pricingItemId: newItem.id,
    itemName: newItem.name,
    oldPrice: null,
    newPrice: newItem.price,
    changedAt: new Date().toISOString(),
    username: user.fullName,
    note: 'Created item'
  });

  db.logAudit(req.user.id, user.fullName, 'CREATE_PRICING_ITEM', 'pricing_items', newItem.id, null, newItem, `Added catalog item: ${name}`);
  res.status(201).json(newItem);
});

app.put('/api/pricing/:id', authenticateToken, (req, res) => {
  const pricingItem = db.findById('pricing_items', req.params.id);
  if (!pricingItem) return res.status(404).json({ message: 'Pricing item not found.' });

  const old = { ...pricingItem };
  const priceChanged = Number(req.body.price) !== pricingItem.price;

  const updated = db.update('pricing_items', pricingItem.id, {
    name: req.body.name || pricingItem.name,
    category: req.body.category || pricingItem.category,
    type: req.body.type || pricingItem.type,
    unit: req.body.unit || pricingItem.unit,
    price: req.body.price !== undefined ? Number(req.body.price) : pricingItem.price,
    notes: req.body.notes !== undefined ? req.body.notes : pricingItem.notes,
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const user = db.findById('users', req.user.id);

  if (priceChanged) {
    db.insert('pricing_history', {
      pricingItemId: pricingItem.id,
      itemName: updated.name,
      oldPrice: old.price,
      newPrice: updated.price,
      changedAt: new Date().toISOString(),
      username: user.fullName,
      note: req.body.historyNote || 'Price edited'
    });
  }

  db.logAudit(req.user.id, user.fullName, 'UPDATE_PRICING_ITEM', 'pricing_items', pricingItem.id, old, updated, `Updated pricing item: ${pricingItem.name}`);
  res.json(updated);
});

app.get('/api/pricing/:id/history', authenticateToken, (req, res) => {
  const history = db.find('pricing_history', h => String(h.pricingItemId) === String(req.params.id));
  res.json(history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)));
});

app.get('/api/pricing/labor', authenticateToken, (req, res) => {
  const labor = db.getCollection('labor_rates');
  res.json(labor);
});

app.put('/api/pricing/labor/:id', authenticateToken, (req, res) => {
  const rate = db.findById('labor_rates', req.params.id);
  if (!rate) return res.status(404).json({ message: 'Labor rate not found.' });

  const old = { ...rate };
  const updated = db.update('labor_rates', rate.id, {
    rate: Number(req.body.rate),
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const user = db.findById('users', req.user.id);
  db.logAudit(req.user.id, user.fullName, 'UPDATE_LABOR_RATE', 'labor_rates', rate.id, old, updated, `Updated ${rate.role} rate to $${req.body.rate}/hr`);
  res.json(updated);
});

// --- AUDIT TRAIL LOGS ---
app.get('/api/audit-logs', authenticateToken, (req, res) => {
  const logs = db.find('audit_logs');
  res.json(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50));
});

// --- GLOBAL SEARCH ---
app.get('/api/search', authenticateToken, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ projects: [], pricing: [] });

  const projects = db.find('projects', p => String(p.userId) === String(req.user.id) && 
    (p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)));

  const pricing = db.find('pricing_items', p => 
    (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));

  res.json({ projects, pricing });
});

// Local dev serving static files fallback (bypassed on Netlify redirects)
if (!isNetlify() && process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    error: err.message || 'An internal server error occurred.'
  });
});

module.exports = app;
