const PDFDocument = require('pdfkit');

/**
 * Generate a PDF estimate and pipe it to a response stream.
 * @param {object} project - Project details
 * @param {object} estimate - Estimate details (totals, settings, etc.)
 * @param {array} takeoffItems - Array of takeoff/estimate line items
 * @param {object} companySettings - Company name, phone, etc.
 * @param {stream} writeStream - Writable stream (res) to write PDF to
 */
function generateEstimatePDF(project, estimate, takeoffItems, companySettings, writeStream) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

  // Pipe the doc to the write stream
  doc.pipe(writeStream);

  // Styling Constants
  const orangeAccent = '#f97316'; // Safety Orange
  const charcoalDark = '#1e293b'; // Slate 800
  const grayLight = '#94a3b8'; // Slate 400
  const tableBorder = '#e2e8f0'; // Slate 200

  // 1. HEADER
  doc
    .fillColor(charcoalDark)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(companySettings.name || 'BuildEstimate AI', 50, 50);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(charcoalDark)
    .text(companySettings.address || '', 50, 75)
    .text(`Phone: ${companySettings.phone || ''} | Email: ${companySettings.email || ''}`, 50, 90)
    .text(`License: ${companySettings.license || 'CSLB License'}`, 50, 105);

  // Estimate Info (Top Right)
  doc
    .fillColor(orangeAccent)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('CONSTRUCTION BID', 400, 50, { align: 'right' });

  doc
    .fillColor(charcoalDark)
    .font('Helvetica')
    .fontSize(10)
    .text(`Estimate #: EST-${project.id.toUpperCase().substring(0, 6)}`, 400, 70, { align: 'right' })
    .text(`Date: ${new Date(estimate.updatedAt || Date.now()).toLocaleDateString()}`, 400, 85, { align: 'right' })
    .text(`Status: ${estimate.status || 'Draft'}`, 400, 100, { align: 'right' });

  doc.moveDown(2);
  doc.strokeColor(orangeAccent).lineWidth(2).moveTo(50, 125).lineTo(562, 125).stroke();

  // 2. PROJECT INFO & CLIENT INFO
  let y = 145;
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Client Information', 50, y)
    .text('Project Location & Details', 300, y);

  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`Name: ${project.clientName || 'N/A'}`, 50, y + 20)
    .text(`Company: ${project.clientCompany || 'N/A'}`, 50, y + 35);

  doc
    .text(`Project Name: ${project.name || 'N/A'}`, 300, y + 20)
    .text(`Address: ${project.address || ''}`, 300, y + 35)
    .text(`City: ${project.city || ''}, ${project.state || ''} ${project.zipCode || ''}`, 300, y + 50)
    .text(`Project Type: ${project.type || 'N/A'}`, 300, y + 65);

  doc.moveDown(5);

  // 3. TABLE OF LINE ITEMS
  y = 245;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(charcoalDark)
    .text('DETAILED TAKE-OFF & ESTIMATE', 50, y);

  // Draw table header
  y += 20;
  doc.strokeColor(tableBorder).lineWidth(1).moveTo(50, y).lineTo(562, y).stroke();
  y += 5;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Item Description', 55, y)
    .text('Category', 220, y)
    .text('Qty', 320, y, { width: 40, align: 'right' })
    .text('Unit', 370, y)
    .text('Unit Cost', 410, y, { width: 60, align: 'right' })
    .text('Total Cost', 485, y, { width: 70, align: 'right' });

  y += 15;
  doc.strokeColor(tableBorder).lineWidth(1).moveTo(50, y).lineTo(562, y).stroke();

  doc.font('Helvetica').fontSize(9);

  // Iterate over items
  takeoffItems.forEach(item => {
    // Page breaks if table overflows
    if (y > 650) {
      doc.addPage();
      y = 50;
      // Re-draw table headers on new page
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Item Description', 55, y)
        .text('Category', 220, y)
        .text('Qty', 320, y, { width: 40, align: 'right' })
        .text('Unit', 370, y)
        .text('Unit Cost', 410, y, { width: 60, align: 'right' })
        .text('Total Cost', 485, y, { width: 70, align: 'right' });
      
      y += 15;
      doc.strokeColor(tableBorder).lineWidth(1).moveTo(50, y).lineTo(562, y).stroke();
      doc.font('Helvetica').fontSize(9);
    }

    y += 5;
    
    // Calculate total cost for line item
    const itemTotal = (item.quantity * item.unitPrice) * (1 + (item.wastePercent || 0) / 100);

    doc
      .fillColor(charcoalDark)
      .text(item.name || '', 55, y, { width: 160 })
      .text(item.category || '', 220, y, { width: 90 })
      .text(item.quantity.toLocaleString(), 320, y, { width: 40, align: 'right' })
      .text(item.unit || '', 370, y)
      .text(`$${Number(item.unitPrice || 0).toFixed(2)}`, 410, y, { width: 60, align: 'right' })
      .text(`$${itemTotal.toFixed(2)}`, 485, y, { width: 70, align: 'right' });

    y += 20;
    doc.strokeColor(tableBorder).lineWidth(0.5).moveTo(50, y).lineTo(562, y).stroke();
  });

  // 4. PRICING SUMMARY (Right Side)
  y += 20;
  if (y > 500) {
    doc.addPage();
    y = 50;
  }

  // Left Side Notes & Signature
  const notesY = y;
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Notes & Special Instructions', 50, notesY);
  
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(project.notes || 'No special instructions provided.', 50, notesY + 15, { width: 240 })
    .text('\nTerms & Conditions:\nNet 30 days. All work to be completed in a professional manner according to standard practices. Changes in plans or specifications involving extra costs will be executed only upon written authorization.', 50, notesY + 60, { width: 240 });

  // Signature Block
  doc
    .strokeColor(grayLight)
    .lineWidth(0.5)
    .moveTo(50, notesY + 160)
    .lineTo(200, notesY + 160)
    .stroke()
    .fontSize(8)
    .text('Authorized Signature / Date', 50, notesY + 165);

  doc
    .strokeColor(grayLight)
    .lineWidth(0.5)
    .moveTo(250, notesY + 160)
    .lineTo(400, notesY + 160)
    .stroke()
    .text('Client Acceptance / Date', 250, notesY + 165);

  // Right Side Totals
  let totalY = y;
  const colLeft = 410;
  const colRight = 485;

  doc.font('Helvetica').fontSize(9);

  // Helper function to print totals row
  const printTotalRow = (label, amount, isBold = false) => {
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, colLeft, totalY, { width: 70, align: 'right' });
    doc.text(`$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colRight, totalY, { width: 70, align: 'right' });
    totalY += 15;
  };

  printTotalRow('Direct Costs:', estimate.subtotal);
  printTotalRow('Waste Factor:', estimate.wasteAmount || 0);
  printTotalRow('Overhead:', estimate.overheadAmount || 0);
  printTotalRow('Contingency:', estimate.contingencyAmount || 0);
  printTotalRow('Profit Margin:', estimate.profitAmount || 0);

  totalY += 5;
  doc.strokeColor(orangeAccent).lineWidth(1.5).moveTo(colLeft - 10, totalY).lineTo(562, totalY).stroke();
  totalY += 10;

  // Final Total
  doc.font('Helvetica-Bold').fontSize(12).fillColor(orangeAccent);
  doc.text('Final Estimate:', colLeft - 10, totalY, { width: 80, align: 'right' });
  doc.text(`$${Number(estimate.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colRight, totalY, { width: 70, align: 'right' });

  // 5. FOOTER DISCLAIMER
  doc
    .fillColor(grayLight)
    .font('Helvetica')
    .fontSize(7)
    .text(
      'Disclaimer: This estimate is prepared using AI-assisted quantity analysis and contractor-approved pricing. Final pricing should be verified against current project conditions, drawings, specifications, supplier pricing, subcontractor quotes, and applicable local code requirements before being used as a binding bid.',
      50,
      720,
      { width: 512, align: 'center' }
    );

  // End Document
  doc.end();
}

module.exports = { generateEstimatePDF };
