import React from 'react';
import Image from 'next/image';
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
    <div className="h-screen w-full flex flex-col relative">
      {/* Horizontal Swiper for product images */}
      <div className="flex-grow relative">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ 
            type: 'fraction',
            el: '.swiper-pagination'
          }}
          className="h-full w-full"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index}>
              <div className="h-full w-full flex items-center justify-center">
                <div className="max-h-full max-w-full object-contain">
                  {/* Using Next.js Image component for better performance */}
                  <Image
                    src={image.url}
                    alt={image.altText || title}
                    fill
                    sizes="100vw"
                    style={{ objectFit: 'contain' }}
                    priority={index === 0}
                  />
                </div>
              </div>
            </SwiperSlide>
          ))}
          <div className="swiper-pagination absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full px-3 py-1 text-sm z-10"></div>
        </Swiper>
      </div>
      
      {/* Product info overlay at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black to-transparent text-white">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-lg">
              {formatPrice(
                priceRange.minVariantPrice.amount,
                priceRange.minVariantPrice.currencyCode
              )}
            </p>
          </div>
          <a
            href={onlineStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium"
          >
            商品詳細を見る
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductSlide;
