import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Scale, ExternalLink, BookOpen, Loader2, FileText, Hash, ChevronLeft, ArrowRight, ChevronDown, Navigation } from 'lucide-react';
import '../styles/law-search-modal.css';

interface LawSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ArticleResult {
  id: number;
  name: string;
  link: string;
  description: string;
  number: string;
  text: string; // system name
}

interface SystemResult {
  name: string;
  link: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    results: ArticleResult[];
    systems?: SystemResult[];
    has_more: boolean;
  };
}

interface NezamSystem {
  id: string;
  text: string;
  link?: string;
}

interface NezamArticle {
  value: string;
  text: string;
  data_id: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.alraedlaw.com/api/v1';

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function highlightText(html: string, query: string): string {
  if (!query) return html;
  const stripped = stripHtml(html);
  const words = query.split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return stripped;
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return stripped.replace(pattern, '<mark class="law-search-highlight">$1</mark>');
}

const LawSearchModal: React.FC<LawSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [systems, setSystems] = useState<SystemResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [iframeLoading, setIframeLoading] = useState(false);
  // Fast navigation state
  const [allSystems, setAllSystems] = useState<NezamSystem[]>([]);
  const [systemArticles, setSystemArticles] = useState<NezamArticle[]>([]);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [selectedArticle, setSelectedArticle] = useState('');
  const [selectedArticleDataId, setSelectedArticleDataId] = useState('');
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [showFastNav, setShowFastNav] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (query: string, pageNum: number, append: boolean) => {
    if (!query.trim()) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!append) setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        page: String(pageNum),
      });

      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_BASE}/law-search?${params}`, {
        signal: controller.signal,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data: SearchResponse = await resp.json();

      if (!data.success) {
        setError('لم يتم العثور على نتائج');
        if (!append) {
          setResults([]);
          setSystems([]);
        }
        return;
      }

      if (append) {
        setResults(prev => [...prev, ...data.data.results]);
      } else {
        setResults(data.data.results);
        setSystems(data.data.systems || []);
      }

      setHasMore(data.data.has_more);
      setSearched(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('حدث خط�� في الاتصال. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    setPage(1);
    doSearch(q, 1, false);
  }, [searchQuery, doSearch]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(searchQuery, nextPage, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Live search with debounce
  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length >= 3) {
      searchTimerRef.current = setTimeout(() => {
        setPage(1);
        doSearch(value, 1, false);
      }, 600);
    }
  };

  const handleOpenExternal = () => {
    const q = searchQuery.trim();
    if (q) {
      window.open(`https://nezams.com/?s=${encodeURIComponent(q)}`, '_blank');
    } else {
      window.open('https://nezams.com', '_blank');
    }
  };

  // Fast navigation: load all systems
  const loadAllSystems = useCallback(async () => {
    if (allSystems.length > 0) return; // already loaded
    setLoadingSystems(true);
    try {
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_BASE}/law-systems`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) {
        setAllSystems(data.data);
      }
    } catch (err) {
      console.error('Failed to load systems', err);
    } finally {
      setLoadingSystems(false);
    }
  }, [allSystems.length]);

  // Fast navigation: load articles for selected system
  const loadSystemArticles = useCallback(async (systemId: string) => {
    if (!systemId) {
      setSystemArticles([]);
      setSelectedArticle('');
      setSelectedArticleDataId('');
      return;
    }
    setLoadingArticles(true);
    setSystemArticles([]);
    setSelectedArticle('');
    setSelectedArticleDataId('');
    try {
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${API_BASE}/law-system-articles?system_id=${encodeURIComponent(systemId)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      if (data.success && Array.isArray(data.data)) {
        setSystemArticles(data.data);
      }
    } catch (err) {
      console.error('Failed to load articles', err);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  const handleSystemChange = (systemId: string) => {
    setSelectedSystem(systemId);
    loadSystemArticles(systemId);
  };

  const handleArticleChange = (value: string) => {
    setSelectedArticle(value);
    const article = systemArticles.find(a => a.value === value);
    setSelectedArticleDataId(article?.data_id || '');
  };

  const handleFastNavGo = () => {
    if (!selectedSystem) return;
    // Find system link
    const system = allSystems.find(s => s.id === selectedSystem);
    if (!system?.link) return;

    if (selectedArticle) {
      // Open system page at specific article
      const url = `${system.link}#subject-${selectedArticle}`;
      handleOpenArticle(url, `${system.text} - المادة ${selectedArticle}`);
    } else {
      // Open system page
      handleOpenArticle(system.link, system.text);
    }
  };

  const handleToggleFastNav = () => {
    const next = !showFastNav;
    setShowFastNav(next);
    if (next) loadAllSystems();
  };

  const handleOpenArticle = (link: string, title: string) => {
    const proxyUrl = `${API_BASE}/law-page?url=${encodeURIComponent(link)}`;
    setViewUrl(proxyUrl);
    setViewTitle(title);
    setIframeLoading(true);
  };

  const handleBackToResults = () => {
    setViewUrl(null);
    setViewTitle('');
    setIframeLoading(false);
  };

  const handleClose = () => {
    setSearchQuery('');
    setResults([]);
    setSystems([]);
    setSearched(false);
    setError('');
    setPage(1);
    setHasMore(false);
    setViewUrl(null);
    setViewTitle('');
    setIframeLoading(false);
    setSelectedSystem('');
    setSelectedArticle('');
    setSelectedArticleDataId('');
    setSystemArticles([]);
    setShowFastNav(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const totalResults = results.length + systems.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="law-search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="law-search-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="law-search-modal__header">
              <div className="law-search-modal__title-group">
                {viewUrl ? (
                  <>
                    <button className="law-search-modal__back-btn" onClick={handleBackToResults}>
                      <ArrowRight size={16} />
                      النتائج
                    </button>
                    <span className="law-search-modal__view-title">{viewTitle}</span>
                  </>
                ) : (
                  <>
                    <div className="law-search-modal__icon">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h2 className="law-search-modal__title">باحث الأنظمة</h2>
                      <p className="law-search-modal__subtitle">البحث في الأنظمة السعودية وملحقاتها</p>
                    </div>
                  </>
                )}
              </div>
              <div className="law-search-modal__header-actions">
                {viewUrl && (
                  <button
                    className="law-search-modal__external-btn"
                    onClick={() => window.open(viewUrl, '_blank')}
                    title="فتح في تبويب جديد"
                  >
                    <ExternalLink size={15} />
                  </button>
                )}
                {!viewUrl && (
                  <button
                    className="law-search-modal__external-btn"
                    onClick={handleOpenExternal}
                    title="فتح في موقع نِظَامْ"
                  >
                    <ExternalLink size={15} />
                  </button>
                )}
                <button className="law-search-modal__close-btn" onClick={handleClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search Bar - hidden when viewing article */}
            {!viewUrl && (
              <div className="law-search-modal__search-bar">
                <div className="law-search-modal__input-wrapper">
                  <Search size={16} className="law-search-modal__search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="law-search-modal__input"
                    placeholder="ابحث عن نظام، مادة، أو كلمة مفتاحية..."
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      className="law-search-modal__clear-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setResults([]);
                        setSystems([]);
                        setSearched(false);
                        setError('');
                        searchInputRef.current?.focus();
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  className="law-search-modal__search-btn"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || loading}
                >
                  {loading ? <Loader2 size={15} className="law-search-modal__spinner" /> : <Search size={15} />}
                  بحث
                </button>
              </div>
            )}

            {/* Fast Navigation - الانتقال السريع */}
            {!viewUrl && (
              <div className="law-search-modal__fast-nav-section">
                <button
                  className="law-search-modal__fast-nav-toggle"
                  onClick={handleToggleFastNav}
                >
                  <Navigation size={14} />
                  <span>الانتقال السريع — اختر النظام والمادة</span>
                  <ChevronDown
                    size={14}
                    className={`law-search-modal__fast-nav-arrow ${showFastNav ? 'law-search-modal__fast-nav-arrow--open' : ''}`}
                  />
                </button>

                {showFastNav && (
                  <div className="law-search-modal__fast-nav-body">
                    <div className="law-search-modal__fast-nav-row">
                      <div className="law-search-modal__fast-nav-field">
                        <label className="law-search-modal__fast-nav-label">النظام</label>
                        <div className="law-search-modal__fast-nav-select-wrapper">
                          <select
                            className="law-search-modal__fast-nav-select"
                            value={selectedSystem}
                            onChange={(e) => handleSystemChange(e.target.value)}
                            disabled={loadingSystems}
                          >
                            <option value="">
                              {loadingSystems ? 'جاري التحميل...' : 'اختر النظام'}
                            </option>
                            {allSystems.map((sys) => (
                              <option key={sys.id} value={sys.id}>
                                {sys.text}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="law-search-modal__fast-nav-select-icon" />
                        </div>
                      </div>

                      <div className="law-search-modal__fast-nav-field">
                        <label className="law-search-modal__fast-nav-label">رقم المادة</label>
                        <div className="law-search-modal__fast-nav-select-wrapper">
                          <select
                            className="law-search-modal__fast-nav-select"
                            value={selectedArticle}
                            onChange={(e) => handleArticleChange(e.target.value)}
                            disabled={!selectedSystem || loadingArticles}
                          >
                            <option value="">
                              {loadingArticles ? 'جاري التحميل...' : 'اختر رقم المادة'}
                            </option>
                            {systemArticles.map((art, i) => (
                              <option key={`${art.value}-${i}`} value={art.value}>
                                {art.text}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="law-search-modal__fast-nav-select-icon" />
                        </div>
                      </div>

                      <button
                        className="law-search-modal__fast-nav-go"
                        onClick={handleFastNavGo}
                        disabled={!selectedSystem}
                      >
                        <Navigation size={14} />
                        انتقال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className="law-search-modal__content">
              {/* Article/System Viewer */}
              {viewUrl && (
                <div className="law-search-modal__viewer">
                  {iframeLoading && (
                    <div className="law-search-modal__loading-state">
                      <Loader2 size={28} className="law-search-modal__spinner" />
                      <span>جاري تحميل المادة...</span>
                    </div>
                  )}
                  <iframe
                    src={viewUrl}
                    className="law-search-modal__viewer-iframe"
                    title={viewTitle}
                    onLoad={() => setIframeLoading(false)}
                  />
                </div>
              )}

              {/* Empty state - before search */}
              {!viewUrl && !searched && !loading && (
                <div className="law-search-modal__empty-state">
                  <div className="law-search-modal__empty-icon">
                    <BookOpen size={40} />
                  </div>
                  <h3 className="law-search-modal__empty-title">ابحث في الأنظمة السعودية</h3>
                  <p className="law-search-modal__empty-text">
                    اكتب كلمة البحث للعثور على الأنظمة والمواد ذات الصلة
                  </p>
                  <div className="law-search-modal__suggestions">
                    {['نظام المحاماة', 'نظام العمل', 'نظام الشركات', 'نظام المرافعات', 'نظام التحكيم', 'نظام التنفيذ'].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="law-search-modal__suggestion-chip"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setPage(1);
                          doSearch(suggestion, 1, false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {!viewUrl && loading && !results.length && (
                <div className="law-search-modal__loading-state">
                  <Loader2 size={28} className="law-search-modal__spinner" />
                  <span>جاري البحث في الأنظمة...</span>
                </div>
              )}

              {/* Error */}
              {!viewUrl && error && (
                <div className="law-search-modal__error-state">
                  <span>{error}</span>
                </div>
              )}

              {/* Results */}
              {!viewUrl && searched && !loading && totalResults === 0 && !error && (
                <div className="law-search-modal__no-results">
                  <Search size={32} />
                  <h3>لا توجد نتائج</h3>
                  <p>لم يتم العثور على نتائج لـ "{searchQuery}"</p>
                </div>
              )}

              {!viewUrl && (results.length > 0 || systems.length > 0) && (
                <div className="law-search-modal__results-container">
                  {/* Systems section */}
                  {systems.length > 0 && (
                    <div className="law-search-modal__section">
                      <div className="law-search-modal__section-header">
                        <Scale size={14} />
                        <span>الأنظمة</span>
                        <span className="law-search-modal__section-count">{systems.length}</span>
                      </div>
                      <div className="law-search-modal__systems-grid">
                        {systems.map((sys, i) => (
                          <button
                            key={i}
                            className="law-search-modal__system-chip"
                            onClick={() => handleOpenArticle(sys.link, sys.name)}
                          >
                            <FileText size={14} />
                            <span>{sys.name}</span>
                            <ChevronLeft size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Articles section */}
                  {results.length > 0 && (
                    <div className="law-search-modal__section">
                      <div className="law-search-modal__section-header">
                        <Hash size={14} />
                        <span>المواد</span>
                        <span className="law-search-modal__section-count">{results.length}</span>
                      </div>
                      <div className="law-search-modal__articles-list">
                        {results.map((article, i) => (
                          <button
                            key={`${article.text}-${article.number}-${i}`}
                            className="law-search-modal__article-card"
                            onClick={() => handleOpenArticle(article.link, `${article.name} - ${article.text}`)}
                          >
                            <div className="law-search-modal__article-header">
                              <span className="law-search-modal__article-name">{article.name}</span>
                              <span className="law-search-modal__article-number">
                                <Hash size={11} />
                                {article.number}
                              </span>
                            </div>
                            <div className="law-search-modal__article-system">
                              <FileText size={12} />
                              {article.text}
                            </div>
                            <div
                              className="law-search-modal__article-excerpt"
                              dangerouslySetInnerHTML={{
                                __html: highlightText(article.description, searchQuery)
                              }}
                            />
                            <div className="law-search-modal__article-action">
                              <span>قراءة المادة كاملة</span>
                              <ChevronLeft size={12} />
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Load more */}
                      {hasMore && (
                        <button
                          className="law-search-modal__load-more"
                          onClick={handleLoadMore}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 size={14} className="law-search-modal__spinner" />
                              جاري التحميل...
                            </>
                          ) : (
                            'عرض المزيد من النتائج'
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="law-search-modal__footer">
              <div className="law-search-modal__footer-info">
                <Scale size={12} />
                <span>مصدر البيانات: <a href="https://nezams.com" target="_blank" rel="noopener noreferrer">nezams.com</a></span>
              </div>
              {searched && totalResults > 0 && (
                <span className="law-search-modal__footer-count">
                  {totalResults} نتيجة
                </span>
              )}
              {!searched && (
                <span className="law-search-modal__footer-hint">
                  اضغط Enter للبحث
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LawSearchModal;
