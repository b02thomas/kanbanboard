
import React from 'react';

const SMBAILogo = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className="smb-ai-logo"
  >
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: 'rgb(0,123,255)', stopOpacity: 1}} />
            <stop offset="100%" style={{stopColor: 'rgb(0,255,123)', stopOpacity: 1}} />
        </linearGradient>
    </defs>
    <rect width="100" height="100" rx="15" fill="url(#grad1)"/>
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="40" fill="white" fontFamily="Arial, sans-serif">SMB</text>
  </svg>
);

export default SMBAILogo;

