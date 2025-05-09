import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { ShopifyProduct } from '../types/shopify';

interface ProductSlideProps {
  product: ShopifyProduct;
  index: number;
  totalProducts: number;
}

const ProductSlide: React.FC<ProductSlideProps> = ({ product, index, totalProducts }) => {
  const { title, images, onlineStoreUrl } = product;
  const [showSwipeGuide, setShowSwipeGuide] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeGuide(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="h-full w-full flex flex-col relative bg-white">
      {/* Product Image Container */}
      <div className="flex-grow relative overflow-hidden bg-gray-100">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }}
          pagination={false}
          className="h-full w-full product-swiper"
        >
          {images.map((image, idx) => (
            <SwiperSlide key={idx} className="flex items-center justify-center">
              <div className="relative h-full w-full flex items-center justify-center">
                <img
                  src={image.url}
                  alt={image.altText || title}
                  className="w-full h-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </div>
            </SwiperSlide>
          ))}
          
          {/* Image Counter - Top Left */}
          <div className="absolute top-3 left-3 z-10 bg-gray-700 bg-opacity-70 text-white text-sm px-3 py-1 rounded-full">
            {index + 1} / {totalProducts}
          </div>
          
          {/* Custom navigation arrows */}
          <div className="swiper-button-prev"></div>
          <div className="swiper-button-next"></div>
        </Swiper>
      </div>
      
      {/* Product Title */}
      <div className="px-4 py-1 bg-white">
        <h2 className="text-xs font-normal text-black truncate">{title}</h2>
      </div>
      
      {/* Swipe guide overlay */}
      {showSwipeGuide && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black bg-opacity-70 text-white px-8 py-6 rounded-lg flex flex-col items-center max-w-xs">
            <div className="mb-2 swipe-guide-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
            </div>
            <p className="text-center font-medium">上にスワイプして<br/>次の商品をチェック</p>
            <button 
              onClick={() => setShowSwipeGuide(false)}
              className="absolute top-2 right-2 text-white"
              aria-label="Close guide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Product Detail Button */}
      {onlineStoreUrl && (
        <a
          href={onlineStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-50 bg-white text-black px-4 py-1.5 rounded-full text-xs font-medium shadow-lg border border-gray-200"
        >
          商品詳細を見る
        </a>
      )}
    </div>
  );
};

export default ProductSlide;
