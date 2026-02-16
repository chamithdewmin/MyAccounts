import React, { useRef } from "react";
import html2pdf from "html2pdf.js";

const InvoiceTemplate = ({ invoice, currency = "LKR" }) => {
  const printRef = useRef();

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // ================= PDF DOWNLOAD =================
  const downloadPDF = async () => {
    const el = printRef.current;

    const opt = {
      margin: 0,
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 3, // SUPER SHARP
        useCORS: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    await html2pdf().set(opt).from(el).save();
  };

  // ================= PRINT =================
  const handlePrint = () => window.print();

  const items = invoice.items || [];

  return (
    <div>
      {/* ACTIONS */}
      <div className="flex gap-2 mb-4 print:hidden">
        <button onClick={downloadPDF} className="btn">
          Download PDF
        </button>
        <button onClick={handlePrint} className="btn">
          Print
        </button>
      </div>

      {/* ================= A4 INVOICE ================= */}
      <div ref={printRef} className="invoice">
        {/* HEADER */}
        <div className="header">
          <div>
            <h1 className="logo">LogozoDev<span className="dot">.</span></h1>
            <p className="muted">LogozoDev</p>
            <p className="muted">Invoice # {invoice.invoiceNumber}</p>
            <p className="muted">Date: {formatDate(invoice.createdAt)}</p>
          </div>

          <div className="right">
            <div className="badge">INVOICE</div>
            <p className="muted mt">Invoice to:</p>
            <p className="bold">{invoice.clientName}</p>
            <p className="muted">{invoice.clientPhone}</p>
          </div>
        </div>

        {/* TABLE */}
        <table className="table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th className="r">Unit Price</th>
              <th className="c">Qty</th>
              <th className="r">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="r">
                  {currency} {it.price.toLocaleString()}
                </td>
                <td className="c">{it.quantity}</td>
                <td className="r bold">
                  {currency} {(it.price * it.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="totals">
          <div className="row">
            <span>Sub Total</span>
            <span>
              {currency} {invoice.subtotal.toLocaleString()}
            </span>
          </div>
          <div className="row">
            <span>Tax (0%)</span>
            <span>{currency} 0</span>
          </div>

          <div className="grand">
            <span>Grand Total</span>
            <span>
              {currency} {invoice.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* BANK */}
        <div className="bank">
          <h3>Bank Transfer</h3>
          <p>Account: {invoice.bankDetails.accountNumber}</p>
          <p>Name: {invoice.bankDetails.accountName}</p>
          <p>Bank: {invoice.bankDetails.bankName}</p>
        </div>

        {/* FOOTER */}
        <p className="footer">Thank you for your business!</p>
      </div>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .invoice {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          padding: 18mm;
          margin: auto;
          font-family: Arial, sans-serif;
          color: #000;
        }

        .logo {
          font-size: 28px;
          font-weight: 800;
        }

        .dot {
          color: #1ea400;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #ddd;
          padding-bottom: 12px;
        }

        .badge {
          background: #1ea400;
          color: #fff;
          font-weight: bold;
          padding: 6px 16px;
          border-radius: 6px;
        }

        .right {
          text-align: right;
        }

        .muted {
          color: #666;
          font-size: 13px;
        }

        .bold {
          font-weight: bold;
        }

        .mt {
          margin-top: 10px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .table thead {
          background: #1ea400;
          color: white;
        }

        .table th,
        .table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }

        .r {
          text-align: right;
        }

        .c {
          text-align: center;
        }

        .totals {
          width: 260px;
          margin-left: auto;
          margin-top: 20px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .grand {
          background: #1ea400;
          color: white;
          font-weight: bold;
          padding: 10px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }

        .bank {
          margin-top: 25px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
          font-size: 14px;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
        }

        /* PRINT FIX */
        @media print {
          body {
            margin: 0;
            background: white;
          }
          .btn {
            display: none;
          }
        }

        .btn {
          background: black;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default InvoiceTemplate;
