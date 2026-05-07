import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, Shield, CheckCircle2, ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import { menuItems, flattenToPermissionRows } from '../config/menuItems';

const ManageRoles = () => {
    const navigate = useNavigate();

    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null); // null = Create New

    const [roleName, setRoleName] = useState('Admin Sidebar Configuration');
    const [description, setDescription] = useState('Preferences for the admin sidebar modules');
    const [permissions, setPermissions] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [expandedModules, setExpandedModules] = useState({});

    const moduleStructure = menuItems.map((m) => ({
        title: m.title,
        subModules: m.subItems
            ? m.subItems.map((s) => ({
                  title: s.title,
                  children: s.children ? s.children.map((c) => c.title) : undefined,
              }))
            : undefined,
    }));

    useEffect(() => {
        fetchRoles();
        // Initialize with all checked for a new role
        setPermissions(flattenToPermissionRows());
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/roles`);
            const data = await response.json();
            if (data.success && data.roles.length > 0) {
                // For admin setup, just use the first role they have
                const role = data.roles[0];
                setSelectedRole(role);
                setRoleName(role.roleName || 'Admin Sidebar Configuration');
                setDescription(role.description || '');
                const fetchedPerms = role.permissions || [];
                if (!fetchedPerms.find(p => p.childModule === 'Sidebar Setup')) {
                    fetchedPerms.push({ module: 'Core HRMS', subModule: 'Employee & Management', childModule: 'Sidebar Setup', access: true });
                }
                setPermissions(fetchedPerms);
            } else {
                setPermissions(flattenToPermissionRows());
            }
        } catch (error) {
            console.error("Error fetching roles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRole = (role) => {
        // Unused as we just use the single role
    };

    const togglePermission = (module, subModule = null, childModule = null) => {
        setPermissions(prev => {
            const exists = prev.find(p => 
                p.module === module && 
                p.subModule === subModule && 
                p.childModule === childModule
            );

            if (exists) {
                if (childModule === 'Sidebar Setup') return prev; // Lock this permission
                return prev.filter(p => !(
                    p.module === module && 
                    p.subModule === subModule && 
                    p.childModule === childModule
                ));
            } else {
                return [...prev, { module, subModule, childModule, access: true }];
            }
        });
    };

    const setMany = (rows, shouldSelect) => {
        setPermissions(prev => {
            const key = (p) => `${p.module}__${p.subModule ?? '∅'}__${p.childModule ?? '∅'}`;
            const map = new Map(prev.map(p => [key(p), p]));
            for (const r of rows) {
                if (!shouldSelect && r.childModule === 'Sidebar Setup') continue; // Lock this permission
                const k = key(r);
                if (shouldSelect) map.set(k, { ...r, access: true });
                else map.delete(k);
            }
            return Array.from(map.values());
        });
    };

    const toggleModuleAll = (moduleObj) => {
        const module = moduleObj.title;
        const allPermissionsInModule = [];
        
        if (!moduleObj.subModules) {
            allPermissionsInModule.push({ module, subModule: null, childModule: null });
        } else {
            moduleObj.subModules.forEach(sub => {
                if (!sub.children) {
                    allPermissionsInModule.push({ module, subModule: sub.title, childModule: null });
                } else {
                    sub.children.forEach(child => {
                        allPermissionsInModule.push({ module, subModule: sub.title, childModule: child });
                    });
                }
            });
        }

        const isFullySelected = allPermissionsInModule.every(p => 
            permissions.find(existing => 
                existing.module === p.module && 
                existing.subModule === p.subModule && 
                existing.childModule === p.childModule
            )
        );

        setMany(allPermissionsInModule, !isFullySelected);
    };

    const toggleSubModuleAll = (moduleObj, subObj) => {
        const module = moduleObj.title;
        const subModule = subObj.title;
        const rows = [];
        if (!subObj.children) rows.push({ module, subModule, childModule: null });
        else subObj.children.forEach(child => rows.push({ module, subModule, childModule: child }));

        const isFullySelected = rows.every(r => isPermissionactive(r.module, r.subModule, r.childModule));
        setMany(rows, !isFullySelected);
    };

    const isPermissionactive = (module, subModule = null, childModule = null) => {
        return !!permissions.find(p => 
            p.module === module && 
            p.subModule === subModule && 
            p.childModule === childModule
        );
    };

    const getSubSelectionState = (moduleObj, subObj) => {
        const module = moduleObj.title;
        const subModule = subObj.title;
        if (!subObj.children) {
            return isPermissionactive(module, subModule, null) ? "full" : "none";
        }
        const total = subObj.children.length;
        const selected = subObj.children.filter(child => isPermissionactive(module, subModule, child)).length;
        if (selected === 0) return "none";
        if (selected === total) return "full";
        return "partial";
    };

    const isModulePartiallySelected = (moduleObj) => {
        if (!moduleObj.subModules) return false;
        
        let hasSelected = false;
        let hasUnselected = false;
        
        moduleObj.subModules.forEach(sub => {
            const state = getSubSelectionState(moduleObj, sub);
            if (state === 'full') hasSelected = true;
            else if (state === 'none') hasUnselected = true;
            else if (state === 'partial') {
                hasSelected = true;
                hasUnselected = true;
            }
        });
        
        return hasSelected && hasUnselected;
    };

    const isModuleFullySelected = (moduleObj) => {
        if (!moduleObj.subModules) {
            return isPermissionactive(moduleObj.title, null, null);
        }
        return moduleObj.subModules.every(sub => getSubSelectionState(moduleObj, sub) === 'full');
    };

    const handleSave = async () => {
        if (!roleName.trim()) {
            Swal.fire('Required', 'Please enter a role name', 'warning');
            return;
        }

        try {
            setLoading(true);
            const isEdit = !!selectedRole;
            const url = isEdit ? `${API_URL}/api/roles/${selectedRole._id}` : `${API_URL}/api/roles/create`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await authenticatedFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleName, description, permissions, autoAssignToAdmin: true })
            });

            const data = await response.json();
            if (data.success) {
                await Swal.fire({
                    title: 'Success!',
                    text: 'Sidebar settings updated successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                // Reload the page to reflect sidebar changes immediately
                window.location.reload();
            } else {
                Swal.fire('Error', data.message || 'Failed to save role', 'error');
            }
        } catch (error) {
            console.error("Error saving role:", error);
            Swal.fire('Error', 'Failed to save role', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRole) return;

        const result = await Swal.fire({
            title: 'Delete Role?',
            text: `Are you sure you want to delete ${selectedRole.roleName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#3B648B',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                setLoading(true);
                const response = await authenticatedFetch(`${API_URL}/api/roles/${selectedRole._id}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Role has been deleted.', 'success');
                    await fetchRoles();
                    handleSelectRole(null); // Reset form
                }
            } catch (error) {
                console.error("Error deleting role:", error);
                Swal.fire('Error!', 'Failed to delete role.', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleExpand = (title) => {
        setExpandedModules(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">
                        Sidebar Setup
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px' }}>
                        Configure the modules that appear in your sidebar
                    </p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="btn-hrm btn-hrm-primary" 
                        style={{ height: '48px', padding: '0 30px', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'SAVING...' : <><Save size={18} /> SAVE SETTINGS</>}
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Card Header */}
                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Sidebar Setup</span>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Configure feature-level access for your admin sidebar</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                onClick={() => setPermissions(flattenToPermissionRows())}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                                CHECK ALL
                            </button>
                            <button
                                onClick={() => setPermissions([{ module: 'Core HRMS', subModule: 'Employee & Management', childModule: 'Sidebar Setup', access: true }])}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                                CLEAR ALL
                            </button>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--bg-elevated)', padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)' }}>{permissions.length}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Module List */}
                    <div style={{ padding: '16px' }}>
                        {moduleStructure.map((moduleObj, mIdx) => {
                            const isFullySelected = isModuleFullySelected(moduleObj);
                            const isPartiallySelected = isModulePartiallySelected(moduleObj);
                            const isExpanded = expandedModules[moduleObj.title];

                            return (
                                <div key={mIdx} style={{ marginBottom: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                    {/* Parent Module Row */}
                                    <div
                                        style={{
                                            padding: '14px 18px',
                                            background: isExpanded ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                                            display: 'flex', alignItems: 'center',
                                            cursor: 'pointer', transition: 'background 0.2s'
                                        }}
                                        onClick={() => toggleExpand(moduleObj.title)}
                                    >
                                        <div
                                            onClick={(e) => { e.stopPropagation(); toggleModuleAll(moduleObj); }}
                                            style={{ marginRight: '14px', color: isFullySelected || isPartiallySelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                        >
                                            {isFullySelected
                                                ? <CheckSquare size={20} />
                                                : isPartiallySelected
                                                    ? <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-primary)', borderRadius: '4px' }}>
                                                        <div style={{ width: 10, height: 2, background: 'var(--accent-primary)' }} />
                                                      </div>
                                                    : <Square size={20} />
                                            }
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>{moduleObj.title}</span>
                                        {moduleObj.subModules && (
                                            <div style={{ color: 'var(--text-muted)' }}>
                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submodules */}
                                    {isExpanded && moduleObj.subModules && (
                                        <div style={{ background: 'var(--bg-base)', padding: '10px 18px 18px 52px', borderTop: '1px solid var(--border)' }}>
                                            {moduleObj.subModules.map((sub, sIdx) => (
                                                <div key={sIdx} style={{ marginTop: '14px' }}>
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: sub.children ? '10px' : '0' }}
                                                        onClick={(e) => { e.stopPropagation(); toggleSubModuleAll(moduleObj, sub); }}
                                                    >
                                                        <div style={{ color: getSubSelectionState(moduleObj, sub) !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                                            {getSubSelectionState(moduleObj, sub) === 'full'
                                                                ? <CheckSquare size={17} />
                                                                : getSubSelectionState(moduleObj, sub) === 'partial'
                                                                    ? <div style={{ width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-primary)', borderRadius: '3px' }}>
                                                                        <div style={{ width: 8, height: 2, background: 'var(--accent-primary)' }} />
                                                                      </div>
                                                                    : <Square size={17} />
                                                            }
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{sub.title}</span>
                                                    </div>

                                                    {sub.children && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginLeft: '28px' }}>
                                                            {sub.children.map((child, cIdx) => {
                                                                const isActive = isPermissionactive(moduleObj.title, sub.title, child);
                                                                const isLocked = child === 'Sidebar Setup';
                                                                return (
                                                                    <div
                                                                        key={cIdx}
                                                                        onClick={() => !isLocked && togglePermission(moduleObj.title, sub.title, child)}
                                                                        style={{
                                                                            display: 'flex', alignItems: 'center', gap: '9px',
                                                                            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                                                            border: `1px solid ${isLocked ? 'var(--border)' : isActive ? 'rgba(108,99,255,0.3)' : 'var(--border-subtle)'}`,
                                                                            background: isLocked ? 'var(--bg-elevated)' : isActive ? 'var(--accent-primary-glow)' : 'var(--bg-surface)',
                                                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                                                            transition: 'all 0.15s',
                                                                            opacity: isLocked ? 0.7 : 1
                                                                        }}
                                                                    >
                                                                        <div style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                                                                            {isActive ? <CheckSquare size={15} /> : <Square size={15} />}
                                                                        </div>
                                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                                                            {child}
                                                                            {isLocked && <span style={{ marginLeft: '6px', fontSize: '9px', background: 'var(--bg-elevated)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, border: '1px solid var(--border)' }}>LOCKED</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageRoles;
