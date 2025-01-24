'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ImageUploader = dynamic(
  () => import('./components/ImageUploader').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Image Upscaler
          </h1>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Image Upscaler
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Upscale your images to meet Booking.com photo requirements
        </p>
        <ImageUploader />
      </div>
    </main>
  );
}
