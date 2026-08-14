"use client";

import { useState } from "react";

type PropertyPhoto = {
  id: number;
  property_id: number;
  photo_url: string;
  sort_order: number;
};

type PhotoGalleryProps = {
  photos: PropertyPhoto[];
  title: string;
};

export default function PhotoGallery({
  photos,
  title,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function previousPhoto() {
    setSelectedIndex((current) => {
      if (current === null) return null;
      return current === 0 ? photos.length - 1 : current - 1;
    });
  }

  function nextPhoto() {
    setSelectedIndex((current) => {
      if (current === null) return null;
      return current === photos.length - 1 ? 0 : current + 1;
    });
  }

  return (
    <>
      <div className="bg-white px-4 py-4 border-b">
        <div className="grid grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="block text-left"
              aria-label={`Open ${title} photo ${index + 1}`}
            >
              <div className="h-20 rounded-lg overflow-hidden bg-gray-200 relative">
                <img
                  src={photo.photo_url}
                  alt={`${title} photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {index === 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                    Main
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedIndex !== null && (
        <PhotoViewer
          photos={photos}
          title={title}
          selectedIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onPrevious={previousPhoto}
          onNext={nextPhoto}
          onSelect={setSelectedIndex}
        />
      )}
    </>
  );
}

function PhotoViewer({
  photos,
  title,
  selectedIndex,
  onClose,
  onPrevious,
  onNext,
  onSelect,
}: {
  photos: PropertyPhoto[];
  title: string;
  selectedIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  function handleTouchStart(event: React.TouchEvent) {
    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches[0].clientX;
    const difference = touchStartX - touchEndX;

    if (Math.abs(difference) > 50) {
      if (difference > 0) {
        onNext();
      } else {
        onPrevious();
      }
    }

    setTouchStartX(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo viewer`}
    >
      <div className="flex items-center justify-between px-4 py-4 text-white">
        <p className="text-sm font-medium">
          {selectedIndex + 1} / {photos.length}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="text-white text-3xl leading-none px-3 py-1"
          aria-label="Close photo viewer"
        >
          ×
        </button>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={photos[selectedIndex].photo_url}
          alt={`${title} photo ${selectedIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={onPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-11 h-11 rounded-full text-2xl"
              aria-label="Previous photo"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white w-11 h-11 rounded-full text-2xl"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="px-3 py-3 overflow-x-auto">
          <div className="flex gap-2 justify-center min-w-max">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onSelect(index)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${
                  index === selectedIndex
                    ? "border-white"
                    : "border-transparent"
                }`}
                aria-label={`View photo ${index + 1}`}
              >
                <img
                  src={photo.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
