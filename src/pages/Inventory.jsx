import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { getStorageData, setStorageData } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Inventory = () => {
  const [cars, setCars] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadedCars = getStorageData('cars', []);
    setCars(loadedCars);
  }, []);

  const handleEdit = (id, field, value) => {
    const updatedCars = cars.map(car =>
      car.id === id ? { ...car, [field]: value } : car
    );
    setCars(updatedCars);
    setStorageData('cars', updatedCars);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Make', 'Model', 'Year', 'Price', 'Stock', 'VIN', 'Condition'];
    const rows = cars.map(car => [
      car.id,
      car.make,
      car.model,
      car.year,
      car.price,
      car.stock,
      car.vin,
      car.condition
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();

    toast({
      title: "Export successful",
      description: "Inventory exported to CSV",
    });
  };

  return (
    <>
      <Helmet>
        <title>Inventory - AutoPOS</title>
        <meta name="description" content="Manage your vehicle inventory" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your vehicle stock</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Vehicle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">VIN</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Condition</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car, index) => (
                  <motion.tr
                    key={car.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">{car.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={car.images[0]}
                          alt={`${car.make} ${car.model}`}
                          className="w-12 h-12 object-cover rounded"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-semibold">{car.make} {car.model}</div>
                          <div className="text-sm text-muted-foreground">{car.year}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{car.vin}</td>
                    <td className="px-4 py-3">
                      {editingId === car.id ? (
                        <input
                          type="number"
                          value={car.price}
                          onChange={(e) => handleEdit(car.id, 'price', parseFloat(e.target.value))}
                          onBlur={() => setEditingId(null)}
                          className="w-24 px-2 py-1 bg-secondary border border-primary rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingId(car.id)}
                          className="text-primary hover:underline"
                        >
                          ${car.price.toLocaleString()}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={car.stock}
                        onChange={(e) => handleEdit(car.id, 'stock', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 bg-secondary border border-secondary rounded text-sm focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        car.condition === 'new' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {car.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {car.stock <= 2 && (
                        <span className="flex items-center gap-1 text-red-500 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Low Stock
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Inventory;