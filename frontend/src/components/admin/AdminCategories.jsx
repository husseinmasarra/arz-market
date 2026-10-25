import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Trash2, Edit3, Image, GripVertical, Save, ChevronRight, ChevronDown, 
  FolderOpen, Folder, Shield, Lock, Plus, CornerDownLeft, Search, Layers,
  ListTree, Maximize2, Minimize2, Check, AlertCircle, Tag
} from 'lucide-react';
import { buildCategoryTree, getCategoryDescendantIds, getCategoryAncestors } from '../../utils/categoryTree';

const LEVEL_COLORS = {
  1: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)', labelAr: 'مستوى 1 رئيسي', labelEn: 'Level 1 (Main)' },
  2: { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb', border: 'rgba(37, 99, 235, 0.3)', labelAr: 'مستوى 2 فرعي', labelEn: 'Level 2 (Sub)' },
  3: { bg: 'rgba(147, 51, 234, 0.12)', text: '#7c3aed', border: 'rgba(147, 51, 234, 0.3)', labelAr: 'مستوى 3 فرعي', labelEn: 'Level 3 (Sub-Sub)' },
  4: { bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706', border: 'rgba(217, 119, 6, 0.3)', labelAr: 'مستوى 4 فرعي', labelEn: 'Level 4' },
  5: { bg: 'rgba(225, 29, 72, 0.12)', text: '#e11d48', border: 'rgba(225, 29, 72, 0.3)', labelAr: 'مستوى 5 فرعي', labelEn: 'Level 5 (Leaf)' }
};

export default function AdminCategories() {
  const { lang, apiBase, apiHost, getImageUrl, handleImageError } = useApp();
  const { token } = useAuth();

  const [categories, setCategories] = useState([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag state
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Expanded parents in tree view (expanded by default for level 1 and 2)
  const [expandedNodes, setExpandedNodes] = useState({});

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // ESC closes form
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isEditing) resetForm(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isEditing]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBase}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        setOrderChanged(false);
        // Expand level 1 by default
        const initialExpanded = {};
        data.forEach(c => {
          if (!c.parent_id) initialExpanded[c.id] = true;
        });
        setExpandedNodes(prev => ({ ...initialExpanded, ...prev }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Build complete 5-level tree
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories, 5);
  }, [categories]);

  // Expand / Collapse all
  const handleExpandAll = () => {
    const allExpanded = {};
    categories.forEach(c => { allExpanded[c.id] = true; });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const toggleExpanded = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Get descendant IDs for the editing category to prevent circular selection
  const editingDescendantIds = useMemo(() => {
    if (!editingId) return new Set();
    return new Set(getCategoryDescendantIds(editingId, categories));
  }, [editingId, categories]);

  // Flattened tree list for parent select dropdown
  const parentSelectOptions = useMemo(() => {
    const options = [];
    function traverse(nodes) {
      if (!Array.isArray(nodes)) return;
      nodes.forEach(node => {
        options.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    }
    traverse(categoryTree);
    return options;
  }, [categoryTree]);

  // Calculate projected level and path for the form
  const projectedInfo = useMemo(() => {
    if (!parentId) {
      return { level: 1, pathAr: nameAr || 'تصنيف رئيسي جديد', pathEn: nameEn || 'New Main Category' };
    }
    const parentNode = categories.find(c => String(c.id) === String(parentId));
    if (!parentNode) return { level: 1, pathAr: nameAr, pathEn: nameEn };

    const ancestors = getCategoryAncestors(parentId, categories);
    const namesAr = [...ancestors.map(a => a?.name_ar || ''), nameAr || '...'];
    const namesEn = [...ancestors.map(a => a?.name_en || ''), nameEn || '...'];
    const level = Math.min(ancestors.length + 1, 5);

    return {
      level,
      pathAr: namesAr.join(' > '),
      pathEn: namesEn.join(' > ')
    };
  }, [parentId, categories, nameAr, nameEn]);

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
    e.preventDefault();
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    const topLevel = categories.filter(c => !c.parent_id);
    const newOrder = [...topLevel];
    const dragged = newOrder.splice(dragItem.current, 1)[0];
    newOrder.splice(dragOverItem.current, 0, dragged);
    const children = categories.filter(c => c.parent_id);
    setCategories([...newOrder, ...children]);
    setOrderChanged(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const order = categories.map((c, idx) => ({ id: c.id, sort_order: idx }));
      const res = await fetch(`${apiBase}/categories-reorder`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      if (res.ok) { 
        setOrderChanged(false); 
        await fetchCategories();
        setStatusMessage(lang === 'ar' ? 'تم حفظ الترتيب بنجاح!' : 'Order saved successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleFileChange = (e) => { setSelectedFile(e.target.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameAr || !nameEn) return;
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('name_ar', nameAr.trim());
    formData.append('name_en', nameEn.trim());
    formData.append('parent_id', parentId || 'null');
    if (selectedFile) formData.append('category_image', selectedFile);

    const url = isEditing ? `${apiBase}/categories/${editingId}` : `${apiBase}/categories`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (res.ok) { 
        resetForm(); 
        await fetchCategories();
        setStatusMessage(lang === 'ar' ? 'تم حفظ بيانات التصنيف بنجاح!' : 'Category saved successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setErrorMessage(data.error_ar || data.error_en || (lang === 'ar' ? 'فشل حفظ التصنيف' : 'Failed to save category'));
      }
    } catch (err) { 
      console.error('Submit category error:', err);
      setErrorMessage(err.message || 'Error connecting to server');
    }
  };

  const handleEdit = (category) => {
    setIsEditing(true);
    setEditingId(category?.id);
    setNameAr(category?.name_ar || '');
    setNameEn(category?.name_en || '');
    setParentId(category?.parent_id ? String(category.parent_id) : '');
    setSelectedFile(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddChild = (parentCat) => {
    setIsEditing(false);
    setEditingId(null);
    setNameAr('');
    setNameEn('');
    setParentId(String(parentCat.id));
    setSelectedFile(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التصنيف؟ سيتم فك ارتباط الأقسام الفرعية التابعة له.' : 'Delete this category?')) return;
    try {
      const res = await fetch(`${apiBase}/categories/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        await fetchCategories();
        setStatusMessage(lang === 'ar' ? 'تم حذف التصنيف بنجاح!' : 'Category deleted successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setErrorMessage(data.error_ar || data.error_en || 'Error deleting category');
      }
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setIsEditing(false); 
    setEditingId(null);
    setNameAr(''); 
    setNameEn(''); 
    setParentId(''); 
    setSelectedFile(null);
    setErrorMessage(null);
  };

  // Recursive Table Row Renderer supporting up to 5 levels
  const renderTreeRow = (node, dragIndex = null) => {
    const imageUrl = getImageUrl(node.image_url, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=50&q=80');
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    const childCount = node.children ? node.children.length : 0;
    const depth = node.depth || 1;
    const levelStyle = LEVEL_COLORS[depth] || LEVEL_COLORS[1];
    const isRoot = depth === 1;
    const isStaging = node.code === 'ADMIN_STAGING_DRAFT' || node.id === 103 || (node.name_ar && node.name_ar.includes('مسودة الإضافة السريعة'));

    // Check search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSelf = (node?.name_ar || '').toLowerCase().includes(q) || (node?.name_en || '').toLowerCase().includes(q);
      const matchInPath = (node?.fullPathAr || '').toLowerCase().includes(q) || (node?.fullPathEn || '').toLowerCase().includes(q);
      if (!matchSelf && !matchInPath) {
        return null;
      }
    }

    // Indentation padding
    const indentPadding = (depth - 1) * 24;

    return (
      <React.Fragment key={node.id}>
        <tr
          draggable={isRoot}
          onDragStart={isRoot ? (e) => handleDragStart(e, dragIndex) : undefined}
          onDragEnter={isRoot ? (e) => handleDragEnter(e, dragIndex) : undefined}
          onDragOver={isRoot ? handleDragOver : undefined}
          onDrop={isRoot ? handleDrop : undefined}
          style={{
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.88rem',
            backgroundColor: !isRoot ? (depth % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.03)') : 'transparent',
            cursor: isRoot ? 'grab' : 'default',
            transition: 'background-color 0.15s ease'
          }}
        >
          {/* Drag Handle / Tree Branch Indicator */}
          <td style={{ padding: '8px', width: '36px', textAlign: 'center' }}>
            {isRoot ? (
              <GripVertical size={16} style={{ color: 'var(--text-light)', cursor: 'grab' }} />
            ) : (
              <span style={{ color: 'var(--text-light)', fontSize: '0.78rem', opacity: 0.7 }}>
                {'│ '.repeat(Math.max(0, depth - 2))}└─
              </span>
            )}
          </td>

          {/* Icon Thumbnail */}
          <td style={{ padding: '8px', width: '48px' }}>
            <img 
              src={imageUrl} 
              alt="" 
              onError={handleImageError} 
              style={{ 
                width: '32px', 
                height: '32px', 
                objectFit: 'contain', 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }} 
            />
          </td>

          {/* Category Name & Hierarchical Expansion */}
          <td style={{ padding: '8px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '8px',
              paddingInlineStart: `${indentPadding}px`
            }}>
              {hasChildren ? (
                <button 
                  onClick={() => toggleExpanded(node.id)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: 'var(--text-primary)', 
                    fontWeight: isRoot ? '800' : '700', 
                    padding: 0,
                    fontSize: isRoot ? '0.94rem' : '0.88rem'
                  }}
                >
                  {isExpanded ? <ChevronDown size={15} color="#2563eb" /> : <ChevronRight size={15} color="#6b7280" />}
                  {isExpanded ? <FolderOpen size={16} color="#2563eb" /> : <Folder size={16} color="#2563eb" />}
                  <span>{lang === 'ar' ? (node?.name_ar || node?.name_en) : (node?.name_en || node?.name_ar)}</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: '800', 
                    backgroundColor: 'rgba(37, 99, 235, 0.1)', 
                    color: 'var(--accent-blue)', 
                    padding: '1px 6px', 
                    borderRadius: '10px' 
                  }}>
                    {childCount} {lang === 'ar' ? 'فروع' : 'subs'}
                  </span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: isRoot ? '700' : '600' }}>
                  <span style={{ width: '15px' }} />
                  <Tag size={13} style={{ color: 'var(--text-light)', opacity: 0.8 }} />
                  <span>{lang === 'ar' ? (node?.name_ar || node?.name_en) : (node?.name_en || node?.name_ar)}</span>
                </div>
              )}

              {isStaging && (
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: '800', 
                  backgroundColor: '#fef3c7', 
                  color: '#92400e', 
                  border: '1px solid #fde68a', 
                  padding: '1px 6px', 
                  borderRadius: '4px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '3px' 
                }}>
                  <Lock size={10} />
                  <span>{lang === 'ar' ? 'مسودة خاصة بالإدارة' : 'Admin Draft'}</span>
                </span>
              )}
            </div>
          </td>

          {/* Level Badge (Up to Level 5) */}
          <td style={{ padding: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: '800',
              backgroundColor: levelStyle.bg,
              color: levelStyle.text,
              border: `1px solid ${levelStyle.border}`
            }}>
              <Layers size={11} />
              <span>{lang === 'ar' ? levelStyle.labelAr : levelStyle.labelEn}</span>
            </span>
          </td>

          {/* Sort Order */}
          <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.8rem', fontWeight: '700' }}>
            {node.sort_order ?? 0}
          </td>

          {/* Actions: Add Subcategory (+), Edit, Delete */}
          <td style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
              
              {/* Quick Add Subcategory (enabled for depth < 5) */}
              {depth < 5 && !isStaging && (
                <button
                  onClick={() => handleAddChild(node)}
                  title={lang === 'ar' ? `إضافة تصنيف فرعي داخل "${node?.name_ar || node?.name_en || ''}" (المستوى ${depth + 1})` : `Add subcategory under "${node?.name_en || node?.name_ar || ''}" (Level ${depth + 1})`}
                  style={{
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--accent-blue)',
                    cursor: 'pointer',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)'; }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>{lang === 'ar' ? 'فرع +' : '+ Sub'}</span>
                </button>
              )}

              {/* Edit */}
              <button 
                onClick={() => handleEdit(node)} 
                title={lang === 'ar' ? 'تعديل التصنيف' : 'Edit'} 
                style={{ 
                  border: 'none', 
                  backgroundColor: 'transparent', 
                  color: 'var(--accent-blue)', 
                  cursor: 'pointer', 
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <Edit3 size={15} />
              </button>

              {/* Delete */}
              {isStaging ? (
                <span title={lang === 'ar' ? 'تصنيف محمي لا يمكن حذفه' : 'Protected system category'} style={{ color: '#d97706', padding: '4px', display: 'inline-flex', alignItems: 'center' }}>
                  <Shield size={15} />
                </span>
              ) : (
                <button 
                  onClick={() => handleDelete(node.id)} 
                  title={lang === 'ar' ? 'حذف التصنيف' : 'Delete'} 
                  style={{ 
                    border: 'none', 
                    backgroundColor: 'transparent', 
                    color: '#ef4444', 
                    cursor: 'pointer', 
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Recursive rendering of nested children */}
        {hasChildren && isExpanded && node.children.map(child => renderTreeRow(child))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Form: Add / Edit Category */}
      <div className="dashboard-card" style={{ padding: '24px', border: isEditing ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListTree size={20} color="var(--accent-blue)" />
            <span>{isEditing ? (lang === 'ar' ? `تعديل التصنيف #${editingId}` : `Edit Category #${editingId}`) : (lang === 'ar' ? 'إضافة تصنيف جديد في شجرة التصنيفات' : 'Add New Category to Tree')}</span>
          </h4>

          {/* Projected Path & Level indicator badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '800',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: (LEVEL_COLORS[projectedInfo.level] || LEVEL_COLORS[1]).bg,
              color: (LEVEL_COLORS[projectedInfo.level] || LEVEL_COLORS[1]).text,
              border: `1px solid ${(LEVEL_COLORS[projectedInfo.level] || LEVEL_COLORS[1]).border}`
            }}>
              {lang === 'ar' ? `الموقع في الشجرة: ${(LEVEL_COLORS[projectedInfo.level] || LEVEL_COLORS[1]).labelAr}` : `Tree Level: ${(LEVEL_COLORS[projectedInfo.level] || LEVEL_COLORS[1]).labelEn}`}
            </span>
          </div>
        </div>

        {/* Dynamic Breadcrumbs Path Preview */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-light)'
        }}>
          <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>
            {lang === 'ar' ? 'المسار الهرمي المتوقع:' : 'Expected Hierarchy Path:'}
          </span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
            {lang === 'ar' ? projectedInfo.pathAr : projectedInfo.pathEn}
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '0.85rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {statusMessage && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#166534',
            fontSize: '0.85rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label className="input-label">الاسم (العربية) *</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={nameAr} 
              onChange={(e) => setNameAr(e.target.value)} 
              placeholder="مثال: بناطيل باراشوت" 
            />
          </div>
          <div>
            <label className="input-label">Name (English) *</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={nameEn} 
              onChange={(e) => setNameEn(e.target.value)} 
              placeholder="e.g. Parachute Pants" 
            />
          </div>

          {/* 5-Level Indented Parent Selector */}
          <div>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>التصنيف الأب (لغاية 5 مستويات تعشيش)</span>
              {parentId && (
                <button 
                  type="button" 
                  onClick={() => setParentId('')} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                >
                  {lang === 'ar' ? 'جعله رئيسي (مستوى 1)' : 'Make Main (Level 1)'}
                </button>
              )}
            </label>
            <select 
              className="input-field" 
              value={parentId} 
              onChange={(e) => setParentId(e.target.value)}
              style={{ fontWeight: '600' }}
            >
              <option value="">-- تصنيف رئيسي مستقل (المستوى 1) --</option>
              {parentSelectOptions.map(c => {
                const isSelf = editingId && c.id === editingId;
                const isDescendant = editingDescendantIds.has(c.id);
                const isAtMaxDepth = (c.depth || 1) >= 5; // Level 5 cannot have child if max is 5
                const isDisabled = isSelf || isDescendant || isAtMaxDepth;
                const indent = '　'.repeat(Math.max(0, (c.depth || 1) - 1));
                const prefix = c.depth === 1 ? '📁 ' : `${indent}└─ 📁 `;
                const lvlText = `(مستوى ${c.depth || 1})`;

                return (
                  <option 
                    key={c.id} 
                    value={c.id} 
                    disabled={isDisabled}
                  >
                    {prefix} {lang === 'ar' ? (c?.name_ar || c?.name_en || '') : (c?.name_en || c?.name_ar || '')} {lvlText} {isAtMaxDepth ? '(أقصى عمق)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={14} />
              <span>صورة أو أيقونة التصنيف</span>
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="input-field" style={{ padding: '6px' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
            <button 
              type="submit" 
              style={{ 
                padding: '10px 24px', 
                backgroundColor: 'var(--accent-blue)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '700', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
              }}
            >
              <Save size={16} />
              <span>{isEditing ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة التصنيف للشجرة' : 'Add Category')}</span>
            </button>
            {isEditing && (
              <button 
                type="button" 
                onClick={resetForm} 
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Order changed banner */}
      {orderChanged && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          backgroundColor: 'rgba(37,99,235,0.1)', 
          border: '1px solid rgba(37,99,235,0.3)', 
          borderRadius: '10px', 
          padding: '12px 20px', 
          flexWrap: 'wrap', 
          gap: '10px' 
        }}>
          <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '0.95rem' }}>
            {lang === 'ar' ? 'تم تغيير الترتيب — اضغط حفظ لتطبيقه' : 'Order changed — click Save to apply'}
          </span>
          <button 
            onClick={handleSaveOrder} 
            disabled={savingOrder} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 20px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: '700', 
              cursor: savingOrder ? 'not-allowed' : 'pointer' 
            }}
          >
            <Save size={16} />
            <span>{savingOrder ? '...' : (lang === 'ar' ? 'حفظ الترتيب' : 'Save Order')}</span>
          </button>
        </div>
      )}

      {/* Hierarchical Tree Table */}
      <div className="dashboard-card" style={{ overflowX: 'auto', padding: '20px' }}>
        
        {/* Table Controls Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>
              {lang === 'ar' ? `شجرة التصنيفات الهرمية (${categories.length} تصنيف)` : `Hierarchical Category Tree (${categories.length} total)`}
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
              {lang === 'ar' ? 'تدعم حتى 5 مستويات تعشيش — انقر فوق أي قسم لتوسيعه أو إضافة فروع بداخله' : 'Supports up to 5 nested levels'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: '10px', color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث في الأقسام...' : 'Search categories...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ padding: '6px 10px', paddingInlineStart: '30px', fontSize: '0.82rem' }}
              />
            </div>

            {/* Expand All / Collapse All buttons */}
            <button
              onClick={handleExpandAll}
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-tertiary)'
              }}
              title={lang === 'ar' ? 'توسيع كافة الفروع' : 'Expand All'}
            >
              <Maximize2 size={13} />
              <span>{lang === 'ar' ? 'توسيع الكل' : 'Expand All'}</span>
            </button>

            <button
              onClick={handleCollapseAll}
              className="input-field"
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-tertiary)'
              }}
              title={lang === 'ar' ? 'طي كافة الفروع' : 'Collapse All'}
            >
              <Minimize2 size={13} />
              <span>{lang === 'ar' ? 'طي الكل' : 'Collapse All'}</span>
            </button>
          </div>
        </div>

        {/* Tree Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)', fontSize: '0.82rem' }}>
              <th style={{ padding: '10px', width: '36px' }}></th>
              <th style={{ padding: '10px', textAlign: 'start', width: '48px' }}>أيقونة</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>التصنيف والمسار</th>
              <th style={{ padding: '10px', textAlign: 'start', width: '130px' }}>مستوى الشجرة</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '70px' }}>الترتيب</th>
              <th style={{ padding: '10px', textAlign: 'center', width: '140px' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {categoryTree.length > 0 ? (
              categoryTree.map((rootNode, idx) => renderTreeRow(rootNode, idx))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'لا توجد تصنيفات حالياً.' : 'No categories found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
