import React from 'react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import defaultLogo from '@/assets/logo.png';

const InvoiceTemplate = ({ invoice, currency = 'LKR' }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Use browser's print-to-PDF for a reliable full-layout export
    const originalTitle = document.title;
    const fileSafeNumber = invoice.invoiceNumber || invoice.id || 'invoice';
    document.title = `Invoice-${fileSafeNumber}`;
    window.print();
    document.title = originalTitle;
  };

  const totalItems = invoice.items || [];
  const { settings } = useFinance();

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          Print
        </Button>
      </div>
      <div className="print-area bg-white text-black px-8 py-8 space-y-6">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 flex items-center justify-between">
          <div>
            <img
              src={settings.logo || defaultLogo}
              alt={settings.businessName || 'Logo'}
              className="h-12 object-contain"
            />
            <p className="text-sm text-gray-600 mt-1">Invoice</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{formatDate(invoice.createdAt || invoice.dueDate)}</p>
          </div>
        </div>

        {/* Invoice details */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="font-bold text-lg mb-2 text-black">Invoice To:</h2>
            <p className="text-black font-semibold">{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-sm text-gray-600">{invoice.clientEmail}</p>
            )}
            {invoice.clientPhone && (
              <p className="text-sm text-gray-600">{invoice.clientPhone}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg mb-2 text-black">Invoice Details:</h2>
            <p className="text-black">
              <span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600">
              Due: {formatDate(invoice.dueDate || invoice.createdAt)}
            </p>
            <p className="text-sm text-gray-600">
              Payment: {invoice.paymentMethod?.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 text-black">Service / Item</th>
              <th className="text-center py-2 text-black">Qty</th>
              <th className="text-right py-2 text-black">Price</th>
              <th className="text-right py-2 text-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {totalItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-300">
                <td className="py-3 text-black">
                  <div className="font-semibold">{item.description}</div>
                  {item.serviceType && (
                    <div className="text-sm text-gray-600">{item.serviceType}</div>
                  )}
                </td>
                <td className="text-center py-3 text-black">
                  {item.quantity ?? 1}
                </td>
                <td className="text-right py-3 text-black">
                  {currency} {(item.price || 0).toLocaleString()}
                </td>
                <td className="text-right py-3 text-black font-semibold">
                  {currency}{' '}
                  {((item.price || 0) * (item.quantity ?? 1)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-black">
              <span>Subtotal:</span>
              <span>
                {currency} {(invoice.subtotal || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-black">
              <span>Tax ({invoice.taxRate ?? 0}%):</span>
              <span>
                {currency} {(invoice.taxAmount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t-2 border-black pt-2 text-black">
              <span>Total:</span>
              <span>
                {currency} {(invoice.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 text-center text-sm text-gray-600">
          <p>Thank you for your business!</p>
          <p>Please make payment before the due date.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;