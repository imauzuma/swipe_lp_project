import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { ShopifyProduct } from '../types/shopify';

interface ProductSlideProps {
  product: ShopifyProduct;
}

const ProductSlide: React.FC<ProductSlideProps> = ({ product }) => {
  const { title, images, priceRange, onlineStoreUrl } = product;
  const [showSwipeGuide, setShowSwipeGuide] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeGuide(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };
  
  return (
    <div className="h-screen w-full flex flex-col relative bg-gray-50">
      {/* Horizontal Swiper for product images */}
      <div className="flex-grow relative">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }}
          pagination={{ 
            type: 'fraction',
            el: '.swiper-pagination'
          }}
          className="h-full w-full product-swiper"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index} className="flex items-center justify-center">
              <div className="relative h-full w-full flex items-center justify-center">
                <img
                  src={image.url}
                  alt={image.altText || title}
                  className="max-h-full max-w-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </SwiperSlide>
          ))}
          
          {/* Custom navigation arrows */}
          <div className="swiper-button-prev"></div>
          <div className="swiper-button-next"></div>
          
          {/* Custom pagination */}
          <div className="swiper-pagination"></div>
          
          {/* Slide counter */}
          <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            {product.id.split('/').pop()?.split('?')[0]}
          </div>
        </Swiper>
      </div>
      
      {/* Swipe guide overlay */}
      {showSwipeGuide && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black bg-opacity-70 text-white px-8 py-6 rounded-lg flex flex-col items-center max-w-xs">
            <div className="mb-2">
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
      
      {/* Product info overlay at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent text-white z-10">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold truncate">{title}</h2>
            <p className="text-lg font-medium">
              {priceRange?.minVariantPrice 
                ? formatPrice(
                    priceRange.minVariantPrice.amount,
                    priceRange.minVariantPrice.currencyCode
                  )
                : "価格情報なし"}
            </p>
          </div>
          {onlineStoreUrl && (
            <a
              href={onlineStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              商品詳細を見る
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSlide;
