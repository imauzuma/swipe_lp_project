import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Pagination, EffectFade } from 'swiper/modules';
import ProductSlide from './ProductSlide';
import { ShopifyProduct } from '../types/shopify';

interface VerticalSwipeContainerProps {
  products: ShopifyProduct[];
}

const VerticalSwipeContainer: React.FC<VerticalSwipeContainerProps> = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">商品が見つかりませんでした。</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Swiper
        direction={'vertical'}
        slidesPerView={1}
        spaceBetween={0}
        mousewheel={true}
        effect={'fade'}
        fadeEffect={{ crossFade: true }}
        speed={600}
        pagination={{
          clickable: true,
          type: 'progressbar',
          progressbarOpposite: false
        }}
        modules={[Mousewheel, Pagination, EffectFade]}
        className="h-full w-full vertical-swiper"
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
