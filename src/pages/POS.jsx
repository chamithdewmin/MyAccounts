import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { getStorageData } from '@/utils/storage';
import ProductCard from '@/components/ProductCard';
import FilterBar from '@/components/FilterBar';
import ProductModal from '@/components/ProductModal';

const POS = () => {
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    colors: [],
    priceRange: [0, 100000],
    yearRange: [2015, 2024],
    make: '',
    sortBy: 'latest',
  });

  useEffect(() => {
    const loadedCars = getStorageData('cars', []);
    setCars(loadedCars);
    setFilteredCars(loadedCars);
  }, []);

  useEffect(() => {
    let result = [...cars];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(car =>
        car.make.toLowerCase().includes(searchLower) ||
        car.model.toLowerCase().includes(searchLower) ||
        car.vin.toLowerCase().includes(searchLower)
      );
    }

    // Color filter
    if (filters.colors.length > 0) {
      result = result.filter(car =>
        car.colors.some(color => filters.colors.includes(color))
      );
    }

    // Price range filter
    result = result.filter(car =>
      car.price >= filters.priceRange[0] && car.price <= filters.priceRange[1]
    );

    // Year range filter
    result = result.filter(car =>
      car.year >= filters.yearRange[0] && car.year <= filters.yearRange[1]
    );

    // Make filter
    if (filters.make) {
      result = result.filter(car => car.make === filters.make);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'latest':
        result.sort((a, b) => b.year - a.year);
        break;
      default:
        break;
    }

    setFilteredCars(result);
  }, [filters, cars]);

  return (
    <>
      <Helmet>
        <title>POS / Catalog - AutoPOS</title>
        <meta name="description" content="Browse and purchase vehicles from our catalog" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">POS / Catalog</h1>
          <p className="text-muted-foreground">Browse and add vehicles to cart</p>
        </div>

        <FilterBar filters={filters} setFilters={setFilters} cars={cars} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCars.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard car={car} onQuickView={() => setSelectedCar(car)} />
            </motion.div>
          ))}
        </div>

        {filteredCars.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No vehicles found matching your filters</p>
          </div>
        )}
      </div>

      <ProductModal
        car={selectedCar}
        isOpen={!!selectedCar}
        onClose={() => setSelectedCar(null)}
      />
    </>
  );
};

export default POS;