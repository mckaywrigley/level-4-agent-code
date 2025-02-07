"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function InvoiceEstimator() {
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [unitPrice, setUnitPrice] = useState(0)
  const [total, setTotal] = useState(0)

  const handleCalculate = () => {
    const calcTotal = quantity * unitPrice
    setTotal(calcTotal)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Invoice Estimator</h2>

      <div className="space-y-2">
        <label className="block font-medium">Item Description</label>
        <Input
          type="text"
          placeholder="Enter item description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
        <div className="flex-1">
          <label className="block font-medium">Quantity</label>
          <Input
            type="number"
            placeholder="0"
            value={quantity}
            onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="flex-1">
          <label className="block font-medium">Unit Price</label>
          <Input
            type="number"
            placeholder="0"
            value={unitPrice}
            onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <Button onClick={handleCalculate}>Calculate Total</Button>

      <div className="mt-4">
        <p className="font-medium">Total Amount: <span className="font-bold">${total.toFixed(2)}</span></p>
      </div>
    </div>
  )
}
