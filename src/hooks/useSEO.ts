import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
  keywords?: string;
  author?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
}

/**
 * Hook لتحديث meta tags ديناميكياً
 * يُستخدم لتغيير معلومات SEO حسب الصفحة أو الـ tenant
 */
export function useSEO({
  title,
  description,
  image,
  url,
  siteName,
  type = 'website',
  keywords,
  author,
  twitterCard = 'summary_large_image',
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper to update or create meta tag
    const updateMeta = (selector: string, content: string, attribute: string = 'content') => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (element) {
        element.setAttribute(attribute, content);
      } else {
        element = document.createElement('meta');
        const [attrName, attrValue] = selector.replace('meta[', '').replace(']', '').split('=');
        element.setAttribute(attrName, attrValue.replace(/"/g, ''));
        element.setAttribute(attribute, content);
        document.head.appendChild(element);
      }
    };

    // Primary Meta Tags
    if (title) {
      updateMeta('meta[name="title"]', title);
    }
    if (description) {
      updateMeta('meta[name="description"]', description);
    }
    if (keywords) {
      updateMeta('meta[name="keywords"]', keywords);
    }
    if (author) {
      updateMeta('meta[name="author"]', author);
    }
    if (noIndex) {
      updateMeta('meta[name="robots"]', 'noindex, nofollow');
    }

    // Open Graph Tags
    if (type) {
      updateMeta('meta[property="og:type"]', type);
    }
    if (url) {
      updateMeta('meta[property="og:url"]', url);
    }
    if (title) {
      updateMeta('meta[property="og:title"]', title);
    }
    if (description) {
      updateMeta('meta[property="og:description"]', description);
    }
    if (image) {
      updateMeta('meta[property="og:image"]', image);
    }
    if (siteName) {
      updateMeta('meta[property="og:site_name"]', siteName);
    }

    // Twitter Tags
    if (twitterCard) {
      updateMeta('meta[name="twitter:card"]', twitterCard);
    }
    if (url) {
      updateMeta('meta[name="twitter:url"]', url);
    }
    if (title) {
      updateMeta('meta[name="twitter:title"]', title);
    }
    if (description) {
      updateMeta('meta[name="twitter:description"]', description);
    }
    if (image) {
      updateMeta('meta[name="twitter:image"]', image);
    }

    // Update canonical URL
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (canonical) {
        canonical.href = url;
      } else {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = url;
        document.head.appendChild(canonical);
      }
    }

    // Cleanup: Reset to defaults when component unmounts
    return () => {
      // Optional: Reset to default values if needed
    };
  }, [title, description, image, url, siteName, type, keywords, author, twitterCard, noIndex]);
}

export default useSEO;
