import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: string;
  upiId?: string;
}

export const generateReceiptPDF = async (receiptData: ReceiptData): Promise<void> => {
  const pdf = new jsPDF({ compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', color?: [number, number, number]) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    if (color) {
      pdf.setTextColor(color[0], color[1], color[2]);
    }
    
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    const textX = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - margin : margin;
    pdf.text(lines, textX, yPosition, { align });
    if (color) {
      pdf.setTextColor(0, 0, 0); // Reset to black
    }
    yPosition += lines.length * (fontSize * 0.4);
  };

  // Numeric text helper
  const addNum = (text: string, x: number, y: number, size: number = 10, isBold: boolean = false) => {
    pdf.setFontSize(size);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    pdf.text(text, x, y, { align: 'right' });
  };

  // Helper to draw filled rectangle (for colored backgrounds)
  const drawRect = (x: number, y: number, width: number, height: number, color: [number, number, number]) => {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(x, y, width, height, 'F');
  };

  // Colored Header Section with background
  const headerHeight = 45;
  drawRect(0, 0, pageWidth, headerHeight, [34, 139, 34]); // Green background
  
  yPosition = 15;
  pdf.setTextColor(255, 255, 255); // White text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(receiptData.businessName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(receiptData.businessAddress, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  
  const contactInfo = `Phone: ${receiptData.businessPhone} | Email: ${receiptData.businessEmail} | GST: ${receiptData.gstNumber}`;
  pdf.setFontSize(9);
  pdf.text(contactInfo, pageWidth / 2, yPosition, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0); // Reset to black
  yPosition = headerHeight + 15;

  // Invoice Details Section with styled box
  pdf.setFillColor(245, 245, 245); // Light gray background
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 25, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(`INVOICE #${receiptData.invoiceId}`, margin + 5, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Date: ${new Date(receiptData.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, margin + 5, yPosition);
  yPosition += 6;
  pdf.text(`Customer: ${receiptData.customerName}`, margin + 5, yPosition);
  if (receiptData.customerPhone) {
    yPosition += 6;
    pdf.text(`Phone: ${receiptData.customerPhone}`, margin + 5, yPosition);
  }
  
  yPosition += 15;

  // Items Table with styled header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('ITEMS', margin, yPosition);
  yPosition += 8;
  
  // Table header with background
  const tableHeaderY = yPosition - 3;
  drawRect(margin, tableHeaderY, pageWidth - 2 * margin, 8, [46, 125, 50]); // Dark green header
  
  const colWidths = [95, 25, 35, 35];
  const colPositions = [
    margin + 5, 
    margin + colWidths[0], 
    margin + colWidths[0] + colWidths[1], 
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Item', colPositions[0], yPosition);
  pdf.text('Qty', colPositions[1], yPosition);
  pdf.text('Price', colPositions[2], yPosition);
  pdf.text('Total', colPositions[3], yPosition);
  
  pdf.setTextColor(0, 0, 0);
  yPosition += 10;

  // Items rows with alternating background
  pdf.setFont('helvetica', 'normal');
  receiptData.items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition - 4, pageWidth - 2 * margin, 8, 'F');
    }
    
    const lines = pdf.splitTextToSize(item.name, colWidths[0] - 10);
    const maxLines = Math.max(lines.length, 1);
    
    pdf.setFontSize(10);
    pdf.text(lines, colPositions[0], yPosition);
    addNum(item.quantity.toString(), colPositions[1] + colWidths[1] - 5, yPosition, 10);
    addNum(`₹${item.price.toLocaleString('en-IN')}`, colPositions[2] + colWidths[2] - 5, yPosition, 10);
    addNum(`₹${item.total.toLocaleString('en-IN')}`, colPositions[3] + colWidths[3] - 5, yPosition, 10);
    
    yPosition += maxLines * 5 + 3;
  });

  yPosition += 8;
  
  // Totals section with styled box
  pdf.setFillColor(245, 245, 245);
  const totalsBoxHeight = 35;
  pdf.rect(pageWidth - margin - 80, yPosition - 5, 80, totalsBoxHeight, 'F');
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Subtotal:', pageWidth - margin - 75, yPosition);
  addNum(`₹${receiptData.subtotal.toLocaleString('en-IN')}`, pageWidth - margin - 5, yPosition, 10);
  yPosition += 8;
  
  pdf.text('Tax (8%):', pageWidth - margin - 75, yPosition);
  addNum(`₹${receiptData.tax.toLocaleString('en-IN')}`, pageWidth - margin - 5, yPosition, 10);
  yPosition += 10;
  
  // Draw line above total
  pdf.setDrawColor(46, 125, 50);
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth - margin - 80, yPosition, pageWidth - margin - 5, yPosition);
  yPosition += 8;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Total:', pageWidth - margin - 75, yPosition);
  addNum(`₹${receiptData.total.toLocaleString('en-IN')}`, pageWidth - margin - 5, yPosition, 14, true);
  
  yPosition += 20;

  // Payment Method Section
  pdf.setFillColor(240, 248, 255); // Light blue background
  pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 30, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Payment Method: ${receiptData.paymentMethod.toUpperCase()}`, margin + 5, yPosition);
  
  if (receiptData.upiId && receiptData.paymentMethod.toLowerCase().includes('upi')) {
    yPosition += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`UPI ID: ${receiptData.upiId}`, margin + 5, yPosition);
    
    // Add UPI QR Code
    try {
      yPosition += 10;
      
      // Generate UPI payment string in proper format (matching POS implementation)
      const pa = receiptData.upiId || "";
      const pn = receiptData.businessName || "";
      const am = receiptData.total.toFixed(2);
      const tn = `Invoice ${receiptData.invoiceId}`;
      const upiPaymentString = `UPI://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&cu=INR&tn=${encodeURIComponent(tn)}`;
      
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&margin=2&data=${encodeURIComponent(upiPaymentString)}`;
      
      // Fetch QR code image
      const response = await fetch(qrCodeUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }
      const blob = await response.blob();
      const reader = new FileReader();
      
      await new Promise<void>((resolve, reject) => {
        reader.onload = () => {
          try {
            const qrCodeDataUrl = reader.result as string;
            const qrSize = 45; // 45mm size for better visibility
            const qrX = pageWidth / 2 - qrSize / 2;
            pdf.addImage(qrCodeDataUrl, 'PNG', qrX, yPosition, qrSize, qrSize);
            yPosition += qrSize + 8;
            
            pdf.setFontSize(9);
            pdf.setTextColor(46, 125, 50);
            pdf.text('Scan to pay with any UPI app', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`(PhonePe, Google Pay, Paytm, etc.)`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;
            pdf.setTextColor(0, 0, 0); // Reset to black
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
      // Continue without QR code if it fails
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('QR code unavailable', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      pdf.setTextColor(0, 0, 0);
    }
  }
  
  yPosition += 10;

  // Footer
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(46, 125, 50);
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Please keep this receipt for your records.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  pdf.text('Visit us again for more beautiful jewelry!', pageWidth / 2, yPosition, { align: 'center' });

  // Download the PDF
  pdf.save(`invoice-${receiptData.invoiceId}.pdf`);
};

export const generateReceiptFromElement = async (elementId: string, filename: string = 'receipt.pdf'): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;

  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
};
