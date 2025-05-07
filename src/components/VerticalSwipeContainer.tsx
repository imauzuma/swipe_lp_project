import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Pagination } from 'swiper/modules';
import ProductSlide from './ProductSlide';
import { ShopifyProduct } from '../types/shopify';

interface VerticalSwipeContainerProps {
  products: ShopifyProduct[];
}

const VerticalSwipeContainer: React.FC<VerticalSwipeContainerProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">No products found.</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen">
      <Swiper
        direction={'vertical'}
        slidesPerView={1}
        spaceBetween={0}
        mousewheel={true}
        pagination={{
          clickable: true,
          type: 'progressbar'
        }}
        modules={[Mousewheel, Pagination]}
        className="h-full w-full"
      >
        {products.map((product, index) => (
          <SwiperSlide key={index}>
            <ProductSlide product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default VerticalSwipeContainer;
