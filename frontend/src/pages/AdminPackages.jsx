import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Search, Package, Users, Shield, Lock, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

const AdminPackages = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMaster, setIsMaster] = useState(null);
    const [activeTab, setActiveTab] = useState('subscription');

    const [formData, setFormData] = useState({
        name: '', description: '', price: '',
        durationValue: '', durationUnit: 'month',
        maxEmployees: '', packageType: 'subscription',
        addonEmployees: '', services: '', isActive: true
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/packages/check-master`, { 
                  headers: { 'Authorization': `Bearer ${token}` } 
                });
                const data = await res.json();
                setIsMaster(data.isMasterAdmin === true);
            } catch { setIsMaster(false); }
        })();
        fetchPackages();
    }, [token]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/packages`);
            const data = await res.json();
            if (data.success) setPackages(data.packages);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOpenModal = (pkg = null) => {
        if (pkg) {
            setIsEditing(true);
            setCurrentId(pkg._id);
            setFormData({
                name: pkg.name, description: pkg.description, price: pkg.price,
                durationValue: pkg.duration.value, durationUnit: pkg.duration.unit,
                maxEmployees: pkg.maxEmployees || '', packageType: pkg.packageType || 'subscription',
                addonEmployees: pkg.addonEmployees || '', services: pkg.services.join(', '), isActive: pkg.isActive
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({ 
              name: '', description: '', price: '', durationValue: '', 
              durationUnit: 'month', maxEmployees: '', 
              packageType: activeTab === 'addon' ? 'employee_addon' : 'subscription', 
              addonEmployees: '', services: '', isActive: true 
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEditing ? `${API_URL}/api/packages/${currentId}` : `${API_URL}/api/packages`;
            const method = isEditing ? 'PUT' : 'POST';
            const payload = {
                name: formData.name, description: formData.description, price: Number(formData.price),
                duration: { value: Number(formData.durationValue) || 0, unit: formData.durationUnit },
                maxEmployees: Number(formData.maxEmployees) || 10, packageType: formData.packageType,
                addonEmployees: formData.packageType === 'employee_addon' ? Number(formData.addonEmployees) || 0 : 0,
                services: formData.services.split(',').map(s => s.trim()).filter(Boolean), isActive: formData.isActive
            };
            const res = await authenticatedFetch(url, { 
              method, 
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
              body: JSON.stringify(payload) 
            });
            const data = await res.json();
            if (res.ok) {
                Swal.fire({ 
                  title: 'Success!', 
                  text: isEditing ? 'Package updated successfully.' : 'Package created successfully.', 
                  icon: 'success', 
                  timer: 1500, 
                  showConfirmButton: false 
                });
                setIsModalOpen(false);
                fetchPackages();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (e) { Swal.fire('Error', 'Failed to save package', 'error'); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Package?', 
            text: 'This will permanently remove the package. This action cannot be undone.',
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#94A3B8', 
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/packages/${id}`, { 
                  method: 'DELETE', 
                  headers: { 'Authorization': `Bearer ${token}` } 
                });
                if (res.ok) { 
                  Swal.fire('Deleted!', 'Package has been removed.', 'success'); 
                  fetchPackages(); 
                }
            } catch (e) { Swal.fire('Error', 'Failed to delete package', 'error'); }
        }
    };

    if (isMaster === null) return (
      <div className="profile-container-premium flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

    if (!isMaster) return (
        <div className="profile-container-premium flex items-center justify-center min-h-screen">
            <div className="glass-card-premium text-center p-12 max-w-md">
                <div className="card-icon-box mx-auto mb-6 bg-red-50 text-red-500">
                    <Lock size={32} />
                </div>
                <h2 className="profile-title-premium text-2xl mb-2">Access Denied</h2>
                <p className="profile-subtitle-premium mb-8">Only the super admin can manage the executive subscription architecture.</p>
                <button onClick={() => navigate('/admin')} className="btn-update-premium mx-auto">
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    const subs = packages.filter(p => p.packageType !== 'employee_addon');
    const addons = packages.filter(p => p.packageType === 'employee_addon');
    const displayList = activeTab === 'subscription' ? subs : addons;
    const filtered = displayList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="profile-container-premium">
            <div className="profile-header-section flex-between-start">
                <div>
                    <h1 className="profile-title-premium">Package Management</h1>
                    <p className="profile-subtitle-premium">
                        <Shield size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> 
                        Super Admin Command — Configure core subscription tiers and utility add-ons.
                    </p>
                </div>
                <button className="btn-update-premium" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Add New Package
                </button>
            </div>

            <div className="glass-card-premium mb-8">
                <div className="flex-between-center" style={{ marginBottom: '32px' }}>
                    <div className="premium-tabs-wrapper">
                        <button 
                            onClick={() => setActiveTab('subscription')}
                            className={`premium-tab-btn subscription ${activeTab === 'subscription' ? 'active' : ''}`}
                        >
                            <Package size={16} />
                            Subscription Plans
                            <span className="premium-tab-badge">{subs.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('addon')}
                            className={`premium-tab-btn addon ${activeTab === 'addon' ? 'active' : ''}`}
                        >
                            <Users size={16} />
                            Employee Add-ons
                            <span className="premium-tab-badge">{addons.length}</span>
                        </button>
                    </div>

                    <div className="search-wrapper-premium">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            className="input-premium" 
                            placeholder="Search by package name..."
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="payment-table-premium">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sr.</th>
                                <th>Package Identity</th>
                                <th>{activeTab === 'subscription' ? 'Unit Price' : 'Price / Employee'}</th>
                                {activeTab === 'subscription' ? (
                                    <>
                                        <th>Term</th>
                                        <th>Capacity</th>
                                        <th>Modules</th>
                                    </>
                                ) : (
                                    <th>Pricing Model</th>
                                )}
                                <th>Lifecycle</th>
                                <th style={{ textAlign: 'center' }}>Controls</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                  <td colSpan={10} style={{ textAlign: 'center', padding: '80px' }}>
                                    <div className="animate-pulse">
                                      <p className="text-slate-400 font-medium">Syncing package data...</p>
                                    </div>
                                  </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                  <td colSpan={10} style={{ textAlign: 'center', padding: '80px' }}>
                                    <div>
                                      <p style={{ color: '#64748B', fontWeight: 700, marginBottom: '8px' }}>No Packages Found</p>
                                      <p style={{ color: '#94A3B8', fontSize: '13px' }}>
                                        {searchTerm ? 'Try adjusting your search filters.' : `Initialize your first ${activeTab === 'subscription' ? 'subscription plan' : 'add-on pack'} to get started.`}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                            ) : filtered.map((pkg, i) => (
                                <tr key={pkg._id}>
                                    <td style={{ fontWeight: 700, color: '#94A3B8' }}>#{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{pkg.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{pkg.description}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>₹{pkg.price.toLocaleString()}</span>
                                        {activeTab === 'addon' && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>per employee</div>}
                                    </td>
                                    {activeTab === 'subscription' ? (
                                        <>
                                            <td>
                                                <span className="pill-box-blue" style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
                                                    <Clock size={12} /> {pkg.duration.value} {pkg.duration.unit}(s)
                                                </span>
                                            </td>
                                            <td>
                                                <span className="pill-box-blue">
                                                    <Users size={12} /> {pkg.maxEmployees || 10}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {(pkg.services || []).slice(0, 3).map((s, j) => (
                                                        <span key={j} style={{ padding: '2px 8px', background: '#F1F5F9', color: '#64748B', borderRadius: '6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{s}</span>
                                                    ))}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <td>
                                            <span className="pill-box-emerald">
                                                <TrendingUp size={12} /> Dynamic (Client chooses qty)
                                            </span>
                                        </td>
                                    )}
                                    <td>
                                        <span className={`status-pill-premium ${pkg.isActive ? 'completed' : 'failed'}`}>
                                            {pkg.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button className="btn-table-icon" onClick={() => handleOpenModal(pkg)} title="Edit Configuration">
                                              <Edit2 size={15} />
                                            </button>
                                            <button 
                                              className="btn-table-icon" 
                                              style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }} 
                                              onClick={() => handleDelete(pkg._id)} 
                                              title="Deactivate"
                                            >
                                              <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay-premium">
                  <div className="modal-content-premium">
                    <div className="modal-header-premium">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="card-icon-box">
                          <Package size={22} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                            {isEditing ? 'Update Package Architecture' : 'Initialize New Package'}
                          </h3>
                        </div>
                      </div>
                      <button 
                        className="btn-table-icon"
                        onClick={() => setIsModalOpen(false)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="modal-body-premium">
                        <div className="premium-tabs-wrapper" style={{ width: '100%', marginBottom: '24px' }}>
                          <button 
                            type="button" 
                            onClick={() => setFormData({ ...formData, packageType: 'subscription' })}
                            style={{ flex: 1 }}
                            className={`premium-tab-btn subscription ${formData.packageType === 'subscription' ? 'active' : ''}`}
                          >
                            <Package size={16} /> Subscription
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setFormData({ ...formData, packageType: 'employee_addon' })}
                            style={{ flex: 1 }}
                            className={`premium-tab-btn addon ${formData.packageType === 'employee_addon' ? 'active' : ''}`}
                          >
                            <Users size={16} /> Add-on Pack
                          </button>
                        </div>

                        <div className="form-grid-premium">
                          <div className="form-group-premium">
                            <label>Package Name</label>
                            <input 
                              type="text" 
                              className="input-premium" 
                              name="name" 
                              value={formData.name} 
                              onChange={handleInputChange} 
                              placeholder="e.g. Enterprise Elite" 
                              required 
                            />
                          </div>
                          <div className="form-group-premium">
                            <label>{formData.packageType === 'employee_addon' ? 'Price Per Employee (₹)' : 'Unit Price (₹)'}</label>
                            <input 
                              type="number" 
                              className="input-premium" 
                              name="price" 
                              value={formData.price} 
                              onChange={handleInputChange} 
                              placeholder={formData.packageType === 'employee_addon' ? 'e.g. 99' : '0'} 
                              required 
                            />
                          </div>

                          <div className="col-span-full form-group-premium">
                            <label>Global Description</label>
                            <textarea 
                              className="input-premium" 
                              style={{ minHeight: '100px', padding: '16px' }}
                              name="description" 
                              value={formData.description} 
                              onChange={handleInputChange} 
                              placeholder="Define the scope of this tier..." 
                              required 
                            />
                          </div>

                          {formData.packageType === 'subscription' && (
                            <>
                              <div className="form-group-premium">
                                <label>Term Duration</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <input 
                                    type="number" 
                                    className="input-premium" 
                                    style={{ width: '60%' }}
                                    name="durationValue" 
                                    value={formData.durationValue} 
                                    onChange={handleInputChange} 
                                    placeholder="Qty" 
                                    required 
                                  />
                                  <select 
                                    className="input-premium" 
                                    style={{ width: '40%' }}
                                    name="durationUnit" 
                                    value={formData.durationUnit} 
                                    onChange={handleInputChange}
                                  >
                                    <option value="day">Days</option>
                                    <option value="month">Months</option>
                                    <option value="year">Years</option>
                                  </select>
                                </div>
                              </div>
                              <div className="form-group-premium">
                                <label>Employee Capacity</label>
                                <input 
                                  type="number" 
                                  className="input-premium" 
                                  name="maxEmployees" 
                                  value={formData.maxEmployees} 
                                  onChange={handleInputChange} 
                                  placeholder="e.g. 50" 
                                  required 
                                />
                              </div>
                              <div className="col-span-full form-group-premium">
                                <label>Enabled Modules (comma separated)</label>
                                <input 
                                  type="text" 
                                  className="input-premium" 
                                  name="services" 
                                  value={formData.services} 
                                  onChange={handleInputChange} 
                                  placeholder="HRMS, Payroll, Attendance..." 
                                />
                              </div>
                            </>
                          )}

                          {formData.packageType === 'employee_addon' && (
                            <div className="col-span-full" style={{ padding: '16px', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #D1FAE5' }}>
                              <p style={{ fontSize: '13px', color: '#065F46', fontWeight: 600, margin: 0 }}>
                                Clients will enter how many employees they need. The total amount will be calculated as: Quantity x ₹{formData.price || '0'} per employee.
                              </p>
                            </div>
                          )}

                          <div className="col-span-full" style={{ marginTop: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
                              <input 
                                type="checkbox" 
                                checked={formData.isActive} 
                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                                style={{ width: '18px', height: '18px' }}
                              />
                              Deploy as Active Product
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="modal-footer-premium">
                        <button 
                          type="button" 
                          style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#64748B', cursor: 'pointer' }}
                          onClick={() => setIsModalOpen(false)}
                        >
                          Discard
                        </button>
                        <button type="submit" className="btn-update-premium">
                          <CheckCircle2 size={18} />
                          {isEditing ? 'Commit Update' : 'Initialize Package'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
            )}
        </div>
    );
};

export default AdminPackages;
