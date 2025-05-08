import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Pagination } from 'swiper/modules';
import ProductSlide from './ProductSlide';
import { ShopifyProduct } from '../types/shopify';

interface VerticalSwipeContainerProps {
  products: ShopifyProduct[];
}

const VerticalSwipeContainer: React.FC<VerticalSwipeContainerProps> = ({ products }) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIfDesktop();
    
    window.addEventListener('resize', checkIfDesktop);
    
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);

  if (!products || products.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto text-gray-400 mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
            />
          </svg>
          <p className="text-xl text-gray-600 font-medium">商品が見つかりませんでした</p>
          <p className="text-gray-500 mt-2">後でもう一度お試しください</p>
        </div>
      </div>
    );
  }
  
  const swiperContent = (
    <Swiper
      direction={'vertical'}
      slidesPerView={1}
      spaceBetween={0}
      mousewheel={{
        sensitivity: 1,
        releaseOnEdges: true
      }}
      pagination={{
        clickable: true,
        type: 'progressbar',
        el: '.swiper-pagination-vertical'
      }}
      modules={[Mousewheel, Pagination]}
      className="h-full w-full"
      speed={600}
      threshold={20}
      touchAngle={45}
      resistanceRatio={0.85}
    >
      {products.map((product, index) => (
        <SwiperSlide key={index} className="h-full">
          <ProductSlide 
            product={product} 
            index={index} 
            totalProducts={products.length} 
          />
        </SwiperSlide>
      ))}
      
      {/* Custom vertical pagination */}
      <div className="swiper-pagination-vertical"></div>
    </Swiper>
  );
  
  if (isDesktop) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="relative w-[375px] h-[812px] bg-white rounded-[40px] shadow-2xl overflow-hidden">
          {/* Phone frame */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-black rounded-t-[40px] z-10">
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-400 rounded-full"></div>
          </div>
          {/* Content */}
          <div className="h-full w-full pt-6">
            {swiperContent}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {swiperContent}
    </div>
  );
};

export default VerticalSwipeContainer;
