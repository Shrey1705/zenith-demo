import React from 'react';
import { useTour, useTourTracking } from '../lib/tour';

const PAD = 8;

export default function TourOverlay() {
  const tour = useTour();
  const rect = useTourTracking();
  if (!tour?.active || !tour.currentStep) return null;
  const { title, body, info } = tour.currentStep;

  return (
    <>
      {rect && !info && (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2
          }}
        />
      )}
      <div className={'tour-caption ' + (info ? 'center' : '')}>
        <div className="tour-caption-body">
          <b>{title}</b>
          <p>{body}</p>
        </div>
        {info
          ? <button className="btn gold" onClick={tour.stop}>Got it</button>
          : <button className="linkbtn tour-exit" onClick={tour.stop}>Exit tour ✕</button>}
      </div>
    </>
  );
}
