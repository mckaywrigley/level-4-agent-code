/*
<ai_context>
This server page provides the entry point for the Invoice Estimator UI.
</ai_context>
*/

"use server"

import InvoiceEstimator from "./_components/invoice-estimator";

export default async function InvoicePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Invoice Estimator</h1>
      <InvoiceEstimator />
    </div>
  );
}
