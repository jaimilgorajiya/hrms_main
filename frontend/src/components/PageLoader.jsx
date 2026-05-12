import React from 'react';
import './PageLoader.css';

const PageLoader = ({ message = "Synchronizing Management Intelligence" }) => {
  return (
    <div className="premium-loader-overlay">
      <div className="executive-loader-core">
        <div className="orbital-system">
          <div className="orbital-ring ring-1"></div>
          <div className="orbital-ring ring-2"></div>
          <div className="orbital-ring ring-3"></div>
          <div className="core-glow"></div>
        </div>
        
        <div className="loader-intelligence-text">
          <span className="text-line">{message}</span>
          <div className="scanning-trace"></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
