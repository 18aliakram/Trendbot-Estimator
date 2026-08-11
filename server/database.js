const fs = require('fs');
const path = require('path');

// Try loading @netlify/blobs if available, but fallback gracefully for local dev
let getStore;
try {
  getStore = require('@netlify/blobs').getStore;
} catch (e) {
  getStore = null;
}

const DB_PATH = path.join(__dirname, 'db.json');

const isNetlify = () => {
  return !!process.env.NETLIFY || !!process.env.LAMBDA_TASK_ROOT || !!process.env.CONTEXT || !!process.env.NETLIFY_IMAGES_CDN_DOMAIN;
};

class JsonDatabase {
  constructor() {
    this.isDirty = false;
    this.data = {
      users: [],
      projects: [],
      takeoff_items: [],
      pricing_items: [],
      pricing_history: [],
      labor_rates: [],
      estimates: [],
      estimate_versions: [],
      audit_logs: [],
      project_settings: []
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          // Merge parsed data, ensuring all expected collections exist
          this.data = { ...this.data, ...parsed };
        } else {
          this.save();
        }
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Error initializing JSON database, creating new one:', error);
      this.save();
    }
  }

  save() {
    try {
      // Write synchronously to avoid concurrency issues for local dev
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error writing to JSON database:', error);
    }
  }

  // Netlify Blobs Asynchronous Support
  async load() {
    if (isNetlify() && getStore) {
      try {
        console.log('Loading database from Netlify Blobs...');
        const store = getStore('database');
        const content = await store.get('db.json', { type: 'json' });
        if (content) {
          this.data = { ...this.data, ...content };
          console.log('Database loaded successfully from Netlify Blobs');
        } else {
          console.log('Netlify Blobs db.json not found, using default state');
        }
      } catch (err) {
        console.error('Error loading database from Netlify Blobs:', err);
      }
    } else {
      // Local file fallback
      this.init();
    }
  }

  async persist() {
    if (!this.isDirty) {
      return; // Do not call Netlify Blobs write if data was not modified during request
    }
    if (isNetlify() && getStore) {
      try {
        console.log('Saving database to Netlify Blobs (dirty state detected)...');
        const store = getStore('database');
        await store.setJSON('db.json', this.data);
        this.isDirty = false;
        console.log('Database saved successfully to Netlify Blobs');
      } catch (err) {
        console.error('Error saving database to Netlify Blobs:', err);
      }
    } else {
      // Local file save
      this.save();
      this.isDirty = false;
    }
  }

  // Generic CRUD helpers
  getCollection(table) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    return this.data[table];
  }

  find(table, filterFn) {
    const list = this.getCollection(table);
    if (!filterFn) return list;
    return list.filter(filterFn);
  }

  findOne(table, filterFn) {
    const list = this.getCollection(table);
    return list.find(filterFn);
  }

  findById(table, id) {
    return this.findOne(table, item => String(item.id) === String(id));
  }

  insert(table, doc) {
    const list = this.getCollection(table);
    const newDoc = {
      id: doc.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...doc
    };
    list.push(newDoc);
    this.isDirty = true;
    this.save();
    return newDoc;
  }

  update(table, id, updates) {
    const list = this.getCollection(table);
    const index = list.findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    const oldDoc = list[index];
    const newDoc = {
      ...oldDoc,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    list[index] = newDoc;
    this.isDirty = true;
    this.save();
    return newDoc;
  }

  delete(table, id) {
    const list = this.getCollection(table);
    const index = list.findIndex(item => String(item.id) === String(id));
    if (index === -1) return false;

    list.splice(index, 1);
    this.isDirty = true;
    this.save();
    return true;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  // Relations Helper
  // Example: join(projects, 'userId', 'users', 'id', 'user')
  join(list, localKey, foreignTable, foreignKey, asName) {
    const foreignList = this.getCollection(foreignTable);
    return list.map(item => {
      const match = foreignList.find(fItem => String(fItem[foreignKey]) === String(item[localKey]));
      return {
        ...item,
        [asName]: match || null
      };
    });
  }

  // Specific Log Audit Trail Helper
  logAudit(userId, username, action, targetTable, targetId, oldValue, newValue, reason = '') {
    return this.insert('audit_logs', {
      userId,
      username: username || 'System',
      action,
      targetTable,
      targetId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

const db = new JsonDatabase();
module.exports = db;
