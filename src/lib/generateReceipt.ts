import jsPDF from 'jspdf';

export interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price_pkr: number;
  total_pkr: number;
}

export interface ReceiptData {
  saleNumber: string;
  date: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  subtotalPKR: number;
  discountPKR: number;
  totalPKR: number;
  currency: string;
  paymentMethod: string;
  notes?: string | null;
  salesRepName?: string;
}

const currencySymbols: Record<string, string> = {
  PKR: '₨',
  SAR: 'ر.س',
  AED: 'د.إ',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  mobile_wallet: 'Mobile Wallet',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Receipt paper width, dynamic height
  });

  const pageWidth = 80;
  const margin = 5;
  const contentWidth = pageWidth - margin * 2;
  let y = 10;
  const lineHeight = 5;

  // Helper functions
  const centerText = (text: string, yPos: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
  };

  const leftRightText = (left: string, right: string, yPos: number) => {
    doc.setFontSize(8);
    doc.text(left, margin, yPos);
    const rightWidth = doc.getTextWidth(right);
    doc.text(right, pageWidth - margin - rightWidth, yPos);
  };

  const drawLine = (yPos: number, dashed: boolean = false) => {
    if (dashed) {
      doc.setLineDashPattern([1, 1], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.line(margin, yPos, pageWidth - margin, yPos);
    doc.setLineDashPattern([], 0);
  };

  // Header - Company Name
  doc.setFont('helvetica', 'bold');
  centerText('HERBAL HUB', y, 14);
  y += 6;

  doc.setFont('helvetica', 'normal');
  centerText('Health & Wellness Store', y, 8);
  y += 8;

  drawLine(y);
  y += 5;

  // Sale Details
  doc.setFontSize(8);
  leftRightText('Receipt #:', data.saleNumber, y);
  y += lineHeight;
  leftRightText('Date:', data.date, y);
  y += lineHeight;
  
  if (data.salesRepName) {
    leftRightText('Sales Rep:', data.salesRepName, y);
    y += lineHeight;
  }

  y += 2;
  drawLine(y, true);
  y += 5;

  // Customer Details
  if (data.customerName || data.customerPhone) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Customer:', margin, y);
    y += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    if (data.customerName) {
      doc.text(data.customerName, margin, y);
      y += lineHeight;
    }
    if (data.customerPhone) {
      doc.text(data.customerPhone, margin, y);
      y += lineHeight;
    }
    y += 2;
    drawLine(y, true);
    y += 5;
  }

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', margin, y);
  doc.text('Qty', margin + 40, y);
  doc.text('Total', pageWidth - margin - 12, y);
  y += lineHeight;
  
  drawLine(y);
  y += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  data.items.forEach((item) => {
    // Product name (may wrap)
    const nameLines = doc.splitTextToSize(item.product_name, 38);
    nameLines.forEach((line: string, i: number) => {
      doc.text(line, margin, y);
      if (i === 0) {
        doc.text(item.quantity.toString(), margin + 42, y);
        const totalText = `₨${formatCurrency(item.total_pkr)}`;
        const totalWidth = doc.getTextWidth(totalText);
        doc.text(totalText, pageWidth - margin - totalWidth, y);
      }
      y += lineHeight;
    });
    
    // Unit price
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`@ ₨${formatCurrency(item.unit_price_pkr)}`, margin + 2, y);
    doc.setTextColor(0);
    doc.setFontSize(8);
    y += lineHeight + 1;
  });

  y += 2;
  drawLine(y);
  y += 5;

  // Totals
  leftRightText('Subtotal:', `₨${formatCurrency(data.subtotalPKR)}`, y);
  y += lineHeight;

  if (data.discountPKR > 0) {
    leftRightText('Discount:', `-₨${formatCurrency(data.discountPKR)}`, y);
    y += lineHeight;
  }

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  leftRightText('TOTAL:', `₨${formatCurrency(data.totalPKR)}`, y);
  y += lineHeight + 2;

  // Currency & Payment
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  if (data.currency !== 'PKR') {
    leftRightText('Original Currency:', `${currencySymbols[data.currency]} ${data.currency}`, y);
    y += lineHeight;
  }
  
  leftRightText('Payment:', paymentMethodLabels[data.paymentMethod] || data.paymentMethod, y);
  y += lineHeight + 3;

  drawLine(y, true);
  y += 5;

  // Notes
  if (data.notes) {
    doc.setFontSize(7);
    doc.text('Notes:', margin, y);
    y += lineHeight - 1;
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    noteLines.slice(0, 3).forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 3;
  }

  // Footer
  centerText('Thank you for your purchase!', y, 8);
  y += lineHeight;
  centerText('www.herbalhub.pk', y, 7);
  y += 10;

  // Resize page to actual content
  const pages = doc.internal.pages;
  // @ts-ignore - internal API
  doc.internal.pageSize.height = y;

  return doc;
}

export function downloadReceipt(data: ReceiptData): void {
  const doc = generateReceiptPDF(data);
  doc.save(`receipt-${data.saleNumber}.pdf`);
}

export function openReceiptInNewTab(data: ReceiptData): void {
  const doc = generateReceiptPDF(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
