import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { ShopifyProduct } from '../types/shopify';

interface ProductSlideProps {
  product: ShopifyProduct;
}

const ProductSlide: React.FC<ProductSlideProps> = ({ product }) => {
  const { title, images, priceRange, onlineStoreUrl } = product;
  
  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };
  
  return (
    <div className="h-screen w-full flex flex-col relative bg-gray-100">
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
                {/* Using regular img tag for better compatibility */}
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
          <div className="swiper-button-prev !text-white !bg-black !bg-opacity-50 !w-10 !h-10 !rounded-full flex items-center justify-center !left-4"></div>
          <div className="swiper-button-next !text-white !bg-black !bg-opacity-50 !w-10 !h-10 !rounded-full flex items-center justify-center !right-4"></div>
          
          {/* Custom pagination */}
          <div className="swiper-pagination !top-4 !right-4 !left-auto !bottom-auto !w-auto !bg-black !bg-opacity-50 !text-white !rounded-full !px-3 !py-1 !text-sm !z-10"></div>
        </Swiper>
      </div>
      
      {/* Product info overlay at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent text-white z-10">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-lg">
              {priceRange?.minVariantPrice 
                ? formatPrice(
                    priceRange.minVariantPrice.amount,
                    priceRange.minVariantPrice.currencyCode
                  )
                : "価格情報なし"}
            </p>
          </div>
          <a
            href={onlineStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            商品詳細を見る
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductSlide;
