import React from 'react';
import { Timer, Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ModulePlaceholder = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      padding: '40px',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#EFF6FF',
        color: '#2563EB',
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.1)'
      }}>
        <Construction size={40} />
      </div>
      
      <h2 style={{ 
        fontSize: '32px', 
        fontWeight: '800', 
        color: '#0F172A', 
        margin: '0 0 12px 0',
        letterSpacing: '-0.02em'
      }}>{title} Module</h2>
      
      <p style={{ 
        fontSize: '16px', 
        color: '#64748B', 
        maxWidth: '400px', 
        lineHeight: '1.6',
        margin: '0 0 32px 0'
      }}>
        We're working hard to bring you the best experience. This module is currently under active development and will be available soon.
      </p>

      <div style={{
        display: 'flex',
        gap: '16px'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            color: '#0F172A',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: '#0F172A',
          borderRadius: '12px',
          color: 'white',
          fontWeight: '600'
        }}>
          <Timer size={18} />
          Coming Soon
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
