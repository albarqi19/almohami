import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

// Set worker path - use unpkg which always has the matching version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface SecurePdfViewerProps {
    url: string;
    fileName?: string;
}

const SecurePdfViewer: React.FC<SecurePdfViewerProps> = ({ url, fileName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.2);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load PDF
    useEffect(() => {
        const loadPdf = async () => {
            try {
                setLoading(true);
                setError(null);

                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;

                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
            } catch (err) {
                console.error('Error loading PDF:', err);
                setError('فشل تحميل ملف PDF');
            } finally {
                setLoading(false);
            }
        };

        loadPdf();
    }, [url]);

    // Render page
    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDoc || !canvasRef.current) return;

            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    // @ts-ignore - canvas is already set via canvasContext
                } as any).promise;
            } catch (err) {
                console.error('Error rendering page:', err);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px'
            }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    جاري تحميل PDF...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-error)',
                fontSize: '13px'
            }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--color-bg-secondary)'
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)',
                flexShrink: 0
            }}>
                {/* Page navigation */}
                <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage <= 1 ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronRight size={16} />
                </button>

                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', minWidth: '80px', textAlign: 'center' }}>
                    {currentPage} / {totalPages}
                </span>

                <button
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage >= totalPages ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronLeft size={16} />
                </button>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 8px' }} />

                {/* Zoom controls */}
                <button
                    onClick={zoomOut}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ZoomOut size={14} />
                </button>

                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '40px', textAlign: 'center' }}>
                    {Math.round(scale * 100)}%
                </span>

                <button
                    onClick={zoomIn}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        background: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ZoomIn size={14} />
                </button>
            </div>

            {/* Canvas container */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
                padding: '16px'
            }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        background: 'white'
                    }}
                />
            </div>
        </div>
    );
};

export default SecurePdfViewer;
