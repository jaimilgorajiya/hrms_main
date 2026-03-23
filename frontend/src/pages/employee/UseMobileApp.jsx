import React from 'react';
import { Smartphone, Download, ExternalLink } from 'lucide-react';
import '../../styles/EmployeePanel.css';

const UseMobileApp = () => {
  return (
    <div className="use-app-container">
      <div className="use-app-card">
        <div className="use-app-icon">
          <Smartphone size={64} color="#2563EB" />
        </div>
        <h1>Move to Mobile</h1>
        <p>The Employee Panel has moved to our mobile application for a better experience.</p>
        
        <div className="use-app-features">
          <div className="app-feature">
             <div className="feature-dot"></div>
             <span>Punch In/Out from anywhere</span>
          </div>
          <div className="app-feature">
             <div className="feature-dot"></div>
             <span>Real-time notifications</span>
          </div>
          <div className="app-feature">
             <div className="feature-dot"></div>
             <span>Easy Leave & Shift management</span>
          </div>
        </div>

        <div className="use-app-actions">
           <button className="download-app-btn">
             <Download size={18} />
             Download Android App
           </button>
           <button className="download-app-btn outline">
             <Smartphone size={18} />
             Open on iOS
           </button>
        </div>

        <div className="use-app-footer">
          <p>Contact HR if you need help setting up the app.</p>
        </div>
      </div>
    </div>
  );
};

export default UseMobileApp;
