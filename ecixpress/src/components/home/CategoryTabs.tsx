import React from 'react';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-8 py-3 rounded-2xl font-semibold text-lg transition-all duration-300 ease-in-out
            ${activeCategory === category
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-200/60 hover:shadow-xl hover:scale-105'
              : 'bg-white/40 backdrop-blur-2xl text-gray-600 hover:bg-white/60 hover:text-gray-900 shadow-sm hover:shadow-md border border-white/50'
            }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
