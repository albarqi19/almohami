import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { Loader2, AlertCircle } from 'lucide-react';

interface SecureWordViewerProps {
    url: string;
    fileName?: string;
}

const SecureWordViewer: React.FC<SecureWordViewerProps> = ({ url, fileName }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadWord = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch the Word document
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch document');
                }

                const arrayBuffer = await response.arrayBuffer();

                // Convert to HTML using mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer });

                if (result.messages.length > 0) {
                    console.warn('Mammoth warnings:', result.messages);
                }

                setHtmlContent(result.value);
            } catch (err) {
                console.error('Error loading Word document:', err);
                setError('فشل تحميل مستند Word');
            } finally {
                setLoading(false);
            }
        };

        loadWord();
    }, [url]);

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
                    جاري تحميل مستند Word...
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
                gap: '12px',
                color: 'var(--color-error)'
            }}>
                <AlertCircle size={32} />
                <span style={{ fontSize: '13px' }}>{error}</span>
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
                padding: '8px 16px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span style={{
                    padding: '2px 8px',
                    background: '#2b579a',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600
                }}>
                    DOCX
                </span>
                <span>{fileName || 'مستند Word'}</span>
            </div>

            {/* Content */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '24px',
                background: 'white'
            }}>
                <div
                    className="word-content"
                    style={{
                        maxWidth: '800px',
                        margin: '0 auto',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#333'
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            </div>

            {/* Add some basic styling for Word content */}
            <style>{`
                .word-content h1 { font-size: 24px; margin: 16px 0; font-weight: bold; }
                .word-content h2 { font-size: 20px; margin: 14px 0; font-weight: bold; }
                .word-content h3 { font-size: 16px; margin: 12px 0; font-weight: bold; }
                .word-content p { margin: 8px 0; }
                .word-content ul, .word-content ol { margin: 8px 0; padding-right: 24px; }
                .word-content li { margin: 4px 0; }
                .word-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                .word-content td, .word-content th { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: right; 
                }
                .word-content th { background: #f5f5f5; font-weight: bold; }
                .word-content img { max-width: 100%; height: auto; }
                .word-content strong, .word-content b { font-weight: bold; }
                .word-content em, .word-content i { font-style: italic; }
            `}</style>
        </div>
    );
};

export default SecureWordViewer;
