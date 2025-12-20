import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  FileText, 
  Calendar,
  User,
  Tag,
  ChevronDown,
  SortAsc,
  SortDesc,
  Clock,
  Eye
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  type: 'case' | 'task' | 'document' | 'activity';
  content: string;
  highlight: string;
  date: Date;
  author?: string;
  tags?: string[];
  relevanceScore: number;
}

interface SearchFilters {
  type: 'all' | 'case' | 'task' | 'document' | 'activity';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  author: string;
  tags: string[];
}

interface ContentSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}

const ContentSearch: React.FC<ContentSearchProps> = ({
  onResultSelect,
  placeholder = "البحث في المحتوى...",
  showFilters = true,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    author: '',
    tags: []
  });

  // Mock search data
  const mockData: SearchResult[] = [
    {
      id: '1',
      title: 'قضية العقار التجاري رقم 123',
      type: 'case',
      content: 'قضية تتعلق بنزاع عقاري تجاري في منطقة الرياض، القضية تشمل مطالبة مالية بقيمة 2 مليون ريال',
      highlight: 'قضية تتعلق بنزاع <mark>عقاري</mark> تجاري في منطقة الرياض',
      date: new Date('2025-01-15'),
      author: 'أحمد محامي',
      tags: ['عقاري', 'تجاري', 'نزاع'],
      relevanceScore: 95
    },
    {
      id: '2',
      title: 'مهمة مراجعة العقد',
      type: 'task',
      content: 'مراجعة شاملة للعقد التجاري وتحديد النقاط القانونية المهمة قبل التوقيع',
      highlight: 'مراجعة شاملة للعقد التجاري وتحديد النقاط القانونية المهمة',
      date: new Date('2025-01-10'),
      author: 'سارة محامية',
      tags: ['عقد', 'مراجعة', 'قانوني'],
      relevanceScore: 88
    },
    {
      id: '3',
      title: 'وثيقة اتفاقية الشراكة',
      type: 'document',
      content: 'اتفاقية شراكة تجارية بين شركتين للتعاون في مجال التجارة الإلكترونية',
      highlight: 'اتفاقية <mark>شراكة</mark> تجارية بين شركتين للتعاون في مجال التجارة الإلكترونية',
      date: new Date('2025-01-08'),
      author: 'محمد محامي',
      tags: ['شراكة', 'تجاري', 'اتفاقية'],
      relevanceScore: 82
    },
    {
      id: '4',
      title: 'نشاط: اجتماع مع العميل',
      type: 'activity',
      content: 'اجتماع مع العميل لمناقشة تفاصيل القضية والاستراتيجية القانونية المتبعة',
      highlight: 'اجتماع مع العميل لمناقشة تفاصيل القضية والاستراتيجية القانونية',
      date: new Date('2025-01-05'),
      author: 'خالد محامية',
      tags: ['اجتماع', 'عميل', 'استراتيجية'],
      relevanceScore: 75
    }
  ];

  const availableTags = ['عقاري', 'تجاري', 'نزاع', 'عقد', 'مراجعة', 'قانوني', 'شراكة', 'اتفاقية', 'اجتماع', 'عميل', 'استراتيجية'];
  const availableAuthors = ['أحمد محامي', 'سارة محامية', 'محمد محامي', 'خالد محامية'];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'case': return <FileText size={16} style={{ color: 'var(--color-primary)' }} />;
      case 'task': return <Clock size={16} style={{ color: 'var(--color-warning)' }} />;
      case 'document': return <FileText size={16} style={{ color: 'var(--color-success)' }} />;
      case 'activity': return <Calendar size={16} style={{ color: 'var(--color-info)' }} />;
      default: return <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'case': return 'قضية';
      case 'task': return 'مهمة';
      case 'document': return 'وثيقة';
      case 'activity': return 'نشاط';
      default: return type;
    }
  };

  const performSearch = (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filteredResults = mockData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(term.toLowerCase()) ||
                            item.content.toLowerCase().includes(term.toLowerCase()) ||
                            item.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()));
        
        const matchesType = filters.type === 'all' || item.type === filters.type;
        const matchesAuthor = !filters.author || item.author === filters.author;
        const matchesTags = filters.tags.length === 0 || 
                          filters.tags.some(tag => item.tags?.includes(tag));

        let matchesDate = true;
        if (filters.dateRange !== 'all') {
          const now = new Date();
          const itemDate = item.date;
          
          switch (filters.dateRange) {
            case 'today':
              matchesDate = itemDate.toDateString() === now.toDateString();
              break;
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              matchesDate = itemDate >= weekAgo;
              break;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              matchesDate = itemDate >= monthAgo;
              break;
            case 'year':
              const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              matchesDate = itemDate >= yearAgo;
              break;
          }
        }

        return matchesSearch && matchesType && matchesAuthor && matchesTags && matchesDate;
      });

      // Sort results
      const sortedResults = filteredResults.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'relevance':
            comparison = b.relevanceScore - a.relevanceScore;
            break;
          case 'date':
            comparison = b.date.getTime() - a.date.getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title, 'ar');
            break;
        }
        
        return sortOrder === 'asc' ? -comparison : comparison;
      });

      setResults(sortedResults);
      setShowResults(true);
      setIsSearching(false);
    }, 300);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters, sortBy, sortOrder]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      author: '',
      tags: []
    });
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: var(--color-warning)30; color: var(--color-warning); padding: 2px 4px; border-radius: 3px;">$1</mark>');
  };

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        width: '100%'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '12px 48px 12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 'var(--font-size-sm)',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          />
          
          <div style={{
            position: 'absolute',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isSearching && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--color-border)',
                  borderTop: '2px solid var(--color-primary)',
                  borderRadius: '50%'
                }}
              />
            )}
            
            <Search size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        {showFilters && (
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(31, 78, 121, 0.12)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Filter size={12} />
            فلترة متقدمة
            <ChevronDown 
              size={12} 
              style={{
                transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '50px',
              padding: '16px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Type Filter */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  نوع المحتوى
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="case">القضايا</option>
                  <option value="task">المهام</option>
                  <option value="document">الوثائق</option>
                  <option value="activity">الأنشطة</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  النطاق الزمني
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  <option value="all">جميع التواريخ</option>
                  <option value="today">اليوم</option>
                  <option value="week">آخر أسبوع</option>
                  <option value="month">آخر شهر</option>
                  <option value="year">آخر سنة</option>
                </select>
              </div>

              {/* Author Filter */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  المؤلف
                </label>
                <select
                  value={filters.author}
                  onChange={(e) => handleFilterChange('author', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-xs)'
                  }}
                >
                  <option value="">جميع المؤلفين</option>
                  {availableAuthors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <label style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text)',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  ترتيب النتائج
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text)',
                      fontSize: 'var(--font-size-xs)'
                    }}
                  >
                    <option value="relevance">الصلة</option>
                    <option value="date">التاريخ</option>
                    <option value="title">العنوان</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                    title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                  >
                    {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '8px',
                display: 'block'
              }}>
                العلامات
              </label>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '8px'
              }}>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => filters.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${filters.tags.includes(tag) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: filters.tags.includes(tag) ? 'rgba(31, 78, 121, 0.12)' : 'var(--color-background)',
                      color: filters.tags.includes(tag) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-xs)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {filters.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}>
                    العلامات المحددة:
                  </span>
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        backgroundColor: 'rgba(31, 78, 121, 0.2)',
                        color: 'var(--color-primary)',
                        borderRadius: '3px',
                        fontSize: 'var(--font-size-xs)'
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-error)20';
                  e.currentTarget.style.color = 'var(--color-error)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                مسح الفلاتر
              </button>
              
              <span style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                {results.length} نتيجة
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && searchTerm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              marginTop: showAdvancedFilters ? '200px' : '40px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '400px',
              overflow: 'auto'
            }}
          >
            {results.length > 0 ? (
              <div style={{ padding: '8px' }}>
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      onResultSelect?.(result);
                      setShowResults(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      borderBottom: index < results.length - 1 ? '1px solid var(--color-border)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        backgroundColor: 'var(--color-background)',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        {getTypeIcon(result.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: 'var(--color-primary-soft)',
                            color: 'var(--color-primary)',
                            fontWeight: 'var(--font-weight-medium)'
                          }}>
                            {getTypeLabel(result.type)}
                          </span>
                          <span style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {result.relevanceScore}% مطابقة
                          </span>
                        </div>

                        <h4 style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-medium)',
                          color: 'var(--color-text)',
                          margin: '0 0 4px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {result.title}
                        </h4>

                        <p
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)',
                            margin: '0 0 8px 0',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: highlightText(result.content, searchTerm)
                          }}
                        />

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Calendar size={12} />
                            {result.date.toLocaleDateString('ar-SA')}
                          </div>
                          {result.author && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <User size={12} />
                              {result.author}
                            </div>
                          )}
                          {result.tags && result.tags.length > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Tag size={12} />
                              {result.tags.slice(0, 2).join(', ')}
                              {result.tags.length > 2 && '...'}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResultSelect?.(result);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                        title="عرض"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)'
              }}>
                <Search size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  margin: 0
                }}>
                  لا توجد نتائج للبحث "{searchTerm}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContentSearch;
