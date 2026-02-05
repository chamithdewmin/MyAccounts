import React from 'react';

const InvoiceTemplate = ({ order }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="print-area bg-white text-black p-8 space-y-6">
      {/* Header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold text-black">AutoPOS</h1>
        <p className="text-sm text-gray-600">Premium Car Dealership</p>
      </div>

      {/* Invoice details */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="font-bold text-lg mb-2 text-black">Invoice To:</h2>
          <p className="text-black font-semibold">{order.customerName}</p>
          <p className="text-sm text-gray-600">Customer ID: {order.customerId}</p>
        </div>
        <div className="text-right">
          <h2 className="font-bold text-lg mb-2 text-black">Invoice Details:</h2>
          <p className="text-black"><span className="font-semibold">Invoice #:</span> {order.id}</p>
          <p className="text-sm text-gray-600">{formatDate(order.date)}</p>
          <p className="text-sm text-gray-600">Payment: {order.paymentMethod.toUpperCase()}</p>
        </div>
      </div>

      {/* Items table */}
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 text-black">Item</th>
            <th className="text-left py-2 text-black">Color</th>
            <th className="text-center py-2 text-black">Qty</th>
            <th className="text-right py-2 text-black">Price</th>
            <th className="text-right py-2 text-black">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-300">
              <td className="py-3 text-black">
                <div className="font-semibold">{item.make} {item.model}</div>
                <div className="text-sm text-gray-600">{item.year} - VIN: {item.vin}</div>
              </td>
              <td className="py-3 text-black capitalize">{item.selectedColor}</td>
              <td className="text-center py-3 text-black">{item.quantity}</td>
              <td className="text-right py-3 text-black">${item.price.toLocaleString()}</td>
              <td className="text-right py-3 text-black font-semibold">${(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-black">
            <span>Subtotal:</span>
            <span>${order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-black">
            <span>Tax (10%):</span>
            <span>${order.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t-2 border-black pt-2 text-black">
            <span>Total:</span>
            <span>${order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-black pt-4 text-center text-sm text-gray-600">
        <p>Thank you for your business!</p>
        <p>AutoPOS - Your trusted car dealership</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate;