
import React from 'react';
import SMBAILogo from './SMBAILogo';

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <SMBAILogo size={64} />
    <p>Loading...</p>
  </div>
);

export default LoadingSpinner;
