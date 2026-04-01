import jsPDF from 'jspdf';

export interface ReceiptData {
  invoiceId: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  gstNumber: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    weight?: string;
    purity?: string;
    customRate?: number;
    taxRate?: number;
    details?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: string;
  upiId?: string;
}

export const generateReceiptPDF = async (receiptData: ReceiptData): Promise<void> => {
  const pdf = new jsPDF({ compress: true, unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  let yPosition = margin;

  // Premium Color Palette
  const colors = {
    primary: [25, 118, 210] as [number, number, number],        // Professional blue
    primaryDark: [13, 71, 161] as [number, number, number],     // Dark blue
    accent: [46, 125, 50] as [number, number, number],          // Green accent
    success: [76, 175, 80] as [number, number, number],         // Success green
    textPrimary: [33, 33, 33] as [number, number, number],     // Almost black
    textSecondary: [117, 117, 117] as [number, number, number], // Gray
    textLight: [158, 158, 158] as [number, number, number],    // Light gray
    bgLight: [250, 250, 250] as [number, number, number],       // Very light gray
    bgRow: [255, 255, 255] as [number, number, number],         // White
    border: [224, 224, 224] as [number, number, number],        // Light border
    borderDark: [189, 189, 189] as [number, number, number],    // Darker border
  };

  // Helper to draw rounded rectangle
  const drawRoundedRect = (x: number, y: number, width: number, height: number, fillColor: [number, number, number], strokeColor?: [number, number, number], lineWidth: number = 0.2) => {
    if (strokeColor) {
      pdf.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
      pdf.setLineWidth(lineWidth);
    }
    pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    pdf.rect(x, y, width, height, strokeColor ? 'FD' : 'F');
  };

  // Helper to draw line
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: [number, number, number], width: number = 0.3) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
    pdf.setLineWidth(width);
    pdf.line(x1, y1, x2, y2);
  };

  // Helper to add text with styling
  const addText = (text: string, x: number, y: number, options: {
    fontSize?: number;
    isBold?: boolean;
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  } = {}) => {
    const { fontSize = 10, isBold = false, color = colors.textPrimary, align = 'left' } = options;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(text, x, y, { align });
  };

  // ============================================
  // PREMIUM HEADER SECTION
  // ============================================
  const headerHeight = 55;
  
  // Gradient effect simulation with layered rectangles
  drawRoundedRect(0, 0, pageWidth, headerHeight, colors.primaryDark);
  drawRoundedRect(0, 0, pageWidth, headerHeight - 5, colors.primary);
  
  yPosition = 22;
  addText(receiptData.businessName.toUpperCase(), pageWidth / 2, yPosition, {
    fontSize: 26,
    isBold: true,
    color: [255, 255, 255],
    align: 'center'
  });
  
  yPosition += 10;
  addText(receiptData.businessAddress, pageWidth / 2, yPosition, {
    fontSize: 11,
    color: [255, 255, 255],
    align: 'center'
  });
  
  yPosition += 7;
  const contactInfo = `${receiptData.businessPhone}  •  ${receiptData.businessEmail}  •  GST: ${receiptData.gstNumber}`;
  addText(contactInfo, pageWidth / 2, yPosition, {
    fontSize: 9,
    color: [240, 248, 255],
    align: 'center'
  });
  
  yPosition = headerHeight + 20;

  // ============================================
  // INVOICE DETAILS SECTION - Premium Card Design
  // ============================================
  const detailsBoxHeight = 38;
  const detailsBoxWidth = pageWidth - 2 * margin;
  
  // Card shadow effect (simulated with multiple rectangles)
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin + 1, yPosition - 7, detailsBoxWidth, detailsBoxHeight + 2, 'F');
  
  // Main card
  drawRoundedRect(margin, yPosition - 8, detailsBoxWidth, detailsBoxHeight, [255, 255, 255], colors.border, 0.3);
  
  // Left side - Invoice number
  addText('INVOICE', margin + 12, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textSecondary,
    align: 'left'
  });
  
  addText(`#${receiptData.invoiceId}`, margin + 12, yPosition + 8, {
    fontSize: 22,
    isBold: true,
    color: colors.primary,
    align: 'left'
  });
  
  // Right side - Date and Customer info
  const rightColumnX = pageWidth - margin - 12;
  
  const dateStr = new Date(receiptData.date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  addText('Date', rightColumnX, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textSecondary,
    align: 'right'
  });
  
  addText(dateStr, rightColumnX, yPosition + 6, {
    fontSize: 10,
    isBold: true,
    color: colors.textPrimary,
    align: 'right'
  });
  
  yPosition += 14;
  addText('Customer', rightColumnX, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textSecondary,
    align: 'right'
  });
  
  addText(receiptData.customerName, rightColumnX, yPosition + 6, {
    fontSize: 10,
    isBold: true,
    color: colors.textPrimary,
    align: 'right'
  });
  
  if (receiptData.customerPhone) {
    yPosition += 12;
    addText(receiptData.customerPhone, rightColumnX, yPosition, {
      fontSize: 9,
      isBold: false,
      color: colors.textSecondary,
      align: 'right'
    });
  }
  
  yPosition += 22;

  // ============================================
  // ITEMS TABLE - Professional Design
  // ============================================
  const tableStartX = margin;
  const tableWidth = pageWidth - 2 * margin;
  
  // Section title
  addText('Items', tableStartX, yPosition, {
    fontSize: 14,
    isBold: true,
    color: colors.textPrimary,
    align: 'left'
  });
  
  yPosition += 10;
  
  // Table header configuration
  const itemColWidth = 100;
  const qtyColWidth = 32;
  const priceColWidth = 42;
  const totalColWidth = 42;
  const headerHeight_px = 12;
  
  // Column positions for right-aligned columns
  const qtyColRight = tableStartX + itemColWidth + qtyColWidth;
  const priceColRight = qtyColRight + priceColWidth;
  const totalColRight = priceColRight + totalColWidth;
  
  // Table header background
  drawRoundedRect(tableStartX, yPosition - 8, tableWidth, headerHeight_px, colors.primaryDark);
  
  // Header text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  
  pdf.text('Item', tableStartX + 8, yPosition);
  pdf.text('Qty', qtyColRight - 4, yPosition, { align: 'right' });
  pdf.text('Price', priceColRight - 4, yPosition, { align: 'right' });
  pdf.text('Total', totalColRight - 4, yPosition, { align: 'right' });
  
  yPosition += 14;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2]);
  
  receiptData.items.forEach((item, index) => {
    const rowY = yPosition;
    
    // Build details string
    const details: string[] = [];
    if (item.weight) details.push(`Weight: ${item.weight}g`);
    if (item.purity) details.push(`Purity: ${item.purity}`);
    if (item.customRate) details.push(`Rate: ₹${item.customRate.toLocaleString('en-IN')}`);
    if (item.taxRate) details.push(`Tax: ${item.taxRate}%`);
    if (item.details) details.push(item.details);
    const detailsText = details.length > 0 ? details.join(' | ') : '';
    
    // Calculate row height based on content
    const itemLines = pdf.splitTextToSize(item.name, itemColWidth - 16);
    const detailsLines = detailsText ? pdf.splitTextToSize(detailsText, itemColWidth - 16) : [];
    const totalLines = Math.max(itemLines.length + detailsLines.length, 1);
    const rowHeight = totalLines * 5 + 4;
    
    // Alternating row colors
    if (index % 2 === 0) {
      drawRoundedRect(tableStartX, rowY - 7, tableWidth, rowHeight, colors.bgLight);
    } else {
      drawRoundedRect(tableStartX, rowY - 7, tableWidth, rowHeight, [255, 255, 255]);
    }
    
    // Item name with wrapping
    pdf.text(itemLines, tableStartX + 8, rowY);
    
    // Item details below name (smaller font)
    if (detailsLines.length > 0) {
      pdf.setFontSize(8);
      pdf.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2]);
      pdf.text(detailsLines, tableStartX + 8, rowY + itemLines.length * 5 + 2);
      pdf.setFontSize(10);
      pdf.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2]);
    }
    
    // Numeric values - perfectly aligned (positioned at top of row)
    pdf.text(item.quantity.toString(), qtyColRight - 4, rowY, { align: 'right' });
    pdf.text(`₹${item.price.toLocaleString('en-IN')}`, priceColRight - 4, rowY, { align: 'right' });
    pdf.text(`₹${item.total.toLocaleString('en-IN')}`, totalColRight - 4, rowY, { align: 'right' });
    
    yPosition += rowHeight;
  });
  
  // Table bottom border
  drawLine(tableStartX, yPosition + 2, tableStartX + tableWidth, yPosition + 2, colors.borderDark, 0.5);
  yPosition += 12;

  // ============================================
  // TOTALS SECTION - Premium Styled Box
  // ============================================
  const totalsBoxWidth = 90;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalsBoxHeight = 48;
  
  // Card with shadow
  pdf.setFillColor(245, 245, 245);
  pdf.rect(totalsBoxX + 1, yPosition - 7, totalsBoxWidth, totalsBoxHeight + 2, 'F');
  
  // Main totals box
  drawRoundedRect(totalsBoxX, yPosition - 8, totalsBoxWidth, totalsBoxHeight, [255, 255, 255], colors.primary, 0.5);
  
  const totalsRightX = totalsBoxX + totalsBoxWidth - 8;
  let totalsY = yPosition;
  
  // Subtotal
  addText('Subtotal', totalsBoxX + 8, totalsY, {
    fontSize: 10,
    isBold: false,
    color: colors.textSecondary,
    align: 'left'
  });
  addText(`₹${receiptData.subtotal.toLocaleString('en-IN')}`, totalsRightX, totalsY, {
    fontSize: 10,
    isBold: false,
    color: colors.textPrimary,
    align: 'right'
  });
  
  totalsY += 9;
  
  // Tax
  const taxRate = receiptData.items[0]?.taxRate || 3;
  addText(`Tax (${taxRate}%)`, totalsBoxX + 8, totalsY, {
    fontSize: 10,
    isBold: false,
    color: colors.textSecondary,
    align: 'left'
  });
  addText(`₹${Math.round(receiptData.tax).toLocaleString('en-IN')}`, totalsRightX, totalsY, {
    fontSize: 10,
    isBold: false,
    color: colors.textPrimary,
    align: 'right'
  });
  
  totalsY += 12;
  
  // Divider line
  drawLine(totalsBoxX + 4, totalsY, totalsRightX, totalsY, colors.borderDark, 0.5);
  totalsY += 10;
  
  // Total - Prominent
  addText('Total', totalsBoxX + 8, totalsY, {
    fontSize: 14,
    isBold: true,
    color: colors.primary,
    align: 'left'
  });
  addText(`₹${receiptData.total.toLocaleString('en-IN')}`, totalsRightX, totalsY, {
    fontSize: 16,
    isBold: true,
    color: colors.primary,
    align: 'right'
  });
  
  yPosition += totalsBoxHeight + 15;

  // ============================================
  // PAYMENT METHOD SECTION
  // ============================================
  const paymentBoxHeight = 40;
  drawRoundedRect(margin, yPosition - 8, pageWidth - 2 * margin, paymentBoxHeight, [240, 248, 255], colors.primary, 0.3);
  
  addText('Payment Method', margin + 10, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textSecondary,
    align: 'left'
  });
  
  addText(receiptData.paymentMethod.toUpperCase(), margin + 10, yPosition + 8, {
    fontSize: 12,
    isBold: true,
    color: colors.primary,
    align: 'left'
  });
  
  if (receiptData.upiId && receiptData.paymentMethod.toLowerCase().includes('upi')) {
    yPosition += 12;
    addText(`UPI ID: ${receiptData.upiId}`, margin + 10, yPosition, {
      fontSize: 9,
      isBold: false,
      color: colors.textSecondary,
      align: 'left'
    });
    
    // UPI QR Code
    try {
      yPosition += 12;
      
      const pa = receiptData.upiId || "";
      const pn = receiptData.businessName || "";
      const am = receiptData.total.toFixed(2);
      const tn = `Invoice ${receiptData.invoiceId}`;
      const upiPaymentString = `UPI://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&cu=INR&tn=${encodeURIComponent(tn)}`;
      
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&margin=2&data=${encodeURIComponent(upiPaymentString)}`;
      
      const response = await fetch(qrCodeUrl);
      if (!response.ok) throw new Error('Failed to fetch QR code');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          try {
            const qrCodeDataUrl = reader.result as string;
            const qrSize = 35;
            const qrX = pageWidth / 2 - qrSize / 2;
            pdf.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
            
            yPosition += qrSize + 6;
            addText('Scan to pay with any UPI app', pageWidth / 2, yPosition, {
              fontSize: 9,
              isBold: true,
              color: colors.primary,
              align: 'center'
            });
            
            yPosition += 5;
            addText('(PhonePe, Google Pay, Paytm, BHIM, etc.)', pageWidth / 2, yPosition, {
              fontSize: 8,
              isBold: false,
              color: colors.textSecondary,
              align: 'center'
            });
            
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error adding QR code:', error);
    }
  }
  
  yPosition += 18;

  // ============================================
  // FOOTER SECTION - Elegant Design
  // ============================================
  drawLine(margin, yPosition, pageWidth - margin, yPosition, colors.border, 0.3);
  yPosition += 12;
  
  addText('Thank you for your business!', pageWidth / 2, yPosition, {
    fontSize: 13,
    isBold: true,
    color: colors.primary,
    align: 'center'
  });
  
  yPosition += 8;
  addText('Please keep this receipt for your records.', pageWidth / 2, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textSecondary,
    align: 'center'
  });
  
  yPosition += 6;
  addText('Visit us again for more beautiful jewelry!', pageWidth / 2, yPosition, {
    fontSize: 9,
    isBold: false,
    color: colors.textLight,
    align: 'center'
  });

  // ============================================
  // DOWNLOAD PDF
  // ============================================
  pdf.save(`invoice-${receiptData.invoiceId}.pdf`);
};

export const generateReceiptFromElement = async (elementId: string, filename: string = 'receipt.pdf'): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.text('Receipt generated from element', 20, 20);
  pdf.save(filename);
};
